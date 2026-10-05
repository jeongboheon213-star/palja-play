// 자동 생성 파일 (scripts/build-api.mjs). 직접 고치지 말고 api-src/ 를 수정하세요.

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

// src/lib/feedback/feedback.ts
var FEEDBACK_AREAS = ["personality", "wealth", "love", "career", "business", "relationship"];
var FEEDBACK_AREA_LABELS = Object.freeze({
  personality: "성격",
  wealth: "재물",
  love: "연애",
  career: "직업",
  business: "사업",
  relationship: "인간관계"
});

// src/server/admin/stats.ts
var FEEDBACK_COLUMNS = "id,result_id,created_at,source,engine_version,interpretation_version,score_version,character_id,time_known,boundary_risk,similarity,best_match,worst_match,worst_none,share_intent,comment";
var EVENT_COLUMNS = "created_at,name,session_id,result_id,props";
var PERIOD_DAYS = [1, 7, 30, 90, 365];
var KST_MS = 9 * 60 * 60 * 1e3;
function kstDate(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + KST_MS).toISOString().slice(0, 10) : null;
}
var pct = (n, d) => d > 0 ? Math.round(n / d * 1e3) / 10 : null;
var avg = (xs) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 100) / 100 : null;
var CHARACTER_NAMES = new Map(Object.values(CHARACTERS).map((c) => [c.id, `${c.emoji} ${c.name}`]));
var characterLabel = (id) => CHARACTER_NAMES.get(id) ?? id;
var AREA_LABELS = FEEDBACK_AREA_LABELS;
var LANDING_LABELS = { direct: "직접 방문", battle: "배틀 링크", "battle-legacy": "배틀 링크(예전 형식)", "battle-invalid": "잘못된 배틀 링크" };
var SHARE_LABELS = {
  sms: "문자",
  kakao: "카카오톡",
  "kakao-failed": "카카오톡(실패)",
  "web-share": "공유 시트",
  "web-share-failed": "공유 시트(실패)",
  qr: "QR 보기",
  "copy-clipboard": "링크 복사",
  "copy-execCommand": "링크 복사",
  "copy-manual": "링크 직접 복사"
};
var INTENT_LABELS = { yes: "공유할래요", maybe: "고민 중", no: "안 할래요", none: "응답 없음" };
var OUTCOME_LABELS = { win: "링크 받은 친구 승리", lose: "링크 보낸 사람 승리", draw: "무승부" };
var PRODUCTS = [
  { productId: "premium_money", label: "💰 재물 리포트" },
  { productId: "premium_love", label: "💕 연애 리포트" },
  { productId: "premium_career", label: "💼 직업·사업 리포트" }
];
function tally(keys, labels, order) {
  const m = /* @__PURE__ */ new Map();
  for (const k of order ?? []) m.set(k, 0);
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  const rows = [...m].map(([key, count]) => ({ key, label: labels[key] ?? key, count }));
  return order ? rows : rows.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
function group(rows, keyOf, labelOf) {
  const m = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const k = keyOf(r);
    m.set(k, [...m.get(k) ?? [], r.similarity]);
  }
  return [...m].map(([key, xs]) => ({ key, label: labelOf(key), count: xs.length, avgSimilarity: avg(xs) })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
var str = (v) => typeof v === "string" && v.length > 0 && v.length <= 60 ? v : null;
function buildDashboard(input) {
  const { feedback, events, now, days, source } = input;
  const from = new Date(now.getTime() - days * 864e5);
  const sessionsOf = (pred) => new Set(events.filter(pred).map((e) => e.session_id));
  const all = new Set(events.map((e) => e.session_id));
  const landing = sessionsOf((e) => e.name === "landing_view");
  const input_ = sessionsOf((e) => e.name === "input_start");
  const calc = sessionsOf((e) => e.name === "calculation_complete");
  const result = sessionsOf((e) => e.name === "result_view");
  const share = sessionsOf((e) => e.name === "share_click");
  const fb = sessionsOf((e) => e.name === "feedback_submit");
  const interest = sessionsOf((e) => e.name.endsWith("_interest"));
  const steps = [
    ["landing_view", "첫 화면 방문", landing],
    ["input_start", "입력 시작", input_],
    ["calculation_complete", "계산 완료", calc],
    ["result_view", "결과 보기", result],
    ["share_click", "배틀 공유", share],
    ["feedback_submit", "피드백 제출", fb]
  ];
  const top = steps[0][2].size;
  const funnel = steps.map(([key, label, s], i) => ({
    key,
    label,
    sessions: s.size,
    ofTop: pct(s.size, top),
    ofPrev: i === 0 ? null : pct(s.size, i <= 3 ? steps[i - 1][2].size : result.size)
    // 공유·피드백은 결과 본 사람 대비
  }));
  const dayMap = /* @__PURE__ */ new Map();
  const day = (d) => {
    let x = dayMap.get(d);
    if (!x) dayMap.set(d, x = { v: /* @__PURE__ */ new Set(), r: /* @__PURE__ */ new Set(), f: 0, s: /* @__PURE__ */ new Set() });
    return x;
  };
  for (let t = from.getTime(); t <= now.getTime() && days <= 366; t += 864e5) day(kstDate(new Date(t).toISOString()));
  day(kstDate(now.toISOString()));
  for (const e of events) {
    const d = kstDate(e.created_at);
    if (!d) continue;
    const x = day(d);
    x.v.add(e.session_id);
    if (e.name === "result_view") x.r.add(e.result_id ?? e.session_id);
    if (e.name === "share_click") x.s.add(e.session_id);
  }
  for (const f of feedback) {
    const d = kstDate(f.created_at);
    if (d) day(d).f++;
  }
  const daily = [...dayMap].map(([date, x]) => ({ date, visitors: x.v.size, results: x.r.size, feedback: x.f, shares: x.s.size })).sort((a, b) => a.date.localeCompare(b.date));
  const propOf = (name, key) => events.filter((e) => e.name === name).map((e) => str(e.props?.[key]) ?? "unknown");
  const shareEvents = events.filter((e) => e.name === "share_click");
  const results = new Set(events.filter((e) => e.name === "result_view").map((e) => e.result_id ?? e.session_id)).size;
  const sims = feedback.map((f) => f.similarity);
  const notes = [];
  if (feedback.length < 30) notes.push(`피드백이 ${feedback.length}건이라 비율·평균은 참고용이에요 (30건 이상부터 경향을 보기 좋아요).`);
  if (input.truncated) notes.push("데이터가 많아 일부만 집계했어요. 기간을 줄여서 다시 확인해 주세요.");
  if (source !== "production") notes.push(source === "all" ? "개발·테스트 기록이 함께 포함돼 있어요." : "개발·테스트 기록만 보고 있어요.");
  return {
    generatedAt: now.toISOString(),
    period: { from: from.toISOString(), to: now.toISOString(), days, source },
    truncated: !!input.truncated,
    totals: {
      visitors: all.size,
      results,
      feedback: feedback.length,
      feedbackRate: pct(fb.size, result.size),
      avgSimilarity: avg(sims),
      shareSessions: share.size,
      shareRate: pct(share.size, result.size),
      premiumInterestSessions: interest.size
    },
    funnel,
    daily,
    landingVia: tally(propOf("landing_view", "via"), LANDING_LABELS),
    shareMethods: tally(shareEvents.map((e) => str(e.props?.method) ?? "unknown"), SHARE_LABELS),
    shareDevices: tally(shareEvents.map((e) => str(e.props?.device) ?? "unknown"), { mobile: "휴대폰", pc: "PC" }),
    battleOutcomes: tally(
      events.filter((e) => e.name === "result_view" && str(e.props?.battleOutcome)).map((e) => str(e.props?.battleOutcome)),
      OUTCOME_LABELS
    ),
    premium: PRODUCTS.map((p) => ({
      ...p,
      clickSessions: sessionsOf((e) => e.name === `${p.productId}_click`).size,
      interestSessions: sessionsOf((e) => e.name === `${p.productId}_interest`).size
    })),
    feedback: {
      count: feedback.length,
      similarity: tally(sims.map(String), { "1": "1 전혀 아님", "2": "2", "3": "3 보통", "4": "4", "5": "5 완전 나" }, ["5", "4", "3", "2", "1"]),
      shareIntent: tally(feedback.map((f) => f.share_intent ?? "none"), INTENT_LABELS, ["yes", "maybe", "no", "none"]),
      bestMatch: tally(feedback.flatMap((f) => f.best_match ?? []), AREA_LABELS, FEEDBACK_AREAS),
      worstMatch: tally(feedback.flatMap((f) => f.worst_match ?? []), AREA_LABELS, FEEDBACK_AREAS),
      worstNone: feedback.filter((f) => f.worst_none).length,
      byCharacter: group(feedback, (f) => f.character_id, characterLabel),
      byTimeKnown: group(feedback, (f) => f.time_known ? "known" : "unknown", (k) => k === "known" ? "출생시간 입력" : "출생시간 모름"),
      byBoundary: group(feedback, (f) => f.boundary_risk ? "risk" : "normal", (k) => k === "risk" ? "절기 경계 안내 받음" : "일반"),
      byVersion: group(feedback, (f) => `${f.interpretation_version} / ${f.score_version}`, (k) => k),
      withComment: feedback.filter((f) => (f.comment ?? "").trim().length > 0).length
    },
    comments: feedback.filter((f) => (f.comment ?? "").trim().length > 0).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200).map((f) => ({ date: kstDate(f.created_at) ?? "", similarity: f.similarity, character: characterLabel(f.character_id), shareIntent: f.share_intent, comment: f.comment.trim() })),
    characters: tally(
      events.filter((e) => e.name === "result_view").map((e) => characterLabel(str(e.props?.characterId) ?? "unknown")),
      {}
    ),
    notes
  };
}
function feedbackCsv(rows) {
  const cell = (v) => {
    const s = Array.isArray(v) ? v.join("|") : v === null || v === void 0 ? "" : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = ["created_at_kst", "character", "similarity", "share_intent", "best_match", "worst_match", "worst_none", "time_known", "boundary_risk", "interpretation_version", "score_version", "comment"];
  const lines = rows.map(
    (r) => [
      r.created_at ? new Date(Date.parse(r.created_at) + KST_MS).toISOString().slice(0, 16).replace("T", " ") : "",
      characterLabel(r.character_id),
      r.similarity,
      r.share_intent,
      r.best_match ?? [],
      r.worst_match ?? [],
      r.worst_none,
      r.time_known,
      r.boundary_risk,
      r.interpretation_version,
      r.score_version,
      r.comment
    ].map(cell).join(",")
  );
  return [head.join(","), ...lines].join("\r\n");
}

// api-lib/admin.ts
import { createHash, timingSafeEqual } from "node:crypto";

// api-lib/env.ts
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
    const key = env[name];
    if (key && isSecret(key)) return { name, key };
  }
  return null;
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

// api-lib/admin.ts
var ADMIN_TOKEN_MIN_LENGTH = 24;
var MAX_ROWS = 5e4;
var PAGE = 1e3;
var digest = (s) => createHash("sha256").update(s, "utf8").digest();
async function checkAdmin(request, env, delay = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const expected = (env.ADMIN_DASHBOARD_TOKEN ?? "").trim();
  if (expected.length < ADMIN_TOKEN_MIN_LENGTH) return json(503, { code: "ADMIN_NOT_CONFIGURED", message: "운영자 페이지가 아직 설정되지 않았어요. Vercel 에 ADMIN_DASHBOARD_TOKEN 을 넣어 주세요." });
  const m = /^Bearer\s+(.+)$/.exec(request.headers.get("authorization") ?? "");
  const given = (m?.[1] ?? "").trim();
  if (!given || !timingSafeEqual(digest(given), digest(expected))) {
    await delay(700);
    return json(401, { code: "ADMIN_UNAUTHORIZED", message: "운영자 비밀번호가 맞지 않아요." });
  }
  return null;
}
function supabaseReadConfig(env) {
  const url = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = supabaseServerKey(env)?.key;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) return null;
  return { url, key };
}
async function readRows(cfg, table, fromIso, source, fetchFn = fetch) {
  const select = table === "beta_feedback" ? FEEDBACK_COLUMNS : EVENT_COLUMNS;
  const q = new URLSearchParams({ select, created_at: `gte.${fromIso}`, order: "created_at.asc" });
  if (source !== "all") q.set("source", `eq.${source}`);
  const headers = { apikey: cfg.key, ...cfg.key.startsWith("sb_") ? {} : { Authorization: `Bearer ${cfg.key}` } };
  const rows = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const res = await fetchFn(`${cfg.url}/rest/v1/${table}?${q}`, { headers: { ...headers, "Range-Unit": "items", Range: `${offset}-${offset + PAGE - 1}` } });
    if (!res.ok && res.status !== 416) throw new Error(`supabase ${table} ${res.status}`);
    if (res.status === 416) break;
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

// api-src/admin/stats.ts
async function POST(request) {
  const denied = await checkAdmin(request, process.env);
  if (denied) return noIndex(denied);
  const body = await readJson(request) ?? {};
  const days = PERIOD_DAYS.includes(body.days) ? body.days : 30;
  const source = body.source === "development" || body.source === "all" ? body.source : "production";
  const cfg = supabaseReadConfig(process.env);
  if (!cfg) return noIndex(json(503, { code: "STORAGE_NOT_CONFIGURED", message: "서버에 Supabase Secret Key(SUPABASE_SECRET_KEY)가 설정되지 않았어요." }));
  const now = /* @__PURE__ */ new Date();
  const fromIso = new Date(now.getTime() - days * 864e5).toISOString();
  try {
    const [fb, ev] = await Promise.all([
      readRows(cfg, "beta_feedback", fromIso, source),
      body.csv === true ? Promise.resolve({ rows: [], truncated: false }) : readRows(cfg, "beta_events", fromIso, source)
    ]);
    if (body.csv === true) return noIndex(json(200, { csv: feedbackCsv(fb.rows), count: fb.rows.length }));
    return noIndex(json(200, buildDashboard({ feedback: fb.rows, events: ev.rows, now, days, source, truncated: fb.truncated || ev.truncated })));
  } catch {
    console.error("[admin-stats]", JSON.stringify({ code: "STORAGE_READ_FAILED" }));
    return noIndex(json(503, { code: "STORAGE_READ_FAILED", message: "Supabase 에서 데이터를 읽지 못했어요. 잠시 후 다시 시도해 주세요." }));
  }
}
function noIndex(r) {
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  return r;
}
export {
  POST
};
