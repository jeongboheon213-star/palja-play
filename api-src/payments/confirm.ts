// POST /api/payments/confirm — 토스 successUrl 이후 서버 승인. 금액은 서버 주문 금액과 대조, 토스 승인은 멱등키 사용.
import { confirmPayment } from "../../src/server/payments/service";
import { fromResult, json, paymentsConfig, readJson } from "../../api-lib/env";

export async function POST(request: Request, env: Record<string, string | undefined> = process.env, trustedClientIp?: string): Promise<Response> {
  const cfg = paymentsConfig(env);
  if (!cfg.ok) return json(cfg.status, { code: cfg.code, message: cfg.message });
  const body = await readJson(request);
  if (!body) return json(400, { code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않아요." });
  return fromResult(await confirmPayment(cfg.deps, { paymentKey: body.paymentKey, orderId: body.orderId, amount: body.amount }));
}
