// 브라우저 결제 흐름 (토스페이먼츠 결제창 v2). 결제 모드가 off 면 이 기능은 쓰이지 않는다.
//
// 브라우저가 하는 일: 주문 요청 → 토스 결제창 열기 → (successUrl) 서버 승인 요청 → 서버가 준 리포트 표시.
// 브라우저가 정하지 않는 것: 가격, 결제 성공 여부, Premium 열람 권한 (모두 서버가 판단).
// 저장: 구매 코드·주문 번호·Signal id 만 이 기기에 저장(구매 다시 보기용). 생년월일·전화번호는 저장하지 않는다.

declare const __PALJA_PAYMENTS_MODE__: "off" | "test" | "live";
declare const __PALJA_TOSS_CLIENT_KEY__: string | null;

export const PAYMENTS_MODE = __PALJA_PAYMENTS_MODE__;
export const PAYMENTS_ENABLED = __PALJA_PAYMENTS_MODE__ !== "off" && !!__PALJA_TOSS_CLIENT_KEY__;

export interface PremiumReport {
  readonly productId: string;
  readonly title: string;
  readonly summary: readonly string[];
  readonly why: readonly { readonly label: string; readonly text: string; readonly detail: string }[];
  readonly how: readonly { readonly label: string; readonly steps: readonly string[] }[];
  readonly reversal: string | null;
  readonly checklist: readonly string[];
  readonly notIncluded: readonly string[];
}

export interface StoredPurchase {
  readonly orderId: string;
  readonly productId: string;
  readonly purchaseCode: string;
  readonly signalIds: readonly string[];
  readonly characterName: string;
}

const PENDING_KEY = "sp-pending-order";
const PURCHASES_KEY = "sp-purchases-v1";

type ApiError = { code: string; message: string };
async function post<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number; error: ApiError }> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & ApiError;
    return res.ok ? { ok: true, data } : { ok: false, status: res.status, error: { code: data.code ?? `HTTP_${res.status}`, message: data.message ?? "잠시 후 다시 시도해 주세요." } };
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK", message: "인터넷 연결을 확인해 주세요." } };
  }
}

function safeGet<T>(storage: Storage, key: string): T | null {
  try {
    const v = storage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function safeSet(storage: Storage, key: string, v: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(v));
  } catch {
    // 저장 불가(사생활 보호 모드 등): 구매 코드 화면에서 직접 적어 두도록 안내한다
  }
}

export function storedPurchases(): StoredPurchase[] {
  return safeGet<StoredPurchase[]>(localStorage, PURCHASES_KEY) ?? [];
}
function rememberPurchase(p: StoredPurchase): void {
  const list = storedPurchases().filter((x) => x.orderId !== p.orderId);
  list.push(p);
  safeSet(localStorage, PURCHASES_KEY, list.slice(-20));
}
/** 같은 결과(Signal id 집합)·같은 상품의 이 기기 구매 기록 */
export function findStoredPurchase(productId: string, signalIds: readonly string[]): StoredPurchase | null {
  const key = [...signalIds].sort().join(",");
  return storedPurchases().find((p) => p.productId === productId && [...p.signalIds].sort().join(",") === key) ?? null;
}

let sdkPromise: Promise<void> | null = null;
function loadTossSdk(): Promise<void> {
  sdkPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.tosspayments.com/v2/standard";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("토스 결제 모듈을 불러오지 못했어요."));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

interface TossGlobal {
  (clientKey: string): { payment(o: { customerKey: unknown }): { requestPayment(o: object): Promise<void> } };
  ANONYMOUS: unknown;
}

/** 주문 생성 → 토스 결제창. 성공/실패 후에는 successUrl/failUrl 로 돌아온다. */
export async function startCheckout(input: { productId: string; resultId: string; signalIds: readonly string[]; characterName: string }): Promise<{ ok: false; message: string } | { ok: true }> {
  if (!PAYMENTS_ENABLED) return { ok: false, message: "사주팔자PLAY Beta에서 준비 중인 기능입니다." };
  const r = await post<{ orderId: string; amount: number; orderName: string; purchaseCode: string }>("/api/orders", { productId: input.productId, resultId: input.resultId, signalIds: input.signalIds });
  if (!r.ok) return { ok: false, message: r.error.message };
  const pending: StoredPurchase = { orderId: r.data.orderId, productId: input.productId, purchaseCode: r.data.purchaseCode, signalIds: [...input.signalIds], characterName: input.characterName };
  safeSet(sessionStorage, PENDING_KEY, pending);
  safeSet(localStorage, PENDING_KEY, pending); // 결제 앱 전환 중 탭이 바뀌는 경우 대비
  try {
    await loadTossSdk();
    const Toss = (window as unknown as { TossPayments: TossGlobal }).TossPayments;
    const payment = Toss(__PALJA_TOSS_CLIENT_KEY__ as string).payment({ customerKey: Toss.ANONYMOUS });
    const returnTo = `${location.origin}${location.pathname}`;
    await payment.requestPayment({
      method: "CARD",
      amount: { currency: "KRW", value: r.data.amount }, // 서버가 정한 금액
      orderId: r.data.orderId,
      orderName: r.data.orderName,
      successUrl: `${returnTo}?pay=success`,
      failUrl: `${returnTo}?pay=fail`,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error && e.message ? e.message : "결제창을 열지 못했어요." };
  }
}

export type ReturnOutcome =
  | { kind: "none" }
  | { kind: "paid"; purchase: StoredPurchase }
  | { kind: "confirm-pending"; message: string }
  | { kind: "paid-no-report"; purchase: StoredPurchase | null; message: string }
  | { kind: "failed"; message: string; cancelled: boolean };

/** successUrl / failUrl 로 돌아왔을 때 처리. 주소의 결제 정보는 처리 후 바로 지운다. */
export async function handlePaymentReturn(): Promise<ReturnOutcome> {
  const q = new URLSearchParams(location.search);
  const pay = q.get("pay");
  if (pay !== "success" && pay !== "fail") return { kind: "none" };
  const pending = safeGet<StoredPurchase>(sessionStorage, PENDING_KEY) ?? safeGet<StoredPurchase>(localStorage, PENDING_KEY);
  if (pay === "fail") {
    history.replaceState(null, "", `${location.pathname}${location.hash}`);
    const code = q.get("code") ?? "UNKNOWN";
    const orderId = q.get("orderId") ?? pending?.orderId ?? "";
    if (orderId) await post("/api/payments/fail", { orderId, code, message: (q.get("message") ?? "").slice(0, 300) });
    const cancelled = code === "PAY_PROCESS_CANCELED";
    return { kind: "failed", cancelled, message: cancelled ? "결제를 취소했어요. 결제된 금액은 없어요." : "결제가 완료되지 않았어요. 결제된 금액은 없어요." };
  }
  const paymentKey = q.get("paymentKey");
  const orderId = q.get("orderId");
  const amount = q.get("amount");
  if (!paymentKey || !orderId || !amount) return { kind: "failed", cancelled: false, message: "결제 정보가 없어요. 처음부터 다시 시도해 주세요." };
  const c = await post<{ status: "PAID" }>("/api/payments/confirm", { paymentKey, orderId, amount });
  if (!c.ok) {
    if (c.error.code === "STORAGE_ERROR" || c.error.code === "PAYMENT_PROCESSING" || c.error.code === "NETWORK") return { kind: "confirm-pending", message: c.error.message };
    history.replaceState(null, "", `${location.pathname}${location.hash}`);
    return { kind: "failed", cancelled: false, message: c.error.message };
  }
  history.replaceState(null, "", `${location.pathname}${location.hash}`);
  if (!pending || pending.orderId !== orderId) {
    return { kind: "paid-no-report", purchase: null, message: "결제는 완료됐어요. 이 기기에 구매 코드가 없어 리포트를 열 수 없어요. 결제한 기기에서 다시 열거나 고객 문의로 알려 주세요." };
  }
  rememberPurchase(pending);
  try {
    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch {}
  // Confirmation never fetches content: only a deliberate open button provides the report.
  return { kind: "paid", purchase: pending };
}

/** 구매 코드로 리포트 받기 (구매 다시 보기·다른 기기 복구) */
export async function fetchReport(purchaseCode: string, productId: string, signalIds: readonly string[]): Promise<{ ok: true; report: PremiumReport } | { ok: false; message: string }> {
  const r = await post<{ report: PremiumReport }>("/api/premium/report", { purchaseCode, productId, signalIds, openContent: true });
  return r.ok ? { ok: true, report: r.data.report } : { ok: false, message: r.error.message };
}

export function rememberRestoredPurchase(p: StoredPurchase): void {
  rememberPurchase(p);
}

export async function cancelUnopenedPurchase(p: StoredPurchase): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await post("/api/payments/refund-unopened", { purchaseCode: p.purchaseCode, productId: p.productId, signalIds: p.signalIds });
  if (!result.ok) return { ok: false, message: result.error.message };
  safeSet(localStorage, PURCHASES_KEY, storedPurchases().filter((x) => x.orderId !== p.orderId));
  return { ok: true };
}
