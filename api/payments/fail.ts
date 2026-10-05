// POST /api/payments/fail — 토스 failUrl(사용자 취소·실패) 기록. CREATED 주문만 CANCELLED/FAILED 로 바꾼다.
import { recordFailure } from "../../src/server/payments/service";
import { fromResult, json, paymentsConfig, readJson } from "../../api-lib/env";

export async function POST(request: Request): Promise<Response> {
  const cfg = paymentsConfig();
  if (!cfg.ok) return json(cfg.status, { code: cfg.code, message: cfg.message });
  const body = await readJson(request);
  if (!body) return json(400, { code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않아요." });
  return fromResult(await recordFailure(cfg.deps, { orderId: body.orderId, code: body.code, message: body.message }));
}
