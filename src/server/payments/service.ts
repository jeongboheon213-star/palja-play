// 결제 서비스 (서버 전용). 브라우저가 보낸 금액·상품·성공 여부를 믿지 않는다.
//
// 흐름
//  1) createOrder   : 상품 id 로 서버가 가격을 정하고 주문(CREATED) + 구매 코드 생성
//  2) (브라우저 → 토스 결제창 → successUrl/failUrl)
//  3) confirmPayment: 서버 금액과 대조 → CREATED→PAYMENT_REQUESTED(잠금) → 토스 승인(멱등키) → PAID
//     중복 호출·새로고침: 이미 PAID 면 같은 결과, 처리 중이면 토스 조회로 상태 맞춤(복구)
//  4) recordFailure : 결제창 취소/실패 → CANCELLED/FAILED (PAID 는 절대 덮어쓰지 않음)
//  5) findEntitlement: 구매 코드 + 같은 사주(chart_key) + PAID 일 때만 Premium 열람
//  6) refundOrder   : 관리자 전용. 토스 취소 API(멱등키) → REFUNDED

import { PRODUCTS, type ProductId } from "../../data/products";
import { PREMIUM_COPY } from "../../lib/interpretation/copy/premiumCopy";
import type { ApiResult, Order, PaymentDeps } from "./types";

export const PAID_PRODUCT_IDS = ["premium_money", "premium_love", "premium_career"] as const;
export type PaidProductId = (typeof PAID_PRODUCT_IDS)[number];

/** 상품이 다루는 Signal 영역 (상품 설정에서 가져온다) */
export function productDomains(productId: PaidProductId): readonly string[] {
  return PRODUCTS[productId as ProductId].domains;
}

/** 서버 가격표: 상품 설정(src/data/products.ts) 하나만 기준으로 한다 */
export function serverPrice(productId: string): { amount: number; orderName: string } | null {
  if (!(PAID_PRODUCT_IDS as readonly string[]).includes(productId)) return null;
  const p = PRODUCTS[productId as ProductId];
  return { amount: p.priceKrw, orderName: `사주팔자PLAY ${p.name}` };
}

const SIGNAL_ID_RE = /^[a-z]+(\.[a-z_]+)+$/;
const ORDER_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_KEY_RE = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * 어느 사주 결과에 대한 구매인지 나타내는 키. 생년월일이 아니라 "상품 영역의 Signal id 목록" 의 해시.
 * 알 수 없는 id 가 섞이거나 영역 밖이면 null (조작 방지).
 */
export function chartKeyFor(productId: PaidProductId, signalIds: unknown, sha256: (t: string) => string): { key: string; ids: string[] } | null {
  if (!Array.isArray(signalIds) || signalIds.length === 0 || signalIds.length > 40) return null;
  const domains = productDomains(productId);
  const ids = Array.from(new Set(signalIds as unknown[])).filter((x): x is string => typeof x === "string");
  if (ids.length !== new Set(signalIds as unknown[]).size) return null;
  for (const id of ids) {
    if (!SIGNAL_ID_RE.test(id) || !(id in PREMIUM_COPY) || !domains.includes(id.split(".")[0]!)) return null;
  }
  ids.sort();
  return { key: sha256(`${productId}|${ids.join(",")}`), ids };
}

/** 구매 코드 정규화: 대문자, 공백·하이픈 제거 */
export function normalizePurchaseCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const c = code.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{16}$/.test(c) ? c : null;
}

const fail = (status: number, code: string, message: string): ApiResult<never> => ({ ok: false, status, code, message });

// ── 1) 주문 생성 ────────────────────────────────────────────────

export async function createOrder(
  deps: PaymentDeps,
  input: { productId: unknown; resultId: unknown; signalIds: unknown; amount?: unknown },
): Promise<ApiResult<{ orderId: string; amount: number; orderName: string; purchaseCode: string }>> {
  const productId = typeof input.productId === "string" ? input.productId : "";
  const price = serverPrice(productId);
  if (!price) return fail(400, "INVALID_PRODUCT", "알 수 없는 상품이에요.");
  // input.amount(브라우저가 보낸 금액)는 일부러 쓰지 않는다.
  const chart = chartKeyFor(productId as PaidProductId, input.signalIds, deps.sha256);
  if (!chart) return fail(400, "INVALID_CHART", "결과 정보가 올바르지 않아요. 결과를 다시 만들어 주세요.");
  const resultId = typeof input.resultId === "string" && UUID_RE.test(input.resultId) ? input.resultId : null;
  const orderId = deps.newOrderId();
  const purchaseCode = deps.newPurchaseCode();
  const code = normalizePurchaseCode(purchaseCode);
  if (!ORDER_ID_RE.test(orderId) || !code) return fail(500, "INTERNAL", "주문 번호를 만들지 못했어요.");
  try {
    await deps.repo.insert({
      order_id: orderId,
      result_id: resultId,
      product_id: productId,
      amount: price.amount,
      currency: "KRW",
      status: "CREATED",
      chart_key: chart.key,
      purchase_code_hash: deps.sha256(code),
      toss_mode: deps.tossMode,
      source: deps.source,
    });
  } catch {
    return fail(503, "STORAGE_ERROR", "주문을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  return { ok: true, status: 201, body: { orderId, amount: price.amount, orderName: price.orderName, purchaseCode } };
}

// ── 3) 결제 승인 ────────────────────────────────────────────────

type ConfirmBody = { status: "PAID"; orderId: string; productId: string; amount: number };

async function markPaidWithRetry(deps: PaymentDeps, orderId: string, p: { paymentKey: string; method: string | null; approvedAt: string | null }): Promise<Order | null> {
  for (let i = 0; i < 3; i++) {
    try {
      return await deps.repo.transition(orderId, ["PAYMENT_REQUESTED", "CREATED"], { status: "PAID", payment_key: p.paymentKey, method: p.method, approved_at: p.approvedAt, failure_code: null, failure_message: null });
    } catch {
      // 저장 실패 → 재시도
    }
  }
  throw new Error("STORAGE_ERROR");
}

/** 토스에서 실제 상태를 조회해 주문 상태를 맞춘다 (중복 요청·저장 실패 후 재시도·새로고침 대비) */
async function reconcile(deps: PaymentDeps, order: Order, paymentKey: string): Promise<ApiResult<ConfirmBody>> {
  const r = await deps.toss.getByOrderId(order.order_id);
  if (!r.ok) return fail(409, "PAYMENT_PROCESSING", "결제를 확인하는 중이에요. 잠시 후 새로고침해 주세요.");
  const p = r.payment;
  if (p.status === "DONE" && p.totalAmount === order.amount && p.orderId === order.order_id && p.paymentKey === paymentKey) {
    try {
      await markPaidWithRetry(deps, order.order_id, p);
    } catch {
      return fail(503, "STORAGE_ERROR", "결제는 완료됐지만 기록을 저장하지 못했어요. 잠시 후 새로고침하면 다시 확인해요.");
    }
    return { ok: true, status: 200, body: { status: "PAID", orderId: order.order_id, productId: order.product_id, amount: order.amount } };
  }
  return fail(409, "PAYMENT_NOT_DONE", "결제가 완료되지 않았어요.");
}

export async function confirmPayment(deps: PaymentDeps, input: { paymentKey: unknown; orderId: unknown; amount: unknown }): Promise<ApiResult<ConfirmBody>> {
  const paymentKey = typeof input.paymentKey === "string" ? input.paymentKey : "";
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  if (!PAYMENT_KEY_RE.test(paymentKey) || !ORDER_ID_RE.test(orderId)) return fail(400, "INVALID_REQUEST", "결제 정보가 올바르지 않아요.");

  let order: Order | null;
  try {
    order = await deps.repo.get(orderId);
  } catch {
    return fail(503, "STORAGE_ERROR", "주문을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  if (!order) return fail(404, "ORDER_NOT_FOUND", "주문을 찾을 수 없어요.");
  if (order.toss_mode !== deps.tossMode) return fail(409, "MODE_MISMATCH", "결제 환경이 맞지 않아요.");

  // 이미 승인됨: 같은 결제면 같은 결과 (새로고침·중복 요청)
  if (order.status === "PAID") {
    return order.payment_key === paymentKey
      ? { ok: true, status: 200, body: { status: "PAID", orderId, productId: order.product_id, amount: order.amount } }
      : fail(409, "ALREADY_PAID_DIFFERENT_KEY", "이미 다른 결제로 처리된 주문이에요.");
  }
  if (order.status === "REFUNDED" || order.status === "REFUND_REQUESTED" || order.status === "CANCELLED" || order.status === "FAILED") {
    return fail(409, `ORDER_${order.status}`, "이미 종료된 주문이에요.");
  }

  // 금액 변조: 브라우저가 보낸 금액이 서버 주문 금액과 다르면 승인하지 않는다
  const amount = typeof input.amount === "number" ? input.amount : typeof input.amount === "string" && /^\d+$/.test(input.amount) ? Number(input.amount) : NaN;
  if (amount !== order.amount) {
    try {
      await deps.repo.transition(orderId, ["CREATED"], { status: "FAILED", failure_code: "AMOUNT_MISMATCH", failure_message: "요청 금액이 주문 금액과 다름" });
    } catch {}
    return fail(400, "AMOUNT_MISMATCH", "결제 금액이 주문 금액과 달라 승인하지 않았어요.");
  }

  // 잠금: CREATED → PAYMENT_REQUESTED. 이미 처리 중이면(동시 요청·이전 실패) 토스 조회로 맞춘다
  let locked: Order | null;
  try {
    locked = await deps.repo.transition(orderId, ["CREATED"], { status: "PAYMENT_REQUESTED", payment_key: paymentKey });
  } catch {
    return fail(503, "STORAGE_ERROR", "주문을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  if (!locked) return reconcile(deps, order, paymentKey);

  // 토스 승인 (멱등키 = 주문 번호 → 같은 주문의 승인 요청은 토스에서 한 번만 처리)
  const r = await deps.toss.confirm({ paymentKey, orderId, amount: order.amount, idempotencyKey: `confirm-${orderId}` });
  if (!r.ok) {
    if (r.code === "ALREADY_PROCESSED_PAYMENT" || r.code === "IDEMPOTENT_REQUEST_PROCESSING") return reconcile(deps, order, paymentKey);
    try {
      await deps.repo.transition(orderId, ["PAYMENT_REQUESTED"], { status: "FAILED", failure_code: r.code.slice(0, 80), failure_message: r.message.slice(0, 300) });
    } catch {}
    return fail(400, r.code, "결제를 승인하지 못했어요. 다시 시도해 주세요.");
  }
  const p = r.payment;
  if (p.status !== "DONE" || p.totalAmount !== order.amount || p.orderId !== orderId) {
    // 승인 응답이 주문과 다르면 PAID 로 만들지 않는다 (관리자 확인 필요)
    try {
      await deps.repo.transition(orderId, ["PAYMENT_REQUESTED"], { status: "FAILED", failure_code: "CONFIRM_MISMATCH", failure_message: `status=${p.status} amount=${p.totalAmount}` });
    } catch {}
    return fail(409, "CONFIRM_MISMATCH", "결제 확인 결과가 주문과 달라요. 고객센터로 문의해 주세요.");
  }
  try {
    await markPaidWithRetry(deps, orderId, p);
  } catch {
    // 토스 승인은 됐지만 저장 실패: 주문은 PAYMENT_REQUESTED 로 남고, 새로고침(재요청) 시 reconcile 로 PAID 처리
    return fail(503, "STORAGE_ERROR", "결제는 완료됐지만 기록을 저장하지 못했어요. 잠시 후 새로고침하면 다시 확인해요.");
  }
  return { ok: true, status: 200, body: { status: "PAID", orderId, productId: order.product_id, amount: order.amount } };
}

// ── 4) 결제창 실패/취소 ───────────────────────────────────────────

export async function recordFailure(deps: PaymentDeps, input: { orderId: unknown; code: unknown; message: unknown }): Promise<ApiResult<{ status: "CANCELLED" | "FAILED" | "UNCHANGED" }>> {
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  if (!ORDER_ID_RE.test(orderId)) return fail(400, "INVALID_REQUEST", "주문 정보가 올바르지 않아요.");
  const code = typeof input.code === "string" ? input.code.slice(0, 80) : "UNKNOWN";
  const message = typeof input.message === "string" ? input.message.slice(0, 300) : "";
  const status = code === "PAY_PROCESS_CANCELED" ? "CANCELLED" : "FAILED";
  try {
    // CREATED 일 때만 바꾼다 (PAID 등은 절대 덮어쓰지 않음)
    const changed = await deps.repo.transition(orderId, ["CREATED"], { status, failure_code: code, failure_message: message });
    return { ok: true, status: 200, body: { status: changed ? status : "UNCHANGED" } };
  } catch {
    return fail(503, "STORAGE_ERROR", "상태를 저장하지 못했어요.");
  }
}

// ── 5) Premium 열람 권한 ─────────────────────────────────────────

export async function findEntitlement(
  deps: Pick<PaymentDeps, "repo" | "sha256" | "tossMode">,
  input: { purchaseCode: unknown; productId: unknown; signalIds: unknown },
): Promise<ApiResult<{ orderId: string; productId: PaidProductId; signalIds: string[] }>> {
  const code = normalizePurchaseCode(input.purchaseCode);
  const productId = typeof input.productId === "string" ? input.productId : "";
  if (!code) return fail(400, "INVALID_CODE", "구매 코드 형식이 올바르지 않아요.");
  if (!serverPrice(productId)) return fail(400, "INVALID_PRODUCT", "알 수 없는 상품이에요.");
  const chart = chartKeyFor(productId as PaidProductId, input.signalIds, deps.sha256);
  if (!chart) return fail(400, "INVALID_CHART", "결과 정보가 올바르지 않아요.");
  let order: Order | null;
  try {
    order = await deps.repo.findByPurchaseCodeHash(deps.sha256(code));
  } catch {
    return fail(503, "STORAGE_ERROR", "구매 정보를 확인하지 못했어요.");
  }
  // 어떤 이유로 실패했는지 자세히 알려 주지 않는다 (코드 추측 방지)
  if (!order || order.status !== "PAID" || order.product_id !== productId || order.chart_key !== chart.key || order.toss_mode !== deps.tossMode) {
    return fail(404, "ENTITLEMENT_NOT_FOUND", "이 결과에 대한 구매를 찾지 못했어요. 구매 코드와 생년월일 입력을 확인해 주세요.");
  }
  return { ok: true, status: 200, body: { orderId: order.order_id, productId: productId as PaidProductId, signalIds: chart.ids } };
}

// ── 6) 환불 (관리자 전용) ────────────────────────────────────────

export async function refundOrder(deps: PaymentDeps, input: { orderId: string; reason: string }): Promise<ApiResult<{ status: "REFUNDED" }>> {
  try {
  const order = await deps.repo.get(input.orderId);
  if (!order) return fail(404, "ORDER_NOT_FOUND", "주문 없음");
  if (order.status === "REFUNDED") return { ok: true, status: 200, body: { status: "REFUNDED" } };
  if (!["PAID", "REFUND_REQUESTED"].includes(order.status) || !order.payment_key) return fail(409, "NOT_REFUNDABLE", `환불할 수 없는 상태: ${order.status}`);
  if (order.toss_mode !== deps.tossMode) return fail(409, "MODE_MISMATCH", "결제 환경이 맞지 않아요.");
  // Lock access before contacting Toss; unknown/failed responses stay locked for safe retry.
  if (order.status === "PAID") {
    const locked = await deps.repo.transition(order.order_id, ["PAID"], { status: "REFUND_REQUESTED" });
    if (!locked) return fail(409, "REFUND_PROCESSING", "취소 상태를 다시 확인해 주세요.");
  }
  const r = await deps.toss.cancel({ paymentKey: order.payment_key, reason: input.reason.slice(0, 200), idempotencyKey: `refund-${order.order_id}` });
  if (!r.ok && r.code !== "ALREADY_CANCELED_PAYMENT") return fail(503, "REFUND_PROCESSING", "취소 결과를 확인하는 중이에요. 다시 확인하거나 고객 문의로 알려 주세요.");
  const confirmed = r.ok ? r : await deps.toss.getByOrderId(order.order_id);
  if (!confirmed.ok || confirmed.payment.status !== "CANCELED" || confirmed.payment.orderId !== order.order_id || confirmed.payment.paymentKey !== order.payment_key || confirmed.payment.totalAmount !== order.amount) {
    return fail(503, "REFUND_PROCESSING", "취소 결과를 확인하는 중이에요. 고객 문의로 알려 주세요.");
  }
  const saved = await deps.repo.transition(order.order_id, ["REFUND_REQUESTED"], { status: "REFUNDED", refund_reason: input.reason.slice(0, 200) });
  if (!saved && (await deps.repo.get(order.order_id))?.status !== "REFUNDED") return fail(503, "STORAGE_ERROR", "취소 기록을 다시 확인해야 해요.");
  return { ok: true, status: 200, body: { status: "REFUNDED" } };
  } catch {
    return fail(503, "STORAGE_ERROR", "취소 상태를 확인하지 못했어요. 다시 시도해 주세요.");
  }
}

/** Customer cancellation only for unprovided content; administrator exceptions use refundOrder. */
export async function refundUnopenedOrder(deps: PaymentDeps, input: { purchaseCode: unknown; productId: unknown; signalIds: unknown }): Promise<ApiResult<{ status: "REFUNDED" }>> {
  const code = normalizePurchaseCode(input.purchaseCode);
  const productId = typeof input.productId === "string" ? input.productId : "";
  const chart = serverPrice(productId) ? chartKeyFor(productId as PaidProductId, input.signalIds, deps.sha256) : null;
  if (!code || !chart) return fail(404, "NOT_REFUNDABLE", "취소할 구매 정보를 확인해 주세요.");
  try {
    const hash = deps.sha256(code);
    const order = await deps.repo.findByPurchaseCodeHash(hash);
    if (!order || order.product_id !== productId || order.chart_key !== chart.key || order.toss_mode !== deps.tossMode) return fail(404, "NOT_REFUNDABLE", "취소할 구매 정보를 확인해 주세요.");
    if (order.status === "REFUNDED") return { ok: true, status: 200, body: { status: "REFUNDED" } };
    const locked = await deps.repo.claimUnopenedRefund(order.order_id, hash, chart.key, productId, deps.tossMode);
    if (!locked) return fail(409, "SUPPORT_REQUIRED", "리포트가 제공되었거나 취소할 수 없는 상태예요. 결제 오류·중복 결제·서비스 문제 등은 고객 문의로 확인해 주세요.");
    return refundOrder(deps, { orderId: order.order_id, reason: "미열람 구매 취소" });
  } catch { return fail(503, "STORAGE_ERROR", "취소 상태를 확인하지 못했어요."); }
}
