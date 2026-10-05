import { findEntitlement, normalizePurchaseCode, chartKeyFor } from "../payments/service";
import type { ApiResult, PaymentDeps } from "../payments/types";
import { buildPremiumReport, type PremiumReport } from "./report";
export async function openPremiumReport(deps: PaymentDeps, input: { purchaseCode: unknown; productId: unknown; signalIds: unknown; openContent?: unknown }): Promise<ApiResult<{ orderId: string; contentOpenedAt: string; report: PremiumReport }>> {
  if (input.openContent !== true) return { ok: false, status: 400, code: "OPEN_REQUIRED", message: "리포트 열기 버튼을 눌러 주세요." };
  const entitlement = await findEntitlement(deps, input);
  if (!entitlement.ok) return entitlement;
  const { orderId, productId, signalIds } = entitlement.body;
  // Build before recording provision; failed construction must never mark opened.
  const report = buildPremiumReport(productId, signalIds);
  try {
    const row = await deps.repo.openContent(orderId, deps.sha256(normalizePurchaseCode(input.purchaseCode)!), chartKeyFor(productId, signalIds, deps.sha256)!.key, productId, deps.tossMode);
    if (!row || row.status !== "PAID" || !row.content_opened_at) return { ok: false, status: 409, code: "ACCESS_REVOKED", message: "이 구매는 리포트를 열 수 없는 상태예요." };
    return { ok: true, status: 200, body: { orderId, contentOpenedAt: row.content_opened_at, report } };
  } catch { return { ok: false, status: 503, code: "STORAGE_ERROR", message: "열람 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." }; }
}
