// POST /api/orders — 주문 생성. 가격은 서버가 상품 설정으로 정한다 (브라우저 금액 무시).
import { createOrder } from "../src/server/payments/service";
import { fromResult, json, paymentsConfig, readJson } from "../api-lib/env";

export async function POST(request: Request): Promise<Response> {
  const cfg = paymentsConfig();
  if (!cfg.ok) return json(cfg.status, { code: cfg.code, message: cfg.message });
  const body = await readJson(request);
  if (!body) return json(400, { code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않아요." });
  return fromResult(await createOrder(cfg.deps, { productId: body.productId, resultId: body.resultId, signalIds: body.signalIds, amount: body.amount }));
}
