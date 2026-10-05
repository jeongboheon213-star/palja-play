// POST /api/premium/report — 구매 코드 + 같은 사주(Signal id) + PAID 일 때만 정식 리포트 반환.
// 다른 기기 구매 복구도 이 API 로 한다 (생년월일 재입력 → 같은 Signal → 구매 코드).
import { openPremiumReport } from "../../src/server/premium/access";
import { enforcePremiumLimit } from "../../api-lib/premium-limit";
import { fromResult, json, paymentsConfig, readJson } from "../../api-lib/env";

export async function POST(request: Request, env: Record<string, string | undefined> = process.env, trustedClientIp?: string): Promise<Response> {
  const cfg = paymentsConfig(env);
  if (!cfg.ok) return json(cfg.status, { code: cfg.code, message: cfg.message });
  const body = await readJson(request);
  if (!body) return json(400, { code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않아요." });
  const limited = await enforcePremiumLimit(request, body.purchaseCode, env, fetch, trustedClientIp);
  if (limited) return limited;
  return fromResult(await openPremiumReport(cfg.deps, { purchaseCode: body.purchaseCode, productId: body.productId, signalIds: body.signalIds, openContent: body.openContent }));
}
