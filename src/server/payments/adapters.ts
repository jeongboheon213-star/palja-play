// 실제 연결: 토스페이먼츠 REST API, Supabase REST(service_role). 서버 전용.
// 키는 호출자(api 계층)가 환경 변수에서 읽어 주입한다. 이 파일은 환경 변수를 직접 읽지 않는다.

import type { NewOrder, Order, OrderPatch, OrderRepo, OrderStatus, TossClient, TossPayment, TossResult } from "./types";

const TOSS_API = "https://api.tosspayments.com";

function toPayment(j: Record<string, unknown>): TossPayment {
  return {
    paymentKey: String(j.paymentKey ?? ""),
    orderId: String(j.orderId ?? ""),
    status: String(j.status ?? ""),
    totalAmount: Number(j.totalAmount ?? NaN),
    method: typeof j.method === "string" ? j.method : null,
    approvedAt: typeof j.approvedAt === "string" ? j.approvedAt : null,
  };
}

export function createTossClient(secretKey: string, fetchFn: typeof fetch = fetch): TossClient {
  // 토스 인증: Basic base64("시크릿키:")
  const auth = `Basic ${btoa(`${secretKey}:`)}`;
  async function call(method: "GET" | "POST", path: string, body?: object, idempotencyKey?: string): Promise<TossResult> {
    let res: Response;
    try {
      res = await fetchFn(`${TOSS_API}${path}`, {
        method,
        headers: { Authorization: auth, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      return { ok: false, httpStatus: 0, code: "NETWORK_ERROR", message: "토스 서버에 연결하지 못함" };
    }
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, httpStatus: res.status, code: String(j.code ?? `HTTP_${res.status}`), message: String(j.message ?? "") };
    return { ok: true, payment: toPayment(j) };
  }
  return {
    confirm: ({ paymentKey, orderId, amount, idempotencyKey }) => call("POST", "/v1/payments/confirm", { paymentKey, orderId, amount }, idempotencyKey),
    getByOrderId: (orderId) => call("GET", `/v1/payments/orders/${encodeURIComponent(orderId)}`),
    cancel: ({ paymentKey, reason, idempotencyKey }) => call("POST", `/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, { cancelReason: reason }, idempotencyKey),
  };
}

/** Supabase REST + service_role 키 (서버 전용, RLS 우회). 실패하면 예외. */
export function createSupabaseOrderRepo(baseUrl: string, serviceRoleKey: string, fetchFn: typeof fetch = fetch): OrderRepo {
  const root = `${baseUrl.replace(/\/+$/, "")}/rest/v1/orders`;
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    ...(serviceRoleKey.startsWith("sb_") ? {} : { Authorization: `Bearer ${serviceRoleKey}` }),
    "Content-Type": "application/json",
  };
  async function req(url: string, init: RequestInit): Promise<unknown> {
    const res = await fetchFn(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  const one = (rows: unknown): Order | null => (Array.isArray(rows) && rows.length > 0 ? (rows[0] as Order) : null);
  const rpc = async (name: string, orderId: string, codeHash: string, chartKey: string, productId: string, mode: string) =>
    one(await req(`${baseUrl.replace(/\/+$/, "")}/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify({ p_order_id: orderId, p_code_hash: codeHash, p_chart_key: chartKey, p_product_id: productId, p_mode: mode }) }));
  return {
    openContent: (id, code, chart, product, mode) => rpc("open_paid_content", id, code, chart, product, mode),
    claimUnopenedRefund: (id, code, chart, product, mode) => rpc("claim_unopened_refund", id, code, chart, product, mode),
    async insert(o: NewOrder) {
      await req(root, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(o) });
    },
    async get(orderId) {
      return one(await req(`${root}?order_id=eq.${encodeURIComponent(orderId)}&select=*`, { method: "GET" }));
    },
    async findByPurchaseCodeHash(hash) {
      return one(await req(`${root}?purchase_code_hash=eq.${encodeURIComponent(hash)}&select=*`, { method: "GET" }));
    },
    async transition(orderId, from: readonly OrderStatus[], patch: OrderPatch) {
      const filter = `order_id=eq.${encodeURIComponent(orderId)}&status=in.(${from.join(",")})`;
      return one(await req(`${root}?${filter}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) }));
    },
  };
}
