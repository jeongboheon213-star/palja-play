// Local trusted administrator only. No browser route, TEST only in this release.
// Verify customer's receipt and order identity before running; never paste secret keys into chat.
import { paymentsConfig, newPurchaseCode, sha256 } from "../api-lib/env";
import { normalizePurchaseCode, refundOrder } from "../src/server/payments/service";
const [action, orderId, reason] = process.argv.slice(2);
if (!["refund", "rotate-code"].includes(action ?? "") || !orderId || !/^[A-Za-z0-9_-]{6,64}$/.test(orderId)) {
  console.error("Usage: npx tsx scripts/payment-admin.ts refund ORDER_ID REASON | rotate-code ORDER_ID");
  process.exit(1);
}
if (process.env.PALJA_PAYMENTS_MODE !== "test") {
  console.error("이 도구는 TEST 환경에서만 실행할 수 있어요. LIVE 변경은 지원하지 않아요."); process.exit(1);
}
const cfg = paymentsConfig();
if (!cfg.ok) { console.error(cfg.message); process.exit(1); }
try {
  const order = await cfg.deps.repo.get(orderId);
  if (!order || order.toss_mode !== "test") throw new Error("주문 환경 확인 필요");
  if (action === "refund") {
    if (!reason?.trim()) throw new Error("관리자 환불 사유 필요");
    const result = await refundOrder(cfg.deps, { orderId, reason });
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } else {
    const code = newPurchaseCode();
    const updated = await cfg.deps.repo.transition(orderId, ["PAID"], { purchase_code_hash: sha256(normalizePurchaseCode(code)!) });
    if (!updated) throw new Error("PAID 주문에만 구매 코드 재발급 가능");
    console.log(JSON.stringify({ orderId, purchaseCode: code, note: "기존 구매 코드는 즉시 무효화돼요. 확인된 구매자에게만 새 코드를 전달하세요." }));
  }
} catch { console.error("관리자 작업을 완료하지 못했어요. 주문 상태와 서버 설정을 확인하세요."); process.exitCode = 1; }
