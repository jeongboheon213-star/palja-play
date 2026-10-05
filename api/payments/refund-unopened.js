// 자동 생성 파일 (scripts/build-api.mjs). 직접 고치지 말고 api-src/ 를 수정하세요.

// src/data/products.ts
var PRODUCTS = Object.freeze({
  free_result: Object.freeze({
    id: "free_result",
    name: "무료 캐릭터 카드",
    tier: "free",
    priceKrw: 0,
    betaTestPrice: false,
    paymentEnabled: false,
    axes: Object.freeze(["what"]),
    domains: Object.freeze(["wealth", "love", "career", "business"]),
    clickEvent: null,
    interestEvent: null,
    hook: "",
    emoji: "🎴",
    subtitle: "나는 어떤 사람인가"
  }),
  premium_money: Object.freeze({
    id: "premium_money",
    name: "재물 심층 리포트",
    tier: "premium",
    priceKrw: 2900,
    betaTestPrice: true,
    paymentEnabled: false,
    axes: Object.freeze(["why", "how", "when"]),
    domains: Object.freeze(["wealth"]),
    clickEvent: "premium_money_click",
    interestEvent: "premium_money_interest",
    hook: "왜 돈이 들어오고 나가는 패턴이 반복될까?",
    emoji: "💰",
    subtitle: "돈이 들어오고 나가는 패턴"
  }),
  premium_love: Object.freeze({
    id: "premium_love",
    name: "연애 심층 리포트",
    tier: "premium",
    priceKrw: 2900,
    betaTestPrice: true,
    paymentEnabled: false,
    axes: Object.freeze(["why", "how", "when"]),
    domains: Object.freeze(["love"]),
    clickEvent: "premium_love_click",
    interestEvent: "premium_love_interest",
    hook: "왜 나는 이런 사람에게 끌릴까?",
    emoji: "💕",
    subtitle: "끌리는 사람과 관계의 패턴"
  }),
  premium_career: Object.freeze({
    id: "premium_career",
    name: "직업·사업 심층 리포트",
    tier: "premium",
    priceKrw: 2900,
    betaTestPrice: true,
    paymentEnabled: false,
    axes: Object.freeze(["why", "how", "when"]),
    domains: Object.freeze(["career", "business"]),
    clickEvent: "premium_career_click",
    interestEvent: "premium_career_interest",
    hook: "나는 조직형일까, 사업형일까?",
    emoji: "💼",
    subtitle: "일하는 방식과 커리어 패턴"
  })
});
var PREMIUM_PRODUCT_IDS = Object.freeze(["premium_money", "premium_love", "premium_career"]);

// src/lib/interpretation/copy/premiumCopy.ts
var PREMIUM_COPY = Object.freeze({
  // 재물
  "wealth.jae.none": {
    why: "사주에 돈을 직접 다루는 기운(재성)이 드러나지 않아요. 그래서 돈보다 능력·평판이 먼저 쌓이고, 돈은 그 뒤를 따라오는 구조가 돼요.",
    how: "돈을 목표로 삼기보다 '내 능력이 돈이 되는 통로'를 하나 정해 두면 흐름이 빨라져요."
  },
  "wealth.jae.present": {
    why: "재성이 한 번 자리 잡고 있어 돈에 대한 감각이 과하지도 부족하지도 않게 작동해요.",
    how: "수입원을 한 가지 더 만드는 데 감각을 써 보면 안정감이 커져요."
  },
  "wealth.jae.strong": {
    why: "재성이 여러 번 겹쳐 있어 돈과 기회를 알아보는 감각이 기본값처럼 켜져 있는 구조예요.",
    how: "기회가 많은 만큼 '하지 않을 일' 목록을 먼저 정해 두면 에너지가 덜 새요."
  },
  "wealth.pyeonjae": {
    why: "편재는 고정 월급보다 거래·기회·유통처럼 움직이는 돈을 뜻해요. 그래서 큰 기회에 반응하는 감각이 강해요.",
    how: "기회를 잡을 때 손실 한도를 숫자로 먼저 정해 두면 배짱이 무기가 돼요."
  },
  "wealth.jeongjae": {
    why: "정재는 꾸준히 들어오는 돈과 관리하는 힘을 뜻해요. 쌓아 가는 방식이 몸에 맞는 이유예요.",
    how: "자동으로 쌓이는 구조(정기 저축·기록)를 만들면 강점이 그대로 성과가 돼요."
  },
  "wealth.siksang_to_jae": {
    why: "재능을 뜻하는 식상이 돈을 뜻하는 재성으로 이어지는 '식상생재' 흐름이 있어요. 만든 것이 돈이 되는 구조예요.",
    how: "잘하는 것을 작은 상품이나 서비스로 한 번 묶어 보는 게 첫걸음이에요."
  },
  "wealth.bigeop_outflow": {
    why: "나와 같은 기운(비겁)이 많으면 돈을 나누거나 경쟁하는 상황이 자주 생겨요. 들어온 돈이 흩어지기 쉬운 이유예요.",
    how: "함께 쓰는 돈과 내 돈의 통장을 나누고, 빌려주는 기준을 미리 정해 두세요."
  },
  "wealth.inseong_slow": {
    why: "생각과 배움을 뜻하는 인성이 많아 돈을 움직이기 전에 충분히 검토하는 성향이 생겨요.",
    how: "검토 기간을 정해 두고, 기한이 오면 작게라도 실행하는 규칙을 써 보세요."
  },
  // 연애
  "love.star.none": {
    why: "배우자를 뜻하는 별이 사주에 드러나지 않아요. 연애보다 내 삶의 기반이 먼저 자리 잡는 구조라 인연이 천천히 오는 편이에요.",
    how: "취미·일처럼 내가 편한 공간에서 자연스럽게 만나는 방식이 잘 맞아요."
  },
  "love.star.present": {
    why: "배우자를 뜻하는 별이 적당히 자리 잡아 관계를 안정적으로 이어 가는 힘이 생겨요.",
    how: "편안함이 지루함으로 바뀌지 않게 작은 이벤트를 의식적으로 만들어 보세요."
  },
  "love.star.many": {
    why: "배우자를 뜻하는 별이 여러 번 보여 사람의 관심이 잘 모이는 구조예요.",
    how: "관심이 많을수록 나에게 맞는 사람의 기준 세 가지를 먼저 정해 두세요."
  },
  "love.star.crowded": {
    why: "선택지가 많은 구조는 고민을 길게 만들기도 해요.",
    how: "결정을 미루기보다 기간을 정해 마음을 정리하는 편이 관계를 지켜 줘요."
  },
  "love.expression": {
    why: "표현을 뜻하는 식상이 있어 마음을 말과 행동으로 꺼내는 능력이 있어요.",
    how: "표현력이 강점인 만큼, 상대의 말을 끝까지 듣는 시간을 같이 챙기면 좋아요."
  },
  "love.daybranch.combine": {
    why: "배우자 자리인 일지가 다른 글자와 합을 이뤄 가까운 사람과 정이 붙는 구조예요.",
    how: "정이 깊은 만큼 서운함도 커질 수 있으니 바로바로 말하는 습관이 좋아요."
  },
  "love.daybranch.clash": {
    why: "배우자 자리인 일지가 다른 글자와 부딪혀(충) 가까운 관계에 변화와 자극이 많아요.",
    how: "부딪힘이 생기면 결론보다 감정을 먼저 정리하는 시간을 두세요."
  },
  "love.bigeop_pride": {
    why: "나와 같은 기운(비겁)이 강해 관계에서도 자존심이 먼저 나서기 쉬워요.",
    how: "이기는 대화보다 이어지는 대화를 목표로 두면 관계가 편해져요."
  },
  // 직업
  "career.gwan.none": {
    why: "조직과 규칙을 뜻하는 관성이 드러나지 않아 위에서 정해 주는 틀보다 자율에서 힘이 나요.",
    how: "재량이 있는 역할이나 프로젝트형 일을 찾으면 능력이 살아나요."
  },
  "career.gwan.present": {
    why: "관성이 적당히 있어 역할과 책임이 분명한 자리에서 인정받는 구조예요.",
    how: "맡은 역할의 성과를 숫자로 기록해 두면 인정이 빨라져요."
  },
  "career.gwan.many": {
    why: "관성이 여러 번 겹쳐 책임과 역할이 계속 들어오는 구조예요.",
    how: "중요한 책임 세 가지를 정하고 나머지는 위임하는 연습이 필요해요."
  },
  "career.gwan.pressure": {
    why: "관성이 많으면 기대와 압박을 크게 느끼기 쉬워요.",
    how: "감당 범위를 미리 말해 두는 것도 실력이라는 걸 기억해 주세요."
  },
  "career.jeonggwan": { why: "정관은 원칙과 신뢰를 뜻해요. 바르게 쌓은 평판이 커리어의 무기가 돼요.", how: "약속과 마감을 지키는 기록이 곧 경력이 돼요." },
  "career.pyeongwan": { why: "편관은 압박과 승부를 뜻해요. 위기에서 실력이 드러나는 이유예요.", how: "도전적인 프로젝트를 일부러 맡아 보는 게 성장의 지름길이에요." },
  "career.inseong_expertise": { why: "인성은 배움과 자격을 뜻해요. 공부한 만큼 커리어가 넓어지는 구조예요.", how: "자격·포트폴리오처럼 눈에 보이는 결과로 배움을 남겨 두세요." },
  "career.gwan_in": { why: "책임(관성)과 배움(인성)이 이어지는 '관인상생' 흐름이 있어요. 실력이 자리로 이어지는 구조예요.", how: "배운 것을 조직 안에서 증명할 기회를 적극적으로 찾으세요." },
  // 사업
  "business.siksang.none": {
    why: "창작·표현을 뜻하는 식상이 드러나지 않아 새로 만드는 것보다 운영하는 쪽이 편한 구조예요.",
    how: "아이디어는 파트너에게, 운영과 관리는 내가 맡는 분업이 잘 맞아요."
  },
  "business.siksang.present": {
    why: "식상이 있어 무언가를 만들고 보여 주는 힘이 사업의 출발점이 돼요.",
    how: "작은 결과물이라도 자주 공개해 반응을 모아 보세요."
  },
  "business.saengjae": {
    why: "만드는 힘(식상)이 돈(재성)으로 이어지는 '생재' 구조가 있어 사업 감각이 드러나요.",
    how: "만든 것에 가격을 붙여 보는 실험을 작게 반복해 보세요."
  },
  "business.opportunity": { why: "편재가 있어 기회를 빠르게 포착하는 감각이 있어요.", how: "기회를 볼 때마다 짧게 메모해 두면 나만의 사업 아이템 목록이 돼요." },
  "business.independence": { why: "비겁이 여럿 있어 내 판을 직접 꾸리려는 독립심이 강해요.", how: "혼자 다 하기보다 핵심만 직접 하고 나머지는 시스템에 맡기세요." },
  "business.overload": {
    why: "기회(재성)는 많은데 일간의 힘이 상대적으로 약해 감당 범위를 넘기기 쉬운 구조예요.",
    how: "규모를 키우기 전에 체력과 시간이 버틸 수 있는지 먼저 계산해 보세요."
  },
  "business.slow_start": {
    why: "배움(인성)은 많고 실행(식상)은 드러나지 않아 준비가 길어지는 구조예요.",
    how: "완성도 70%에서 먼저 시작하는 규칙을 정해 두세요."
  }
});
var WHEN_PREPARING = Object.freeze({
  message: "준비 중",
  reason: "대운·세운 계산이 아직 구현되지 않아 시기 해석은 준비 중이에요."
});

// src/server/payments/service.ts
var PAID_PRODUCT_IDS = ["premium_money", "premium_love", "premium_career"];
function productDomains(productId) {
  return PRODUCTS[productId].domains;
}
function serverPrice(productId) {
  if (!PAID_PRODUCT_IDS.includes(productId)) return null;
  const p = PRODUCTS[productId];
  return { amount: p.priceKrw, orderName: `사주팔자PLAY ${p.name}` };
}
var SIGNAL_ID_RE = /^[a-z]+(\.[a-z_]+)+$/;
function chartKeyFor(productId, signalIds, sha2562) {
  if (!Array.isArray(signalIds) || signalIds.length === 0 || signalIds.length > 40) return null;
  const domains = productDomains(productId);
  const ids = Array.from(new Set(signalIds)).filter((x) => typeof x === "string");
  if (ids.length !== new Set(signalIds).size) return null;
  for (const id of ids) {
    if (!SIGNAL_ID_RE.test(id) || !(id in PREMIUM_COPY) || !domains.includes(id.split(".")[0])) return null;
  }
  ids.sort();
  return { key: sha2562(`${productId}|${ids.join(",")}`), ids };
}
function normalizePurchaseCode(code) {
  if (typeof code !== "string") return null;
  const c = code.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{16}$/.test(c) ? c : null;
}
var fail = (status, code, message) => ({ ok: false, status, code, message });
async function refundOrder(deps, input) {
  try {
    const order = await deps.repo.get(input.orderId);
    if (!order) return fail(404, "ORDER_NOT_FOUND", "주문 없음");
    if (order.status === "REFUNDED") return { ok: true, status: 200, body: { status: "REFUNDED" } };
    if (!["PAID", "REFUND_REQUESTED"].includes(order.status) || !order.payment_key) return fail(409, "NOT_REFUNDABLE", `환불할 수 없는 상태: ${order.status}`);
    if (order.toss_mode !== deps.tossMode) return fail(409, "MODE_MISMATCH", "결제 환경이 맞지 않아요.");
    if (order.status === "PAID") {
      const locked = await deps.repo.transition(order.order_id, ["PAID"], { status: "REFUND_REQUESTED" });
      if (!locked) return fail(409, "REFUND_PROCESSING", "취소 상태를 다시 확인해 주세요.");
    }
    const r = await deps.toss.cancel({ paymentKey: order.payment_key, reason: input.reason.slice(0, 200), idempotencyKey: `refund-${order.order_id}` });
    if (!r.ok && r.code !== "ALREADY_CANCELED_PAYMENT") return fail(503, "REFUND_PROCESSING", "취소 결과를 확인하는 중이에요. 다시 확인하거나 고객 문의로 알려 주세요.");
    const confirmed = r.ok ? r : await deps.toss.getByOrderId(order.order_id);
    if (!confirmed.ok || confirmed.payment.status !== "CANCELED" || confirmed.payment.orderId !== order.order_id || confirmed.payment.paymentKey !== order.payment_key || confirmed.payment.totalAmount !== order.amount) {
      return fail(503, "REFUND_PROCESSING", "취소 결과를 확인하는 중이에요. 고객 문의로 알려 주세요.");
    }
    const saved = await deps.repo.transition(order.order_id, ["REFUND_REQUESTED"], { status: "REFUNDED", refund_reason: input.reason.slice(0, 200) });
    if (!saved && (await deps.repo.get(order.order_id))?.status !== "REFUNDED") return fail(503, "STORAGE_ERROR", "취소 기록을 다시 확인해야 해요.");
    return { ok: true, status: 200, body: { status: "REFUNDED" } };
  } catch {
    return fail(503, "STORAGE_ERROR", "취소 상태를 확인하지 못했어요. 다시 시도해 주세요.");
  }
}
async function refundUnopenedOrder(deps, input) {
  const code = normalizePurchaseCode(input.purchaseCode);
  const productId = typeof input.productId === "string" ? input.productId : "";
  const chart = serverPrice(productId) ? chartKeyFor(productId, input.signalIds, deps.sha256) : null;
  if (!code || !chart) return fail(404, "NOT_REFUNDABLE", "취소할 구매 정보를 확인해 주세요.");
  try {
    const hash = deps.sha256(code);
    const order = await deps.repo.findByPurchaseCodeHash(hash);
    if (!order || order.product_id !== productId || order.chart_key !== chart.key || order.toss_mode !== deps.tossMode) return fail(404, "NOT_REFUNDABLE", "취소할 구매 정보를 확인해 주세요.");
    if (order.status === "REFUNDED") return { ok: true, status: 200, body: { status: "REFUNDED" } };
    const locked = await deps.repo.claimUnopenedRefund(order.order_id, hash, chart.key, productId, deps.tossMode);
    if (!locked) return fail(409, "SUPPORT_REQUIRED", "리포트가 제공되었거나 취소할 수 없는 상태예요. 결제 오류·중복 결제·서비스 문제 등은 고객 문의로 확인해 주세요.");
    return refundOrder(deps, { orderId: order.order_id, reason: "미열람 구매 취소" });
  } catch {
    return fail(503, "STORAGE_ERROR", "취소 상태를 확인하지 못했어요.");
  }
}

// api-lib/premium-limit.ts
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// api-lib/env.ts
import { createHash, randomBytes, randomUUID } from "node:crypto";

// src/server/payments/adapters.ts
var TOSS_API = "https://api.tosspayments.com";
function toPayment(j) {
  return {
    paymentKey: String(j.paymentKey ?? ""),
    orderId: String(j.orderId ?? ""),
    status: String(j.status ?? ""),
    totalAmount: Number(j.totalAmount ?? NaN),
    method: typeof j.method === "string" ? j.method : null,
    approvedAt: typeof j.approvedAt === "string" ? j.approvedAt : null
  };
}
function createTossClient(secretKey, fetchFn = fetch) {
  const auth = `Basic ${btoa(`${secretKey}:`)}`;
  async function call(method, path, body, idempotencyKey) {
    let res;
    try {
      res = await fetchFn(`${TOSS_API}${path}`, {
        method,
        headers: { Authorization: auth, "Content-Type": "application/json", ...idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {} },
        body: body ? JSON.stringify(body) : void 0
      });
    } catch {
      return { ok: false, httpStatus: 0, code: "NETWORK_ERROR", message: "토스 서버에 연결하지 못함" };
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, httpStatus: res.status, code: String(j.code ?? `HTTP_${res.status}`), message: String(j.message ?? "") };
    return { ok: true, payment: toPayment(j) };
  }
  return {
    confirm: ({ paymentKey, orderId, amount, idempotencyKey }) => call("POST", "/v1/payments/confirm", { paymentKey, orderId, amount }, idempotencyKey),
    getByOrderId: (orderId) => call("GET", `/v1/payments/orders/${encodeURIComponent(orderId)}`),
    cancel: ({ paymentKey, reason, idempotencyKey }) => call("POST", `/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, { cancelReason: reason }, idempotencyKey)
  };
}
function createSupabaseOrderRepo(baseUrl, serviceRoleKey, fetchFn = fetch) {
  const root = `${baseUrl.replace(/\/+$/, "")}/rest/v1/orders`;
  const headers = {
    apikey: serviceRoleKey,
    ...serviceRoleKey.startsWith("sb_") ? {} : { Authorization: `Bearer ${serviceRoleKey}` },
    "Content-Type": "application/json"
  };
  async function req(url, init) {
    let res;
    try {
      res = await fetchFn(url, { ...init, headers: { ...headers, ...init.headers } });
    } catch (error) {
      const cause = error instanceof Error ? error.cause : void 0;
      const directCode = error instanceof Error ? error.code : void 0;
      const invalidHeader = error instanceof Error && /invalid header|header.*invalid|not a legal HTTP header|ByteString/i.test(error.message);
      const code = ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_INVALID_ARG", "ERR_INVALID_CHAR", "ERR_INVALID_HTTP_TOKEN", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].find((c) => c === cause?.code || c === directCode) ?? (invalidHeader ? "INVALID_HEADER" : "NETWORK_ERROR");
      console.error("[payment-storage]", JSON.stringify({ operation: init.method, status: 0, code }));
      throw new Error("supabase network error");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const known = ["42501", "23502", "23503", "23505", "23514", "42P01", "42703", "PGRST106", "PGRST202", "PGRST204", "PGRST205", "PGRST301", "PGRST302", "PGRST303"];
      const code = known.find((c) => c === body.code) ?? "HTTP_ERROR";
      console.error("[payment-storage]", JSON.stringify({ operation: init.method, status: res.status, code }));
      throw new Error(`supabase ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  const one = (rows) => Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  const rpc = async (name, orderId, codeHash, chartKey, productId, mode) => one(await req(`${baseUrl.replace(/\/+$/, "")}/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify({ p_order_id: orderId, p_code_hash: codeHash, p_chart_key: chartKey, p_product_id: productId, p_mode: mode }) }));
  return {
    openContent: (id, code, chart, product, mode) => rpc("open_paid_content", id, code, chart, product, mode),
    claimUnopenedRefund: (id, code, chart, product, mode) => rpc("claim_unopened_refund", id, code, chart, product, mode),
    async insert(o) {
      await req(root, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(o) });
    },
    async get(orderId) {
      return one(await req(`${root}?order_id=eq.${encodeURIComponent(orderId)}&select=*`, { method: "GET" }));
    },
    async findByPurchaseCodeHash(hash) {
      return one(await req(`${root}?purchase_code_hash=eq.${encodeURIComponent(hash)}&select=*`, { method: "GET" }));
    },
    async transition(orderId, from, patch) {
      const filter = `order_id=eq.${encodeURIComponent(orderId)}&status=in.(${from.join(",")})`;
      return one(await req(`${root}?${filter}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) }));
    }
  };
}

// api-lib/env.ts
var PURCHASE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newPurchaseCode() {
  const b = randomBytes(16);
  const chars = Array.from(b, (x) => PURCHASE_ALPHABET[x % 32]).join("");
  return chars.match(/.{4}/g).join("-");
}
function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
function supabaseServerKey(env) {
  const isSecret = (k) => {
    if (k.startsWith("sb_secret_")) return true;
    if (k.startsWith("sb_")) return false;
    try {
      const payload = JSON.parse(Buffer.from((k.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
      return payload.role === "service_role";
    } catch {
      return false;
    }
  };
  for (const name of ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const key = env[name]?.trim();
    if (key && isSecret(key)) return { name, key };
  }
  return null;
}
function paymentsConfig(env = process.env) {
  const mode = env.PALJA_PAYMENTS_MODE ?? "off";
  if (mode !== "test" && mode !== "live") return { ok: false, status: 503, code: "PAYMENTS_DISABLED", message: "사주팔자PLAY Beta에서 준비 중인 기능입니다." };
  const secret = (env.TOSS_SECRET_KEY ?? "").trim();
  const supaUrl = (env.SUPABASE_URL ?? "").trim();
  const supaKey = supabaseServerKey(env)?.key ?? "";
  if (mode === "test" && !/^test_(g?sk)_/.test(secret)) return { ok: false, status: 503, code: "PAYMENTS_MISCONFIGURED", message: "결제 설정을 확인하는 중이에요." };
  if (mode === "live") {
    if (env.PALJA_ALLOW_LIVE_PAYMENTS !== "yes" || !/^live_(g?sk)_/.test(secret)) return { ok: false, status: 503, code: "LIVE_PAYMENTS_LOCKED", message: "사주팔자PLAY Beta에서 준비 중인 기능입니다." };
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supaUrl) || !supaKey) return { ok: false, status: 503, code: "PAYMENTS_MISCONFIGURED", message: "결제 설정을 확인하는 중이에요." };
  const vercelEnv = env.VERCEL_ENV;
  const source = vercelEnv === "production" ? "production" : vercelEnv === "preview" ? "preview" : "development";
  return {
    ok: true,
    deps: {
      repo: createSupabaseOrderRepo(supaUrl, supaKey),
      toss: createTossClient(secret),
      sha256,
      newOrderId: () => `sp-${randomUUID()}`,
      newPurchaseCode,
      tossMode: mode,
      source
    }
  };
}
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
async function readJson(request) {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return null;
  const text = await request.text();
  if (text.length > 8192) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
function fromResult(r) {
  return r.ok ? json(r.status, r.body) : json(r.status, { code: r.code, message: r.message });
}

// api-lib/premium-limit.ts
function premiumLimitHashes(request, code, key, vercel, trustedClientIp) {
  const raw = trustedClientIp ?? (vercel ? request.headers.get("x-vercel-forwarded-for")?.trim() : null);
  let client = "unidentified";
  if (raw && isIP(raw) === 4) client = raw;
  if (raw && isIP(raw) === 6) {
    const normalized = new URL(`http://[${raw}]/`).hostname.slice(1, -1);
    const [left, right] = normalized.split("::");
    const a = left ? left.split(":") : [];
    const b = right ? right.split(":") : [];
    const full = right !== void 0 ? [...a, ...Array(8 - a.length - b.length).fill("0"), ...b] : a;
    client = full.slice(0, 4).map((p) => p.padStart(4, "0")).join(":");
  }
  const digest = (context, value) => createHmac("sha256", key).update(`premium-limit-v1:${context}:${value}`).digest("hex");
  return { p_client_hash: digest("client", client), p_code_hash: digest("code", normalizePurchaseCode(code) ?? "invalid") };
}
async function enforcePremiumLimit(request, code, env = process.env, fetchFn = fetch, trustedClientIp) {
  const key = supabaseServerKey(env)?.key;
  const url = env.SUPABASE_URL?.trim();
  if (!key || !url) return json(503, { code: "RATE_LIMIT_UNAVAILABLE", message: "구매 확인을 잠시 이용할 수 없어요." });
  try {
    const response = await fetchFn(`${url.replace(/\/+$/, "")}/rest/v1/rpc/consume_premium_attempt`, {
      method: "POST",
      headers: { apikey: key, ...key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }, "Content-Type": "application/json" },
      body: JSON.stringify(premiumLimitHashes(request, code, key, env.VERCEL === "1", trustedClientIp))
    });
    if (!response.ok) throw new Error("limiter unavailable");
    const allowed = await response.json();
    if (allowed === true) return null;
    if (allowed !== false) throw new Error("invalid limiter response");
    const result = json(429, { code: "TOO_MANY_ATTEMPTS", message: "구매 확인 요청이 많아요. 10분 뒤 다시 시도해 주세요." });
    result.headers.set("Retry-After", "600");
    return result;
  } catch {
    return json(503, { code: "RATE_LIMIT_UNAVAILABLE", message: "구매 확인을 잠시 이용할 수 없어요. 잠시 후 다시 시도해 주세요." });
  }
}

// api-src/payments/refund-unopened.ts
async function POST(request, env = process.env, trustedClientIp) {
  const cfg = paymentsConfig(env);
  if (!cfg.ok) return json(cfg.status, { code: cfg.code, message: cfg.message });
  const body = await readJson(request);
  if (!body) return json(400, { code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않아요." });
  const limited = await enforcePremiumLimit(request, body.purchaseCode, env, fetch, trustedClientIp);
  if (limited) return limited;
  return fromResult(await refundUnopenedOrder(cfg.deps, { purchaseCode: body.purchaseCode, productId: body.productId, signalIds: body.signalIds }));
}
export {
  POST
};
