// Customer route cannot call administrator exception refunds.
import { refundUnopenedOrder } from "../../src/server/payments/service";
import { enforcePremiumLimit } from "../../api-lib/premium-limit";
import { fromResult, json, paymentsConfig, readJson } from "../../api-lib/env";
export async function POST(request: Request): Promise<Response> {
  const cfg = paymentsConfig();
  if (!cfg.ok) return json(cfg.status, { code: cfg.code, message: cfg.message });
  const body = await readJson(request);
  if (!body) return json(400, { code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않아요." });
  const limited = await enforcePremiumLimit(request, body.purchaseCode);
  if (limited) return limited;
  return fromResult(await refundUnopenedOrder(cfg.deps, { purchaseCode: body.purchaseCode, productId: body.productId, signalIds: body.signalIds }));
}
