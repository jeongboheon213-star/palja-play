// 결제 서버 로직 테스트 (가짜 토스·가짜 저장소). 실제 돈·실제 키 없이 모든 분기를 검사한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { chartKeyFor, confirmPayment, createOrder, findEntitlement, normalizePurchaseCode, recordFailure, refundOrder, serverPrice } from "../src/server/payments/service";
import { buildPremiumReport, NEGATIVE_SIGNAL_IDS } from "../src/server/premium/report";
import { DETAIL_COPY } from "../src/server/premium/detailCopy";
import { paymentsConfig, newPurchaseCode } from "../api-lib/env";
import type { NewOrder, Order, OrderPatch, OrderRepo, OrderStatus, PaymentDeps, TossClient, TossResult } from "../src/server/payments/types";
import { computeBetaResult } from "../src/lib/engine";
import { deriveSignals, PREMIUM_COPY } from "../src/lib/interpretation";

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

class FakeRepo implements OrderRepo {
  rows = new Map<string, Order>();
  failNext: "insert" | "get" | "transition" | "paid" | null = null;
  async insert(o: NewOrder) {
    if (this.failNext === "insert") { this.failNext = null; throw new Error("down"); }
    this.rows.set(o.order_id, { ...o, payment_key: null, method: null, failure_code: null, failure_message: null, approved_at: null });
  }
  async get(id: string) {
    if (this.failNext === "get") { this.failNext = null; throw new Error("down"); }
    return this.rows.get(id) ?? null;
  }
  async findByPurchaseCodeHash(h: string) {
    return [...this.rows.values()].find((r) => r.purchase_code_hash === h) ?? null;
  }
  async transition(id: string, from: readonly OrderStatus[], patch: OrderPatch) {
    if (this.failNext === "transition" || (this.failNext === "paid" && patch.status === "PAID")) {
      if (this.failNext === "transition") this.failNext = null;
      throw new Error("down");
    }
    const r = this.rows.get(id);
    if (!r || !from.includes(r.status)) return null;
    const { refund_reason: _ignored, ...rest } = patch;
    const next = { ...r, ...rest } as Order;
    this.rows.set(id, next);
    return next;
  }
}

/** 토스 흉내: 멱등키가 같으면 첫 응답을 그대로 돌려준다 (공식 문서 동작) */
class FakeToss implements TossClient {
  calls: string[] = [];
  idem = new Map<string, TossResult>();
  payments = new Map<string, { paymentKey: string; orderId: string; amount: number; status: string }>();
  /** 결제창에서 실제로 결제된 건 (paymentKey → 주문/금액) */
  authorize(paymentKey: string, orderId: string, amount: number) {
    this.payments.set(paymentKey, { paymentKey, orderId, amount, status: "READY" });
  }
  async confirm({ paymentKey, orderId, amount, idempotencyKey }: { paymentKey: string; orderId: string; amount: number; idempotencyKey: string }): Promise<TossResult> {
    this.calls.push(`confirm:${orderId}`);
    const cached = this.idem.get(idempotencyKey);
    if (cached) return cached;
    const p = this.payments.get(paymentKey);
    let r: TossResult;
    if (!p) r = { ok: false, httpStatus: 400, code: "INVALID_PAYMENT_KEY", message: "Invalid payment key" };
    else if (p.orderId !== orderId || p.amount !== amount) r = { ok: false, httpStatus: 400, code: "INVALID_REQUEST", message: "mismatch" };
    else if (p.status === "DONE") r = { ok: false, httpStatus: 400, code: "ALREADY_PROCESSED_PAYMENT", message: "already" };
    else {
      p.status = "DONE";
      r = { ok: true, payment: { paymentKey, orderId, status: "DONE", totalAmount: amount, method: "카드", approvedAt: "2026-10-05T10:00:00+09:00" } };
    }
    this.idem.set(idempotencyKey, r);
    return r;
  }
  async getByOrderId(orderId: string): Promise<TossResult> {
    const p = [...this.payments.values()].find((x) => x.orderId === orderId);
    if (!p) return { ok: false, httpStatus: 404, code: "NOT_FOUND_PAYMENT", message: "" };
    return { ok: true, payment: { paymentKey: p.paymentKey, orderId, status: p.status, totalAmount: p.amount, method: "카드", approvedAt: null } };
  }
  async cancel({ paymentKey, idempotencyKey }: { paymentKey: string; reason: string; idempotencyKey: string }): Promise<TossResult> {
    this.calls.push(`cancel:${paymentKey}`);
    const cached = this.idem.get(idempotencyKey);
    if (cached) return cached;
    const p = this.payments.get(paymentKey)!;
    p.status = "CANCELED";
    const r: TossResult = { ok: true, payment: { paymentKey, orderId: p.orderId, status: "CANCELED", totalAmount: p.amount, method: "카드", approvedAt: null } };
    this.idem.set(idempotencyKey, r);
    return r;
  }
}

let seq = 0;
function setup() {
  const repo = new FakeRepo();
  const toss = new FakeToss();
  const deps: PaymentDeps = {
    repo,
    toss,
    sha256,
    newOrderId: () => `sp-test-order-${++seq}`,
    newPurchaseCode: () => `ABCD-EFGH-JKLM-${String(1000 + seq).slice(-4).replace(/[01]/g, "Z")}`,
    tossMode: "test",
    source: "development",
  };
  return { repo, toss, deps };
}

function moneySignals(): string[] {
  const r = computeBetaResult({ birthDate: "1990-05-15", birthTime: "14:20", gender: "female", calendar: "solar", birthCountry: "KR" });
  assert.ok(r.ok);
  if (!r.ok) throw new Error("x");
  return deriveSignals(r.saju)!.signals.filter((s) => s.domain === "wealth").map((s) => s.id);
}
const RESULT_ID = "123e4567-e89b-42d3-a456-426614174000";

async function order(s: ReturnType<typeof setup>, productId = "premium_money", extra: Record<string, unknown> = {}) {
  const r = await createOrder(s.deps, { productId, resultId: RESULT_ID, signalIds: moneySignals(), ...extra });
  assert.ok(r.ok, r.ok ? "" : r.code);
  if (!r.ok) throw new Error("x");
  return r.body;
}

// ── 주문 생성 / 변조 ─────────────────────────────────────────

test("가격: 서버 상품 설정 2,900원, 브라우저가 보낸 금액(100원)은 무시", async () => {
  assert.equal(serverPrice("premium_money")!.amount, 2900);
  assert.equal(serverPrice("premium_love")!.amount, 2900);
  assert.equal(serverPrice("premium_career")!.amount, 2900);
  const s = setup();
  const o = await order(s, "premium_money", { amount: 100 });
  assert.equal(o.amount, 2900);
  assert.equal(s.repo.rows.get(o.orderId)!.amount, 2900);
  assert.equal(s.repo.rows.get(o.orderId)!.status, "CREATED");
});

test("productId 변조: 없는 상품·무료 상품은 주문 거부", async () => {
  const s = setup();
  for (const productId of ["premium_all", "free_result", "", 1, null]) {
    const r = await createOrder(s.deps, { productId, resultId: RESULT_ID, signalIds: moneySignals() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "INVALID_PRODUCT");
  }
  assert.equal(s.repo.rows.size, 0);
});

test("결과 정보 변조: 영역 밖·알 수 없는 Signal id 는 거부", async () => {
  const s = setup();
  for (const signalIds of [[], ["love.star.present"], ["wealth.hack"], "x", [1], new Array(41).fill("wealth.jeongjae")]) {
    const r = await createOrder(s.deps, { productId: "premium_money", resultId: RESULT_ID, signalIds });
    assert.equal(r.ok, false, JSON.stringify(signalIds));
  }
});

test("구매 코드는 원문 대신 해시만 저장", async () => {
  const s = setup();
  const o = await order(s);
  const row = s.repo.rows.get(o.orderId)!;
  assert.ok(!JSON.stringify(row).includes(o.purchaseCode.replace(/-/g, "")));
  assert.equal(row.purchase_code_hash, sha256(normalizePurchaseCode(o.purchaseCode)!));
});

test("주문 저장 실패 → 503, 결제 진행 안 함", async () => {
  const s = setup();
  s.repo.failNext = "insert";
  const r = await createOrder(s.deps, { productId: "premium_money", resultId: RESULT_ID, signalIds: moneySignals() });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "STORAGE_ERROR");
});

// ── 승인 ─────────────────────────────────────────────────────

test("정상 결제: 승인 → PAID, 토스 승인은 멱등키로 1회", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_ok_1", o.orderId, 2900);
  const r = await confirmPayment(s.deps, { paymentKey: "pk_ok_1", orderId: o.orderId, amount: "2900" });
  assert.ok(r.ok);
  const row = s.repo.rows.get(o.orderId)!;
  assert.equal(row.status, "PAID");
  assert.equal(row.payment_key, "pk_ok_1");
  assert.equal(row.method, "카드");
});

test("금액 변조(success URL 의 amount=100): 토스 승인 호출 없이 거부, 주문 FAILED", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_tamper", o.orderId, 100);
  const r = await confirmPayment(s.deps, { paymentKey: "pk_tamper", orderId: o.orderId, amount: 100 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "AMOUNT_MISMATCH");
  assert.deepEqual(s.toss.calls, []);
  assert.equal(s.repo.rows.get(o.orderId)!.status, "FAILED");
});

test("confirm 중복 요청 / 새로고침: 두 번째부터는 같은 결과, 토스 승인 추가 호출 없음", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_dup", o.orderId, 2900);
  const a = await confirmPayment(s.deps, { paymentKey: "pk_dup", orderId: o.orderId, amount: 2900 });
  const b = await confirmPayment(s.deps, { paymentKey: "pk_dup", orderId: o.orderId, amount: 2900 });
  const c = await confirmPayment(s.deps, { paymentKey: "pk_dup", orderId: o.orderId, amount: 2900 });
  assert.ok(a.ok && b.ok && c.ok);
  assert.equal(s.toss.calls.filter((x) => x.startsWith("confirm")).length, 1);
});

test("동시 요청(둘 다 잠금 전): 하나만 승인 호출, 나머지는 토스 조회로 같은 결과", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_race", o.orderId, 2900);
  const [a, b] = await Promise.all([
    confirmPayment(s.deps, { paymentKey: "pk_race", orderId: o.orderId, amount: 2900 }),
    confirmPayment(s.deps, { paymentKey: "pk_race", orderId: o.orderId, amount: 2900 }),
  ]);
  assert.ok(a.ok || b.ok);
  assert.equal(s.toss.calls.filter((x) => x.startsWith("confirm")).length, 1);
  assert.equal(s.repo.rows.get(o.orderId)!.status, "PAID");
});

test("success URL 직접 접근(paymentKey 없음·가짜 주문) → 거부", async () => {
  const s = setup();
  const noKey = await confirmPayment(s.deps, { paymentKey: undefined, orderId: "sp-whatever-1", amount: 2900 });
  assert.equal(noKey.ok, false);
  const ghost = await confirmPayment(s.deps, { paymentKey: "pk_x", orderId: "sp-not-exist", amount: 2900 });
  assert.equal(ghost.ok, false);
  if (!ghost.ok) assert.equal(ghost.code, "ORDER_NOT_FOUND");
});

test("잘못된 paymentKey → 토스 거절 → 주문 FAILED, Premium 열리지 않음", async () => {
  const s = setup();
  const o = await order(s);
  const r = await confirmPayment(s.deps, { paymentKey: "pk_wrong", orderId: o.orderId, amount: 2900 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "INVALID_PAYMENT_KEY");
  assert.equal(s.repo.rows.get(o.orderId)!.status, "FAILED");
  const e = await findEntitlement(s.deps, { purchaseCode: o.purchaseCode, productId: "premium_money", signalIds: moneySignals() });
  assert.equal(e.ok, false);
});

test("Supabase 저장 실패(토스 승인 후): 503 안내 → 새로고침(재요청) 시 토스 조회로 PAID 복구, 이중 승인 없음", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_store", o.orderId, 2900);
  s.repo.failNext = "paid";
  const first = await confirmPayment(s.deps, { paymentKey: "pk_store", orderId: o.orderId, amount: 2900 });
  assert.equal(first.ok, false);
  if (!first.ok) assert.equal(first.code, "STORAGE_ERROR");
  assert.equal(s.repo.rows.get(o.orderId)!.status, "PAYMENT_REQUESTED");
  s.repo.failNext = null;
  const retry = await confirmPayment(s.deps, { paymentKey: "pk_store", orderId: o.orderId, amount: 2900 });
  assert.ok(retry.ok);
  assert.equal(s.repo.rows.get(o.orderId)!.status, "PAID");
  assert.equal(s.toss.calls.filter((x) => x.startsWith("confirm")).length, 1);
});

test("다른 결제 키로 이미 PAID 인 주문 재승인 시도 → 거부", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_a", o.orderId, 2900);
  await confirmPayment(s.deps, { paymentKey: "pk_a", orderId: o.orderId, amount: 2900 });
  const r = await confirmPayment(s.deps, { paymentKey: "pk_b", orderId: o.orderId, amount: 2900 });
  assert.equal(r.ok, false);
});

// ── 실패 / 취소 ───────────────────────────────────────────────

test("사용자 취소(PAY_PROCESS_CANCELED) → CANCELLED, 결제 실패(REJECT_CARD_PAYMENT) → FAILED", async () => {
  const s = setup();
  const a = await order(s);
  const b = await order(s);
  await recordFailure(s.deps, { orderId: a.orderId, code: "PAY_PROCESS_CANCELED", message: "취소" });
  await recordFailure(s.deps, { orderId: b.orderId, code: "REJECT_CARD_PAYMENT", message: "한도" });
  assert.equal(s.repo.rows.get(a.orderId)!.status, "CANCELLED");
  assert.equal(s.repo.rows.get(b.orderId)!.status, "FAILED");
  // 취소된 주문은 이후 승인 불가
  s.toss.authorize("pk_late", a.orderId, 2900);
  const late = await confirmPayment(s.deps, { paymentKey: "pk_late", orderId: a.orderId, amount: 2900 });
  assert.equal(late.ok, false);
});

test("failUrl 위조로 PAID 주문을 취소 상태로 덮어쓸 수 없다", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_keep", o.orderId, 2900);
  await confirmPayment(s.deps, { paymentKey: "pk_keep", orderId: o.orderId, amount: 2900 });
  const r = await recordFailure(s.deps, { orderId: o.orderId, code: "PAY_PROCESS_CANCELED", message: "" });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.body.status, "UNCHANGED");
  assert.equal(s.repo.rows.get(o.orderId)!.status, "PAID");
});

// ── Premium 권한 / 구매 복구 ────────────────────────────────

test("Premium 권한: PAID + 같은 구매 코드 + 같은 사주일 때만. 다른 기기(같은 사주 재입력 + 코드)로 복구 가능", async () => {
  const s = setup();
  const o = await order(s);
  const before = await findEntitlement(s.deps, { purchaseCode: o.purchaseCode, productId: "premium_money", signalIds: moneySignals() });
  assert.equal(before.ok, false, "결제 전에는 열리지 않음");
  s.toss.authorize("pk_ent", o.orderId, 2900);
  await confirmPayment(s.deps, { paymentKey: "pk_ent", orderId: o.orderId, amount: 2900 });
  // 다른 기기: 생년월일을 다시 넣어 같은 Signal 을 만들고, 코드는 소문자·공백으로 입력해도 됨
  const restore = await findEntitlement(s.deps, { purchaseCode: o.purchaseCode.toLowerCase().replace(/-/g, " "), productId: "premium_money", signalIds: [...moneySignals()].reverse() });
  assert.ok(restore.ok);
  // 다른 사주(친구 결과)에는 같은 코드가 통하지 않음
  const other = await findEntitlement(s.deps, { purchaseCode: o.purchaseCode, productId: "premium_money", signalIds: ["wealth.jae.strong"] });
  assert.equal(other.ok, false);
  // 다른 상품에는 통하지 않음
  const otherProduct = await findEntitlement(s.deps, { purchaseCode: o.purchaseCode, productId: "premium_love", signalIds: ["love.star.present"] });
  assert.equal(otherProduct.ok, false);
});

test("Premium 권한: 틀린 코드·형식 오류는 같은 실패 문구 (추측 방지)", async () => {
  const s = setup();
  const r1 = await findEntitlement(s.deps, { purchaseCode: "AAAA-BBBB-CCCC-DDDD", productId: "premium_money", signalIds: moneySignals() });
  assert.equal(r1.ok, false);
  if (!r1.ok) assert.equal(r1.code, "ENTITLEMENT_NOT_FOUND");
  const r2 = await findEntitlement(s.deps, { purchaseCode: "short", productId: "premium_money", signalIds: moneySignals() });
  assert.equal(r2.ok, false);
});

// ── 환불 ─────────────────────────────────────────────────────

test("환불(관리자): PAID → 토스 취소(멱등키) → REFUNDED, 두 번 실행해도 한 번만 취소, 환불 후 Premium 잠김", async () => {
  const s = setup();
  const o = await order(s);
  s.toss.authorize("pk_ref", o.orderId, 2900);
  await confirmPayment(s.deps, { paymentKey: "pk_ref", orderId: o.orderId, amount: 2900 });
  const a = await refundOrder(s.deps, { orderId: o.orderId, reason: "고객 요청" });
  const b = await refundOrder(s.deps, { orderId: o.orderId, reason: "고객 요청" });
  assert.ok(a.ok && b.ok);
  assert.equal(s.repo.rows.get(o.orderId)!.status, "REFUNDED");
  assert.equal(s.toss.calls.filter((x) => x.startsWith("cancel")).length, 1);
  const e = await findEntitlement(s.deps, { purchaseCode: o.purchaseCode, productId: "premium_money", signalIds: moneySignals() });
  assert.equal(e.ok, false);
  const notPaid = await order(s);
  const c = await refundOrder(s.deps, { orderId: notPaid.orderId, reason: "x" });
  assert.equal(c.ok, false);
});

// ── 리포트 내용 ───────────────────────────────────────────────

test("Premium 리포트: WHY(기본+심화)·HOW(3개씩)·체크리스트, WHEN 미포함, 같은 입력 같은 결과", () => {
  const ids = moneySignals();
  const rep = buildPremiumReport("premium_money", ids);
  assert.equal(rep.title, "재물 심층 리포트");
  assert.ok(rep.why.length >= 1 && rep.why.every((w) => w.text && w.detail && w.detail !== w.text));
  assert.ok(rep.how.every((h) => h.steps.length === 3));
  assert.ok(rep.checklist.length >= 3 && rep.checklist.length <= 5);
  assert.ok(rep.notIncluded.some((t) => t.includes("시기")));
  assert.ok(!/\d{4}년|대운 \d|세운 \d|\d+세에/.test(JSON.stringify(rep)), "가짜 시기 없음");
  assert.deepEqual(buildPremiumReport("premium_money", [...ids].reverse()), rep);
});

test("Premium 문구: 모든 유료 영역 Signal 에 심화 문구, FREE 미리보기와 다른 내용, 금지 표현 없음", () => {
  const paid = Object.keys(PREMIUM_COPY);
  for (const id of paid) assert.ok(DETAIL_COPY[id], `심화 문구 없음: ${id}`);
  for (const [id, d] of Object.entries(DETAIL_COPY)) {
    assert.notEqual(d.whyDetail, PREMIUM_COPY[id]?.why, id);
    assert.ok(!d.howSteps.includes(PREMIUM_COPY[id]?.how ?? "∅"), id);
    for (const t of [d.whyDetail, ...d.howSteps, d.label]) for (const re of [/반드시/, /무조건/, /100%/, /확실히/, /투자하세요/, /사세요/, /검증된/]) assert.ok(!re.test(t), `${id}: ${re}`);
  }
});

test("주의 방향 Signal 목록이 Signal 규칙의 polarity 와 일치", () => {
  const seen = new Map<string, string>();
  for (const d of ["1990-05-15", "1977-07-07", "2001-01-01", "1965-03-03", "1988-08-08", "1999-12-12", "1972-10-10"]) {
    for (const g of ["male", "female"] as const) {
      const r = computeBetaResult({ birthDate: d, birthTime: "10:00", gender: g, calendar: "solar", birthCountry: "KR" });
      if (r.ok) for (const s of deriveSignals(r.saju)!.signals) seen.set(s.id, s.polarity);
    }
  }
  for (const [id, pol] of seen) if (id in DETAIL_COPY) assert.equal(NEGATIVE_SIGNAL_IDS.has(id), pol === "negative", id);
});

// ── 설정 / 비밀 키 ────────────────────────────────────────────

test("결제 설정: 기본 off, TEST 는 test_sk 만, LIVE 는 별도 승인 플래그 없으면 잠김", () => {
  // 2026-10-05 사용자 요청: 서버는 새 Secret Key(SUPABASE_SECRET_KEY, sb_secret_…) 사용
  const base = { SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_dummy" };
  assert.equal(paymentsConfig({}).ok, false);
  assert.equal(paymentsConfig({ ...base, PALJA_PAYMENTS_MODE: "test", TOSS_SECRET_KEY: "live_sk_x" }).ok, false, "TEST 모드에 LIVE 키 거부");
  assert.ok(paymentsConfig({ ...base, PALJA_PAYMENTS_MODE: "test", TOSS_SECRET_KEY: "test_sk_x" }).ok);
  const live = paymentsConfig({ ...base, PALJA_PAYMENTS_MODE: "live", TOSS_SECRET_KEY: "live_sk_x" });
  assert.equal(live.ok, false);
  if (!live.ok) assert.equal(live.code, "LIVE_PAYMENTS_LOCKED");
  assert.equal(paymentsConfig({ ...base, PALJA_PAYMENTS_MODE: "test", TOSS_SECRET_KEY: "test_sk_x", SUPABASE_URL: "http://evil" }).ok, false);
});

test("구매 코드: 16자(헷갈리는 0·O·1·I 없음), 매번 다름", () => {
  const a = newPurchaseCode();
  const b = newPurchaseCode();
  assert.match(a, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
  assert.notEqual(a, b);
  assert.equal(normalizePurchaseCode(a.toLowerCase()), a.replace(/-/g, ""));
});

test("비밀 키·서버 코드는 브라우저 코드(web/src)에서 import 되지 않는다", () => {
  const dir = `${process.cwd()}/web/src`;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    const t = readFileSync(`${dir}/${f}`, "utf8");
    assert.ok(!/src\/server|api-lib|TOSS_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|detailCopy/.test(t), f);
  }
  const build = readFileSync(`${process.cwd()}/scripts/build.mjs`, "utf8");
  assert.ok(!/TOSS_SECRET_KEY|SERVICE_ROLE_KEY"/.test(build.replace(/\/\/.*$/gm, "")), "빌드가 서버 비밀을 브라우저로 넘기지 않음");
});

test("chart key: 순서가 달라도 같고, 상품이 다르면 다르다", () => {
  const ids = moneySignals();
  const a = chartKeyFor("premium_money", ids, sha256)!;
  const b = chartKeyFor("premium_money", [...ids].reverse(), sha256)!;
  assert.equal(a.key, b.key);
  assert.equal(chartKeyFor("premium_love", ids, sha256), null, "영역 밖");
});

test("Supabase 서버 키: 새 Secret Key(SUPABASE_SECRET_KEY) 우선, 예전 service_role 은 대체용, 공개 키는 거부", async () => {
  const { supabaseServerKey } = await import("../api-lib/env");
  const jwt = (role: string) => `h.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.s`;
  assert.deepEqual(supabaseServerKey({ SUPABASE_SECRET_KEY: "sb_secret_new", SUPABASE_SERVICE_ROLE_KEY: jwt("service_role") }), { name: "SUPABASE_SECRET_KEY", key: "sb_secret_new" });
  assert.equal(supabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: jwt("service_role") })?.name, "SUPABASE_SERVICE_ROLE_KEY");
  assert.equal(supabaseServerKey({ SUPABASE_SECRET_KEY: "sb_publishable_abc" }), null, "공개 키 거부");
  assert.equal(supabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: jwt("anon") }), null, "anon JWT 거부");
  assert.equal(supabaseServerKey({}), null);
  const base = { PALJA_PAYMENTS_MODE: "test", TOSS_SECRET_KEY: "test_sk_x", SUPABASE_URL: "https://abc.supabase.co" };
  assert.equal(paymentsConfig({ ...base, SUPABASE_SECRET_KEY: "sb_publishable_abc" }).ok, false, "공개 키로는 결제 서버 동작 안 함");
  assert.ok(paymentsConfig({ ...base, SUPABASE_SECRET_KEY: "sb_secret_abc" }).ok);
});

test("새 Secret Key 는 REST 요청에 apikey 헤더로만 보낸다 (Bearer 없음)", async () => {
  const { createSupabaseOrderRepo } = await import("../src/server/payments/adapters");
  const seen: Record<string, string>[] = [];
  const fakeFetch = (async (_url: string, init: RequestInit) => {
    seen.push(init.headers as Record<string, string>);
    return new Response("[]", { status: 200 });
  }) as unknown as typeof fetch;
  await createSupabaseOrderRepo("https://abc.supabase.co", "sb_secret_abc", fakeFetch).get("sp-order-1");
  assert.equal(seen[0]!.apikey, "sb_secret_abc");
  assert.equal(seen[0]!.Authorization, undefined);
});
