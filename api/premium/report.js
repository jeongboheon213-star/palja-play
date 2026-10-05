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
async function findEntitlement(deps, input) {
  const code = normalizePurchaseCode(input.purchaseCode);
  const productId = typeof input.productId === "string" ? input.productId : "";
  if (!code) return fail(400, "INVALID_CODE", "구매 코드 형식이 올바르지 않아요.");
  if (!serverPrice(productId)) return fail(400, "INVALID_PRODUCT", "알 수 없는 상품이에요.");
  const chart = chartKeyFor(productId, input.signalIds, deps.sha256);
  if (!chart) return fail(400, "INVALID_CHART", "결과 정보가 올바르지 않아요.");
  let order;
  try {
    order = await deps.repo.findByPurchaseCodeHash(deps.sha256(code));
  } catch {
    return fail(503, "STORAGE_ERROR", "구매 정보를 확인하지 못했어요.");
  }
  if (!order || order.status !== "PAID" || order.product_id !== productId || order.chart_key !== chart.key || order.toss_mode !== deps.tossMode) {
    return fail(404, "ENTITLEMENT_NOT_FOUND", "이 결과에 대한 구매를 찾지 못했어요. 구매 코드와 생년월일 입력을 확인해 주세요.");
  }
  return { ok: true, status: 200, body: { orderId: order.order_id, productId, signalIds: chart.ids } };
}

// src/server/premium/detailCopy.ts
var DETAIL_COPY = Object.freeze({
  // ── 재물 ─────────────────────────────────────────────
  "wealth.jae.none": {
    label: "능력이 먼저, 돈은 나중",
    whyDetail: "돈을 직접 겨누는 기운이 약하면 관심이 돈 자체보다 일·사람·배움 쪽으로 먼저 갑니다. 그래서 수입은 '내가 잘하는 것'이 쌓인 뒤 따라오는 경우가 많고, 반대로 돈만 보고 움직이면 쉽게 지칩니다.",
    howSteps: ["내 능력 중 이미 돈을 받아 본 것 하나를 적고, 그걸 키우는 데 집중해 보세요.", "고정 지출·저축은 자동이체로 돌려 '신경 안 써도 쌓이는 구조'를 만드세요.", "가격을 정할 때 감 대신 비슷한 사례 3개를 비교하는 습관을 들이세요."]
  },
  "wealth.jae.present": {
    label: "균형 잡힌 돈 감각",
    whyDetail: "돈을 다루는 기운이 한 번 자리 잡고 있어 필요와 욕심 사이의 균형이 비교적 잘 맞습니다. 큰 모험보다는 '지킬 것은 지키며 조금씩 넓히는' 방식에서 결과가 좋아요.",
    howSteps: ["지금 수입원 옆에 작게 붙일 수 있는 두 번째 수입원을 하나 떠올려 보세요.", "한 달에 한 번 돈 흐름을 10분만 점검하는 날을 정하세요.", "충동 구매는 하루 뒤에 다시 보고 결정하는 규칙을 써 보세요."]
  },
  "wealth.jae.strong": {
    label: "기회가 잘 보이는 사람",
    whyDetail: "돈을 다루는 기운이 여러 번 겹쳐 있어 숫자와 기회가 자연스럽게 눈에 들어옵니다. 다만 보이는 기회가 많을수록 에너지가 분산돼 정작 큰 하나를 놓치기 쉬운 구조이기도 해요.",
    howSteps: ["이번 분기에 '하지 않을 일' 3가지를 먼저 적어 두세요.", "새 기회는 기존 일과 연결되는지 먼저 따져 보고 고르세요.", "수익을 낸 일과 시간만 쓴 일을 따로 기록해 비교해 보세요."]
  },
  "wealth.pyeonjae": {
    label: "움직이는 돈에 강함",
    whyDetail: "편재는 정해진 월급보다 거래·유통·기회처럼 흘러 다니는 돈과 연결됩니다. 판단이 빠르고 과감해서 남보다 먼저 움직이지만, 들어오는 폭만큼 나가는 폭도 커질 수 있어요.",
    howSteps: ["무언가에 돈을 걸기 전 '잃어도 괜찮은 한도'를 숫자로 먼저 정하세요.", "기회가 왔을 때 바로 결정하지 말고 하루 안에 한 사람에게 의견을 물어보세요.", "큰돈이 들어온 달에는 일정 비율을 따로 떼어 두는 규칙을 만드세요."]
  },
  "wealth.jeongjae": {
    label: "꾸준히 쌓는 힘",
    whyDetail: "정재는 일한 만큼 정직하게 들어오는 돈, 그리고 그것을 관리하는 힘을 뜻합니다. 속도는 느려 보여도 무너지지 않게 쌓는 데 강점이 있어요.",
    howSteps: ["매달 같은 날 같은 금액이 쌓이도록 설정해 두세요.", "가계부 대신 '이번 달 가장 잘 쓴 돈 1개'만 적어 보세요.", "작은 성과라도 연봉·단가 협상의 근거로 기록해 두세요."]
  },
  "wealth.siksang_to_jae": {
    label: "재능이 돈이 되는 구조",
    whyDetail: "만들고 표현하는 기운(식상)이 돈의 기운(재성)으로 이어지는 흐름이 있습니다. 머릿속 아이디어보다 '보여 줄 수 있는 결과물'이 생길 때 수입으로 연결되기 쉬운 구조예요.",
    howSteps: ["잘하는 것을 3줄 소개와 가격이 있는 작은 상품으로 정리해 보세요.", "결과물을 꾸준히 공개할 채널을 하나 정하세요.", "무료로 해 주던 일 중 하나에 처음으로 가격을 붙여 보세요."]
  },
  "wealth.bigeop_outflow": {
    label: "사람 사이로 새는 돈",
    whyDetail: "나와 같은 기운(비겁)이 많으면 친구·동료와 나누거나 경쟁하는 일이 잦습니다. 의리와 자존심이 지출로 이어지기 쉬워서, 버는 것보다 지키는 쪽이 과제가 되는 구조예요.",
    howSteps: ["함께 쓰는 돈과 내 돈의 통장을 분리하세요.", "빌려주는 돈은 '돌려받지 못해도 괜찮은 금액'까지만 정해 두세요.", "모임·선물 예산을 한 달 단위로 미리 정해 두세요."]
  },
  "wealth.inseong_slow": {
    label: "충분히 생각하고 움직임",
    whyDetail: "생각과 배움의 기운(인성)이 많으면 돈 앞에서 검토가 길어집니다. 큰 실수는 적지만, 확신이 들 때까지 기다리다 좋은 타이밍이 지나가기도 해요.",
    howSteps: ["결정 기한을 먼저 정하고, 기한이 오면 작은 규모로라도 실행하세요.", "검토할 항목을 5개 이하로 줄인 나만의 체크리스트를 만드세요.", "공부한 내용을 실제 소액 실험 하나로 연결해 보세요."]
  },
  // ── 연애 ─────────────────────────────────────────────
  "love.star.none": {
    label: "삶이 먼저 자리 잡는 연애",
    whyDetail: "배우자를 뜻하는 별이 잘 보이지 않으면 연애가 삶의 중심에 오기보다 내 일과 일상이 안정된 뒤 인연이 자연스럽게 따라오는 경향이 있습니다. 서두를수록 오히려 어긋나기 쉬운 구조예요.",
    howSteps: ["좋아하는 활동을 하는 모임에 꾸준히 나가 자연스러운 만남의 기회를 늘리세요.", "호감이 생기면 '표현 한 번'을 작은 목표로 정하세요.", "연애를 미루는 이유가 시간인지 마음인지 한 번 적어 보세요."]
  },
  "love.star.present": {
    label: "안정적으로 이어 가는 힘",
    whyDetail: "배우자를 뜻하는 별이 적당히 자리 잡고 있어 관계를 시작하고 이어 가는 힘이 고르게 있습니다. 편안함이 장점이지만, 익숙해지면 표현이 줄어드는 것이 과제가 될 수 있어요.",
    howSteps: ["한 달에 한 번은 처음 가 보는 곳에서 데이트해 보세요.", "고마운 점을 말로 전하는 횟수를 의식적으로 늘리세요.", "서운한 일은 쌓아 두지 말고 그 주 안에 이야기하세요."]
  },
  "love.star.many": {
    label: "관심을 받는 매력",
    whyDetail: "배우자를 뜻하는 별이 여러 번 보여 사람의 관심이 모이기 쉬운 구조입니다. 선택지가 많다는 건 장점이지만, 기준이 없으면 마음이 이리저리 흔들릴 수 있어요.",
    howSteps: ["나에게 꼭 맞아야 하는 조건 3가지를 미리 적어 두세요.", "관심을 받을 때 바로 답하기보다 하루 생각해 보는 여유를 가지세요.", "오래 만나고 싶은 사람의 공통점을 지난 관계에서 찾아보세요."]
  },
  "love.star.crowded": {
    label: "선택이 어려운 구조",
    whyDetail: "인연의 별이 겹치면 좋은 사람이 여럿 보여 결정을 미루기 쉽습니다. 고민이 길어질수록 상대도 지칠 수 있다는 점이 이 구조의 숙제예요.",
    howSteps: ["결정을 내릴 날짜를 스스로 정해 두세요.", "비교 대신 '이 사람과 1년 뒤 모습'을 각각 상상해 보세요.", "애매한 관계는 정중하게 선을 긋는 문장을 미리 준비해 두세요."]
  },
  "love.expression": {
    label: "표현으로 분위기를 만듦",
    whyDetail: "표현의 기운(식상)이 있어 마음을 말과 행동으로 꺼내는 데 능숙합니다. 분위기를 잘 만드는 대신, 말이 앞서 상대가 부담을 느끼는 순간도 생길 수 있어요.",
    howSteps: ["대화에서 내가 말한 시간과 들은 시간을 한 번 비교해 보세요.", "중요한 이야기는 표현보다 질문으로 시작해 보세요.", "기념일보다 평범한 날의 작은 표현을 늘려 보세요."]
  },
  "love.daybranch.combine": {
    label: "가까울수록 깊어지는 정",
    whyDetail: "배우자 자리(일지)가 다른 글자와 합을 이뤄 가까운 사람에게 정이 깊게 붙는 구조입니다. 정이 깊은 만큼 서운함도 크게 느껴질 수 있어요.",
    howSteps: ["서운한 마음은 그날 안에 짧게라도 말해 보세요.", "상대의 개인 시간을 존중하는 약속을 하나 정하세요.", "함께하는 루틴(산책·식사)을 하나 만들어 관계를 단단하게 하세요."]
  },
  "love.daybranch.clash": {
    label: "자극과 변화가 많은 관계",
    whyDetail: "배우자 자리(일지)에 충이 있어 가까운 관계에 변화와 부딪힘이 생기기 쉽습니다. 지루함과는 거리가 멀지만, 감정이 격해질 때 거리를 조절하는 기술이 필요해요.",
    howSteps: ["다툼이 시작되면 10분 쉬었다 다시 이야기하는 규칙을 정하세요.", "결론보다 감정을 먼저 정리해서 말해 보세요.", "서로 다른 점을 '틀림'이 아니라 '역할'로 나눠 보세요."]
  },
  "love.bigeop_pride": {
    label: "자존심이 먼저 나서는 순간",
    whyDetail: "나와 같은 기운(비겁)이 강하면 관계에서도 지기 싫은 마음이 먼저 나섭니다. 먼저 다가가거나 사과하는 일이 어려워 기회를 놓치기 쉬운 구조예요.",
    howSteps: ["'누가 먼저'보다 '언제 풀까'를 기준으로 생각해 보세요.", "사과 문장을 짧게 미리 정해 두세요.", "이기는 대화 대신 이어지는 대화를 목표로 하세요."]
  },
  // ── 직업 ─────────────────────────────────────────────
  "career.gwan.none": {
    label: "자율에서 힘이 나는 타입",
    whyDetail: "조직과 규칙의 기운(관성)이 약하면 위에서 정해 주는 틀보다 스스로 정한 방식에서 힘이 납니다. 통제가 강한 환경에서는 실력보다 답답함이 먼저 드러날 수 있어요.",
    howSteps: ["지금 일에서 내가 스스로 정할 수 있는 영역을 하나 넓혀 보세요.", "프로젝트형·성과형 업무에 지원해 보세요.", "규칙이 많은 환경이라면 '왜 이 규칙인지'를 먼저 이해하고 받아들이세요."]
  },
  "career.gwan.present": {
    label: "역할에서 인정받음",
    whyDetail: "관성이 적당히 있어 책임과 역할이 분명할수록 실력이 잘 보입니다. 기대에 맞춰 성실하게 해내는 힘이 커리어의 기반이 되는 구조예요.",
    howSteps: ["맡은 일의 결과를 숫자나 사례로 기록해 두세요.", "분기마다 상사·동료에게 피드백을 한 번 요청하세요.", "다음 단계 역할에 필요한 능력 하나를 정해 준비하세요."]
  },
  "career.gwan.many": {
    label: "일복이 많은 구조",
    whyDetail: "관성이 여러 번 겹쳐 책임과 역할이 계속 들어옵니다. 능력이 있다는 뜻이지만, 거절하지 못하면 중요한 일과 덜 중요한 일이 섞여 지치기 쉬워요.",
    howSteps: ["이번 달 가장 중요한 책임 3가지를 정하고 나머지는 위임해 보세요.", "새 업무를 받을 때 기존 업무 중 내려놓을 것을 함께 이야기하세요.", "일정표에 쉬는 시간을 먼저 적어 두세요."]
  },
  "career.gwan.pressure": {
    label: "압박을 크게 느낌",
    whyDetail: "관성이 많으면 기대와 평가에 민감해집니다. 책임감이 강한 만큼 혼자 부담을 떠안아 실제보다 일을 더 무겁게 느끼기 쉬운 구조예요.",
    howSteps: ["감당 가능한 범위를 먼저 말하는 연습을 해 보세요.", "걱정되는 일을 '내가 바꿀 수 있는 것/없는 것'으로 나눠 적어 보세요.", "주 1회는 일과 완전히 떨어진 시간을 확보하세요."]
  },
  "career.jeonggwan": {
    label: "원칙과 신뢰",
    whyDetail: "정관은 바른 규칙과 신뢰를 뜻합니다. 약속을 지키고 원칙대로 일하는 모습이 시간이 갈수록 평판으로 쌓이는 구조예요.",
    howSteps: ["마감과 약속을 지킨 기록을 포트폴리오처럼 모아 두세요.", "원칙이 부딪히는 상황에서는 기준을 문서로 남겨 두세요.", "신뢰를 쌓은 사람에게 추천을 부탁해 보세요."]
  },
  "career.pyeongwan": {
    label: "위기에서 드러나는 실력",
    whyDetail: "편관은 압박·경쟁·위기를 뜻합니다. 평온할 때보다 어려운 상황에서 집중력이 올라가 실력이 드러나는 구조예요.",
    howSteps: ["도전적인 과제를 일부러 하나 맡아 보세요.", "위기 때 잘 해낸 경험을 이력서 문장으로 정리하세요.", "긴장된 상태가 오래가지 않도록 회복 루틴을 정해 두세요."]
  },
  "career.inseong_expertise": {
    label: "배운 만큼 넓어지는 커리어",
    whyDetail: "인성은 배움·자격·전문성을 뜻합니다. 공부한 것이 곧 경쟁력이 되는 구조라, 지식을 눈에 보이는 형태로 남길수록 기회가 넓어져요.",
    howSteps: ["관심 분야의 자격이나 인증 하나를 목표로 정하세요.", "배운 내용을 글이나 발표로 정리해 공개해 보세요.", "가르치는 역할을 맡아 전문성을 단단하게 만드세요."]
  },
  "career.gwan_in": {
    label: "실력이 자리로 이어짐",
    whyDetail: "책임(관성)과 배움(인성)이 이어지는 '관인상생' 흐름이 있습니다. 공부한 것이 조직 안에서 인정으로, 인정이 다시 더 큰 역할로 이어지는 순환이 만들어지기 쉬워요.",
    howSteps: ["배운 것을 지금 업무에 적용한 사례를 하나 만들어 보세요.", "조직 안에서 그 분야 담당자가 되겠다고 먼저 제안해 보세요.", "멘토 한 명을 정해 정기적으로 조언을 구하세요."]
  },
  // ── 사업 ─────────────────────────────────────────────
  "business.siksang.none": {
    label: "만들기보다 운영에 강함",
    whyDetail: "창작·표현의 기운(식상)이 약하면 무에서 새로 만드는 것보다 이미 있는 것을 안정적으로 운영하는 데 강합니다. 아이디어를 짜내느라 지치기보다 이미 자리 잡은 모델을 잘 굴리는 쪽이 맞는 구조예요.",
    howSteps: ["이미 자리 잡은 사업 모델 중 내가 잘 운영할 수 있는 것을 찾아보세요.", "아이디어를 내는 파트너와 역할을 나눠 보세요.", "운영 지표(재방문·재구매) 하나를 정해 매주 확인하세요."]
  },
  "business.siksang.present": {
    label: "결과물을 만드는 힘",
    whyDetail: "식상이 있어 무언가를 만들고 보여 주는 힘이 사업의 출발점이 됩니다. 완성도보다 공개 속도가 중요한 시기에 특히 강점이 살아나요.",
    howSteps: ["작은 결과물을 일주일에 하나씩 공개해 반응을 모아 보세요.", "반응이 좋았던 것만 골라 상품으로 다듬으세요.", "만드는 시간과 알리는 시간을 반반 나눠 써 보세요."]
  },
  "business.saengjae": {
    label: "만든 것이 수익이 됨",
    whyDetail: "만드는 힘(식상)이 돈(재성)으로 이어지는 '생재' 구조가 있어, 내 결과물에 가격을 붙였을 때 흐름이 생기기 쉽습니다. 가격을 정하지 않으면 능력이 봉사로만 남을 수 있어요.",
    howSteps: ["가장 반응이 좋은 결과물에 가격을 붙인 버전을 만들어 보세요.", "가격을 2~3단계로 나눠 반응을 비교하세요.", "판매 기록을 남겨 어떤 것이 팔리는지 패턴을 찾으세요."]
  },
  "business.opportunity": {
    label: "기회 포착이 빠름",
    whyDetail: "편재가 있어 시장의 틈과 타이밍을 빠르게 알아봅니다. 빨리 벌이는 만큼 정리하는 기준이 없으면 일이 동시에 많아지기 쉬운 구조예요.",
    howSteps: ["떠오른 기회를 메모해 두고 일주일 뒤에도 하고 싶은 것만 고르세요.", "새 일을 벌이기 전 끝낼 일 하나를 먼저 정리하세요.", "작게 시험해 볼 수 있는 최소 버전부터 시작하세요."]
  },
  "business.independence": {
    label: "내 판을 꾸리는 독립심",
    whyDetail: "나와 같은 기운(비겁)이 여럿 있어 남의 지시보다 내 판을 직접 꾸릴 때 의욕이 커집니다. 혼자 다 하려는 마음이 성장의 한계가 될 수 있는 구조이기도 해요.",
    howSteps: ["내가 꼭 해야 하는 일과 맡길 수 있는 일을 나눠 적어 보세요.", "반복되는 일 하나를 도구나 외주로 넘겨 보세요.", "의견이 다른 조언자를 한 명 곁에 두세요."]
  },
  "business.overload": {
    label: "감당 범위를 넘기 쉬움",
    whyDetail: "기회(재성)는 많은데 그것을 감당하는 일간의 힘이 상대적으로 약한 구조입니다. 욕심나는 일을 다 잡으면 체력과 시간이 먼저 바닥날 수 있어요.",
    howSteps: ["새 일을 시작하기 전 주당 쓸 수 있는 시간을 먼저 계산하세요.", "규모를 키우기 전 작은 단위로 한 번 끝까지 해 보세요.", "함께할 사람이나 도구를 먼저 확보하세요."]
  },
  "business.slow_start": {
    label: "준비가 긴 출발",
    whyDetail: "배움(인성)은 많고 실행(식상)은 약해 준비 기간이 길어지는 구조입니다. 완벽하게 준비하려다 시작 시점을 계속 미루기 쉬워요.",
    howSteps: ["완성도 70%에서 먼저 공개하는 규칙을 정하세요.", "준비 목록 중 지금 바로 할 수 있는 것 하나를 오늘 하세요.", "시작 날짜를 다른 사람에게 미리 알려 두세요."]
  }
});

// src/lib/interpretation/copy/characters.ts
var CHARACTERS = Object.freeze({
  갑: {
    id: "gap-pioneer",
    name: "성장형 개척자",
    emoji: "🌳",
    tagline: "가만히 있기보다 뻗어나가야 숨이 트이는 사람",
    traits: ["호기심이 많고 시작이 빠른 편", "곧게 밀고 나가는 추진력이 있는 편", "사람과 일을 키우는 데서 보람을 느끼는 편"],
    strengths: ["새로운 판을 여는 추진력", "꺾여도 다시 자라는 회복력", "주변 사람을 끌어주는 리더십"],
    cautions: ["벌려 놓은 일을 수습하는 속도가 늦을 수 있어요", "쉬는 법을 잊고 달리기 쉬워요"],
    keywords: ["성장", "시작", "확장"],
    moreTraits: ["목표가 생기면 눈빛이 달라지는 편", "정직하고 꾸밈이 적은 편"],
    moreStrengths: ["큰 방향을 잡는 기획력", "배운 것을 바로 써먹는 실천력"],
    moreCautions: ["고집이 세 보일 수 있어요"],
    lines: {
      wealth: "돈이 모이는 속도보다 자라는 속도가 먼저 눈에 띄는 타입이에요. 배우고 키우는 데 쓰는 돈이 많은 편이에요.",
      love: "마음이 열리면 깊이 챙기는 편이에요. 함께 성장하는 느낌을 주는 사람과 오래 가는 쪽이에요.",
      career: "정해진 틀보다 내가 키워 갈 영역이 있을 때 능력이 더 살아나는 편이에요.",
      business: "새 판을 짜는 초기 단계에서 특히 강한 타입이에요.",
      relationship: "사람을 키워 주고 끌어 주는 역할을 자연스럽게 맡는 편이에요."
    }
  },
  을: {
    id: "eul-connector",
    name: "끈질긴 연결자",
    emoji: "🌿",
    tagline: "부드럽게 휘어도 끝내 길을 내는 사람",
    traits: ["유연하게 상황에 맞추는 편", "관계 속에서 기회를 찾는 감각이 있는 편", "겉은 부드러워도 속은 끈질긴 편"],
    strengths: ["어떤 환경에도 적응하는 유연함", "사람과 사람을 잇는 연결력", "포기하지 않는 끈기"],
    cautions: ["남의 기준에 너무 맞추다 지칠 수 있어요", "싫은 걸 바로 말하지 못하고 쌓아 두기 쉬워요"],
    keywords: ["연결", "유연", "끈기"],
    moreTraits: ["눈치가 빠르고 분위기를 잘 읽는 편", "실리를 챙기는 영리함이 있는 편"],
    moreStrengths: ["틈을 찾아내는 생존 감각", "부드럽게 설득하는 화술"],
    moreCautions: ["결정을 남에게 미루기 쉬워요"],
    lines: {
      wealth: "혼자 크게 버는 것보다 사람과 정보를 이어서 돈이 들어오는 길을 만드는 타입이에요.",
      love: "상대에게 맞춰 주는 다정함이 있어요. 나를 존중해 주는 사람과 있을 때 가장 편안해져요.",
      career: "협업과 조율이 많은 자리에서 존재감이 커지는 편이에요.",
      business: "파트너십과 네트워크를 활용할 때 강점이 살아나는 타입이에요.",
      relationship: "모난 데 없이 두루두루 잘 어울리는 편이에요."
    }
  },
  병: {
    id: "byeong-igniter",
    name: "분위기 점화자",
    emoji: "☀️",
    tagline: "있기만 해도 판이 달아오르는 사람",
    traits: ["표현이 솔직하고 에너지가 높은 편", "숨기기보다 드러내는 쪽이 편한 편", "정이 많고 사람을 좋아하는 편"],
    strengths: ["주변을 밝히는 친화력", "망설임 없는 순발력", "사람을 움직이는 열정"],
    cautions: ["감정 기복이 겉으로 보일 수 있어요", "처음의 열기가 끝까지 식지 않게 관리가 필요해요"],
    keywords: ["열정", "표현", "사람"],
    moreTraits: ["주목받는 자리에서 힘이 나는 편", "뒤끝 없이 털어 내는 편"],
    moreStrengths: ["분위기를 바꾸는 존재감", "숨김없는 솔직함"],
    moreCautions: ["말이 앞서 약속을 과하게 할 수 있어요"],
    lines: {
      wealth: "사람과 분위기를 통해 버는 방식이 남다른 타입이에요. 기분 좋게 쓰는 지출도 같이 빨라질 수 있어요.",
      love: "좋아하면 티가 나는 편이에요. 솔직한 대화가 되는 사람과 있을 때 관계가 편안해져요.",
      career: "사람을 만나고 보여 주는 일에서 강점이 커지는 편이에요.",
      business: "브랜딩과 홍보처럼 '보이는' 영역에서 힘이 나는 타입이에요.",
      relationship: "모임의 중심에 서는 일이 잦은 편이에요."
    }
  },
  정: {
    id: "jeong-lantern",
    name: "다정한 등불",
    emoji: "🕯️",
    tagline: "가까운 사람부터 환하게 비추는 사람",
    traits: ["섬세하게 사람의 마음을 읽는 편", "조용하지만 따뜻한 존재감이 있는 편", "한 가지에 오래 집중하는 편"],
    strengths: ["상대를 세심하게 챙기는 배려", "깊게 파고드는 집중력", "은근히 오래 가는 열정"],
    cautions: ["서운한 마음을 속으로 오래 품기 쉬워요", "남을 챙기다 내 몫을 놓칠 수 있어요"],
    keywords: ["온기", "집중", "배려"],
    moreTraits: ["분위기와 감성에 민감한 편", "보이지 않는 곳에서 꼼꼼한 편"],
    moreStrengths: ["사람의 마음을 여는 공감력", "끝까지 지키는 의리"],
    moreCautions: ["예민해진 날은 혼자 동굴로 들어가기 쉬워요"],
    lines: {
      wealth: "크게 한 번보다 꾸준히 가꾸는 쪽이 잘 맞는 타입이에요. 소중한 사람에게 쓰는 돈에는 아낌이 없는 편이에요.",
      love: "한번 마음을 주면 오래 따뜻하게 지키는 편이에요. 작은 표현을 알아봐 주는 사람과 잘 맞아요.",
      career: "전문성과 디테일이 필요한 일에서 진가가 드러나는 편이에요.",
      business: "작게 시작해 단골을 만드는 방식에 강한 타입이에요.",
      relationship: "넓기보다 깊은 관계를 만드는 편이에요."
    }
  },
  무: {
    id: "mu-mediator",
    name: "묵직한 중재자",
    emoji: "⛰️",
    tagline: "흔들리는 판에서 중심을 잡아주는 사람",
    traits: ["신중하고 책임감이 강한 편", "잘 참고 쉽게 흔들리지 않는 편", "말보다 행동으로 보여 주는 편"],
    strengths: ["사람을 안심시키는 안정감", "한번 맡으면 끝까지 가는 신뢰", "쌓아 올리는 꾸준함"],
    cautions: ["변화에 반응하는 속도가 느릴 수 있어요", "속마음을 잘 말하지 않아 오해를 사기도 해요"],
    keywords: ["신뢰", "중심", "꾸준"],
    moreTraits: ["한번 정한 건 쉽게 바꾸지 않는 편", "넓게 품는 스타일인 편"],
    moreStrengths: ["위기에도 흔들리지 않는 담대함", "여러 사람을 묶는 포용력"],
    moreCautions: ["너무 오래 참다가 한 번에 터질 수 있어요"],
    lines: {
      wealth: "한 번에 크게보다 차곡차곡 쌓는 쪽이에요. 한번 쌓은 것이 잘 안 무너지는 타입에 가까워요.",
      love: "아무나 만나기보다 믿을 수 있는지를 오래 보는 편이에요. 한번 마음을 열면 꾸준히 가요.",
      career: "신뢰가 자산이 되는 환경에서 능력이 안정적으로 나오는 편이에요.",
      business: "규모를 천천히 단단하게 키우는 운영형에 가까워요.",
      relationship: "갈등이 생기면 중간에서 균형을 잡아 주는 편이에요."
    }
  },
  기: {
    id: "gi-gardener",
    name: "섬세한 살림꾼",
    emoji: "🌾",
    tagline: "보이지 않는 곳에서 판을 가꾸는 사람",
    traits: ["실속을 챙기며 차근차근 준비하는 편", "사람을 품고 돌보는 편", "현실 감각이 좋은 편"],
    strengths: ["필요한 것을 알아채는 관찰력", "살림과 일을 꾸려 가는 관리력", "사람을 편하게 해 주는 포용력"],
    cautions: ["걱정이 많아 결정을 미루기 쉬워요", "모두를 챙기려다 스스로 지칠 수 있어요"],
    keywords: ["실속", "관리", "포용"],
    moreTraits: ["계획을 세워야 마음이 놓이는 편", "겸손하고 튀지 않으려는 편"],
    moreStrengths: ["작은 것도 버리지 않는 알뜰함", "믿고 맡길 수 있는 성실함"],
    moreCautions: ["남의 평가에 쉽게 마음이 흔들릴 수 있어요"],
    lines: {
      wealth: "돈을 쓸 때도 실속을 따져 보는 쪽에 가까운 타입이에요.",
      love: "말보다 챙겨 주는 행동으로 마음을 보여 주는 편이에요. 편안함을 주는 사람과 잘 맞아요.",
      career: "관리·운영·기획처럼 판을 정돈하는 일에서 강점이 커지는 편이에요.",
      business: "작은 것부터 꼼꼼히 다지는 내실형 운영에 강한 편이에요.",
      relationship: "곁에 있으면 편한 사람이라는 말을 자주 듣는 편이에요."
    }
  },
  경: {
    id: "gyeong-challenger",
    name: "독립형 승부사",
    emoji: "⚔️",
    tagline: "혼자서도 판을 읽고 결정하는 사람",
    traits: ["판단이 빠르고 기준이 분명한 편", "군더더기 없이 핵심으로 가는 편", "의리를 중요하게 여기는 편"],
    strengths: ["망설이지 않는 결단력", "한 곳을 파고드는 집중력", "스스로 서는 독립심"],
    cautions: ["혼자 짊어지는 경향이 있어요", "말이 직설적으로 들릴 수 있어요"],
    keywords: ["결단", "독립", "기준"],
    moreTraits: ["불의를 보면 참지 못하는 편", "결과로 말하고 싶어 하는 편"],
    moreStrengths: ["단호하게 정리하는 추진력", "약속을 지키는 의리"],
    moreCautions: ["타협이 필요한 순간에 날이 서기 쉬워요"],
    lines: {
      wealth: "돈 앞에서도 기준이 분명한 타입이에요. 아닌 건 과감히 끊고, 그 과정에서 비용이 생기기도 해요.",
      love: "내가 납득할 수 있는 사람인가를 먼저 보는 타입이에요. 그래서 한번 정하면 오래 가는 쪽이에요.",
      career: "스스로 결정권을 가질 때 능력이 살아나는 편이에요.",
      business: "결단이 필요한 순간에 강한, 승부형 운영자에 가까워요.",
      relationship: "적은 수의 사람과 의리 있게 오래 가는 편이에요."
    }
  },
  신: {
    id: "sin-perfectionist",
    name: "예리한 완벽주의자",
    emoji: "💎",
    tagline: "디테일에서 차이를 만드는 사람",
    traits: ["감각이 예민하고 기준이 높은 편", "깔끔하게 정리된 상태를 좋아하는 편", "자존심이 강하고 품위를 중시하는 편"],
    strengths: ["작은 차이를 알아보는 안목", "결과물을 다듬는 완성도", "흐트러지지 않는 자기 관리"],
    cautions: ["스스로에게도 남에게도 엄격해지기 쉬워요", "작은 말에 오래 상처받을 수 있어요"],
    keywords: ["안목", "완성도", "섬세"],
    moreTraits: ["보이는 이미지와 스타일에 신경 쓰는 편", "잘하는 분야에서 인정받고 싶어 하는 편"],
    moreStrengths: ["원칙을 지키는 깔끔함", "말 한마디의 무게를 아는 신중함"],
    moreCautions: ["작은 실수에도 스스로를 몰아붙이기 쉬워요"],
    lines: {
      wealth: "아무 데나 쓰지 않고 가치 있는 것에 집중하는 타입이에요. 안목이 곧 돈이 되는 경우가 많아요.",
      love: "섬세한 만큼 배려를 알아봐 주는 사람에게 마음을 여는 편이에요.",
      career: "완성도와 전문성이 인정받는 자리에서 빛나는 편이에요.",
      business: "품질과 브랜드 가치를 쌓는 방식에 강한 타입이에요.",
      relationship: "아무하고나 친해지기보다 결이 맞는 사람을 고르는 편이에요."
    }
  },
  임: {
    id: "im-navigator",
    name: "큰물 항해사",
    emoji: "🌊",
    tagline: "흐름을 크게 읽고 멀리 가는 사람",
    traits: ["시야가 넓고 생각의 스케일이 큰 편", "자유롭게 움직일 때 힘이 나는 편", "포용력이 크고 낙천적인 편"],
    strengths: ["큰 그림을 보는 통찰", "막혀도 돌아 흐르는 적응력", "사람과 정보를 모으는 포용력"],
    cautions: ["관심사가 넓어 한곳에 머물기 어려울 수 있어요", "디테일을 놓치기 쉬워요"],
    keywords: ["통찰", "자유", "스케일"],
    moreTraits: ["새로운 경험과 여행을 좋아하는 편", "남의 시선보다 내 흐름을 따르는 편"],
    moreStrengths: ["판을 크게 키우는 확장력", "어떤 사람과도 섞이는 친화력"],
    moreCautions: ["시작한 일의 마무리를 남에게 넘기기 쉬워요"],
    lines: {
      wealth: "작게 아끼기보다 큰 흐름을 타서 버는 쪽에 가까운 타입이에요. 들어오고 나가는 폭이 큰 편이에요.",
      love: "구속보다 자유를 존중해 주는 관계에서 오래 가는 편이에요.",
      career: "넓은 무대, 이동과 교류가 많은 일에서 능력이 커지는 편이에요.",
      business: "판을 크게 보고 확장하는 전략가형에 가까워요.",
      relationship: "다양한 사람과 두루 연결되는 편이에요."
    }
  },
  계: {
    id: "gye-strategist",
    name: "유연한 전략가",
    emoji: "💧",
    tagline: "흐름을 읽고 돌아가는 길을 잘 찾는 사람",
    traits: ["관찰력이 좋고 생각이 깊은 편", "적응이 빠르고 눈치가 좋은 편", "속을 쉽게 드러내지 않는 편"],
    strengths: ["흐름을 먼저 읽는 통찰", "상황에 맞춰 바꾸는 유연함", "조용히 모으는 정보력"],
    cautions: ["생각이 많아 실행이 늦어질 수 있어요", "속을 잘 안 보여 거리감이 생기기도 해요"],
    keywords: ["통찰", "유연", "흐름"],
    moreTraits: ["감수성이 풍부하고 상상력이 좋은 편", "필요할 때만 조용히 움직이는 편"],
    moreStrengths: ["작은 신호를 놓치지 않는 감각", "상대의 마음을 헤아리는 섬세함"],
    moreCautions: ["걱정이 꼬리를 물어 잠을 설치기 쉬워요"],
    lines: {
      wealth: "돈이 오는 길을 정면보다 옆에서 찾는 타입이에요. 정보와 타이밍이 맞으면 의외로 크게 움직일 수 있어요.",
      love: "마음을 천천히 여는 편이에요. 혼자 있는 시간을 존중해 주는 사람과 잘 맞아요.",
      career: "정해진 답이 없는 문제를 푸는 환경에서 강점이 커지는 편이에요.",
      business: "틈새와 타이밍을 읽는 전략형에 가까워요.",
      relationship: "조용하지만 필요한 순간에 정확히 도움을 주는 편이에요."
    }
  }
});

// src/lib/interpretation/types.ts
var STAT_LABELS = Object.freeze({
  wealth: "재물력",
  love: "연애력",
  business: "사업력",
  career: "직업력",
  relationship: "인간관계",
  execution: "실행력",
  flow: "운의 흐름"
});

// src/lib/battle/battle.ts
var CHARACTER_BY_ID = new Map(Object.values(CHARACTERS).map((c) => [c.id, c]));
function hasBatchim(word) {
  const ch = Array.from(word).pop();
  if (!ch) return null;
  const code = ch.charCodeAt(0) - 44032;
  if (code < 0 || code > 11171) return /[0-9]/.test(ch) ? [0, 1, 3, 6, 7, 8].includes(Number(ch)) : null;
  return code % 28 !== 0;
}
function withJosa(word, pair) {
  const [withB, withoutB] = pair === "을/를" ? ["을", "를"] : pair === "와/과" ? ["과", "와"] : ["이", "가"];
  const b = hasBatchim(word);
  return b === null ? `${word}${withB}(${withoutB})` : `${word}${b ? withB : withoutB}`;
}

// src/server/premium/report.ts
var NEGATIVE_SIGNAL_IDS = /* @__PURE__ */ new Set([
  "wealth.jae.none",
  "wealth.bigeop_outflow",
  "wealth.inseong_slow",
  "love.star.none",
  "love.star.crowded",
  "love.daybranch.clash",
  "love.bigeop_pride",
  "career.gwan.none",
  "career.gwan.pressure",
  "business.siksang.none",
  "business.overload",
  "business.slow_start"
]);
var isNegative = (id) => NEGATIVE_SIGNAL_IDS.has(id);
var quoted = (label, pair) => `'${label}'${withJosa(label, pair).slice(label.length)}`;
function buildPremiumReport(productId, signalIds) {
  const domains = productDomains(productId);
  const order = Object.keys(DETAIL_COPY);
  const ids = order.filter((id) => signalIds.includes(id) && domains.includes(id.split(".")[0]) && PREMIUM_COPY[id]);
  const why = ids.map((id) => ({ label: DETAIL_COPY[id].label, text: PREMIUM_COPY[id].why ?? "", detail: DETAIL_COPY[id].whyDetail }));
  const how = ids.map((id) => ({ label: DETAIL_COPY[id].label, steps: [...DETAIL_COPY[id].howSteps] }));
  const pos = ids.filter((id) => !isNegative(id));
  const neg = ids.filter((id) => isNegative(id));
  const reversal = pos.length > 0 && neg.length > 0 ? `당신에게는 ${quoted(DETAIL_COPY[pos[0]].label, "와/과")} ${quoted(DETAIL_COPY[neg[0]].label, "이/가")} 함께 있어요. 같은 영역 안에서 서로 다른 방향의 힘이 작동하기 때문에, 한쪽만 보고 판단하면 스스로도 헷갈릴 수 있어요. 강점 쪽 힘을 쓰면서 아래 HOW 의 '${DETAIL_COPY[neg[0]].label}' 실천을 함께 챙기면 균형이 잡혀요.` : null;
  const firsts = [...neg, ...pos].map((id) => DETAIL_COPY[id].howSteps[0]);
  const rest = ids.flatMap((id) => DETAIL_COPY[id].howSteps.slice(1));
  const checklist = Array.from(/* @__PURE__ */ new Set([...firsts, ...rest])).slice(0, 5);
  return Object.freeze({
    productId,
    title: PRODUCTS[productId].name,
    summary: ids.map((id) => DETAIL_COPY[id].label),
    why,
    how,
    reversal,
    checklist,
    notIncluded: ["시기(대운·세운)별 흐름은 계산 엔진 준비 전이라 이 리포트에 포함되지 않아요."]
  });
}

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
    const res = await fetchFn(url, { ...init, headers: { ...headers, ...init.headers } });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  const one = (rows) => Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return {
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
function paymentsConfig(env = process.env) {
  const mode = env.PALJA_PAYMENTS_MODE ?? "off";
  if (mode !== "test" && mode !== "live") return { ok: false, status: 503, code: "PAYMENTS_DISABLED", message: "사주팔자PLAY Beta에서 준비 중인 기능입니다." };
  const secret = env.TOSS_SECRET_KEY ?? "";
  const supaUrl = env.SUPABASE_URL ?? "";
  const supaKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
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

// api-src/premium/report.ts
async function POST(request) {
  const cfg = paymentsConfig();
  if (!cfg.ok) return json(cfg.status, { code: cfg.code, message: cfg.message });
  const body = await readJson(request);
  if (!body) return json(400, { code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않아요." });
  const e = await findEntitlement(cfg.deps, { purchaseCode: body.purchaseCode, productId: body.productId, signalIds: body.signalIds });
  if (!e.ok) return json(e.status, { code: e.code, message: e.message });
  return json(200, { orderId: e.body.orderId, report: buildPremiumReport(e.body.productId, e.body.signalIds) });
}
export {
  POST
};
