// Signal id → 문구. 문장은 반드시 Signal 이 있을 때만 쓰인다 (근거 없는 문장 금지).
//
// 필드
//  trait    핵심 성향       strength 강점       caution 주의점
//  section  영역 해석 문장  keyword  인생 키워드
//  revPos   반전 앞절 (positive 신호, "~지만," 으로 끝남)
//  revNeg   반전 뒷절 (negative 신호, 완결 문장)
//  element  오행 밸런스 설명
// 단정·예언·의료/투자 조언 표현을 쓰지 않는다.

export interface SignalCopy {
  readonly trait?: string;
  readonly strength?: string;
  readonly caution?: string;
  readonly section?: string;
  readonly keyword?: string;
  readonly revPos?: string;
  readonly revNeg?: string;
  readonly element?: string;
}

const ELEMENT_DOMINANT: Record<string, SignalCopy> = {
  목: { trait: "새로운 걸 배우고 키우는 데 끌리는 편", keyword: "성장", element: "목(木) 기운이 많아 뻗어 나가려는 힘, 시작하는 힘이 강하게 드러나요." },
  화: { trait: "감정과 생각을 밖으로 드러내는 편", keyword: "표현", element: "화(火) 기운이 많아 열정과 표현력이 앞에 서는 구조예요." },
  토: { trait: "버티고 지키는 힘이 강한 편", keyword: "안정", element: "토(土) 기운이 많아 중심을 잡고 쌓아 가는 힘이 두드러져요." },
  금: { trait: "옳고 그름의 기준이 분명한 편", keyword: "결단", element: "금(金) 기운이 많아 정리하고 결단하는 힘이 강하게 드러나요." },
  수: { trait: "겉으로 드러나는 것보다 생각이 깊은 편", keyword: "지혜", element: "수(水) 기운이 많아 생각과 관찰, 유연함이 앞에 서는 구조예요." },
};

const ELEMENT_MISSING: Record<string, SignalCopy> = {
  목: { element: "목(木)이 보이지 않아요. 새 일을 시작하는 힘은 환경과 사람에게서 빌려 오면 좋아요." },
  화: { element: "화(火)가 보이지 않아요. 마음을 표현하는 연습이 관계와 기회를 넓혀 줄 수 있어요." },
  토: { element: "토(土)가 보이지 않아요. 루틴과 기록처럼 중심을 잡아 주는 장치가 도움이 돼요." },
  금: { element: "금(金)이 보이지 않아요. 끊고 정리하는 결단이 필요한 순간을 의식해 보세요." },
  수: { element: "수(水)가 보이지 않아요. 쉬어 가며 생각을 정리하는 시간이 균형을 잡아 줘요." },
};

const BASE: Record<string, SignalCopy> = {
  // ── 성향 그룹 ────────────────────────────────────────
  "personality.group.비겁": { trait: "내 방식과 자존심이 뚜렷한 편", strength: "남에게 기대지 않는 자립심", keyword: "주체성" },
  "personality.group.식상": { trait: "아이디어와 말재주가 넘치는 편", strength: "생각을 결과물로 만드는 표현력", keyword: "창의" },
  "personality.group.재성": { trait: "현실 감각과 계산이 빠른 편", strength: "기회를 숫자로 바꾸는 현실 감각", keyword: "실속" },
  "personality.group.관성": { trait: "책임감과 원칙을 중요하게 여기는 편", strength: "맡은 일을 해내는 책임감", keyword: "책임" },
  "personality.group.인성": { trait: "배우고 생각하는 시간을 즐기는 편", strength: "깊이 이해하고 흡수하는 학습력", keyword: "배움" },
  "personality.strength.strong": { trait: "스스로 판단하고 밀고 나가는 힘이 큰 편" },
  "personality.strength.balanced": { trait: "상황에 따라 나서고 물러서는 균형 감각이 있는 편" },
  "personality.strength.weak": { trait: "혼자보다 함께일 때 힘이 커지는 편" },

  // ── 재물 ──────────────────────────────────────────────
  "wealth.jae.none": {
    section: "돈을 직접 쫓기보다 내가 가진 능력과 평판이 돈으로 바뀌는 구조에 가까워요.",
    caution: "돈 관리는 감보다 시스템(자동이체, 기록)에 맡기는 쪽이 편해요",
    revNeg: "돈 자체를 붙잡는 데는 큰 관심이 없는 편이에요.",
  },
  "wealth.jae.present": {
    section: "필요한 만큼 돈을 다룰 줄 아는 현실 감각이 있는 편이에요.",
    strength: "필요한 만큼은 챙기는 돈 감각",
    revPos: "돈을 다루는 현실 감각은 있지만,",
  },
  "wealth.jae.strong": {
    section: "돈과 기회를 알아보는 감각이 사주에 여러 번 드러나는 타입이에요.",
    strength: "돈이 되는 기회를 알아보는 감각",
    keyword: "재물 감각",
    revPos: "돈이 되는 기회는 잘 알아보지만,",
  },
  "wealth.pyeonjae": {
    section: "고정 수입보다 기회와 거래에서 크게 움직이는 돈과 인연이 있는 편이에요.",
    strength: "기회가 보이면 과감하게 움직이는 배짱",
    revPos: "돈 냄새를 맡으면 과감하게 움직이지만,",
  },
  "wealth.jeongjae": {
    section: "꾸준히 들어오는 돈을 차곡차곡 관리하는 성향도 함께 있어요.",
    strength: "꾸준히 모으는 성실한 돈 관리",
    revPos: "꾸준히 모으는 성실함이 있지만,",
  },
  "wealth.siksang_to_jae": {
    section: "재능과 아이디어가 돈으로 이어지는 흐름이 보여요. 잘하는 걸 상품으로 만들 때 힘이 나요.",
    strength: "재능을 돈으로 바꾸는 연결력",
    keyword: "재능 수익화",
    revPos: "잘하는 걸 돈으로 바꾸는 힘은 좋지만,",
  },
  "wealth.bigeop_outflow": {
    section: "사람을 챙기거나 경쟁하는 과정에서 돈이 나가는 길도 함께 열려 있어요.",
    caution: "의리로 빌려주거나 함께 쓰는 돈은 미리 선을 정해 두는 게 좋아요",
    revNeg: "들어온 돈은 사람과 경쟁 사이에서 쉽게 흩어지는 편이에요.",
  },
  "wealth.inseong_slow": {
    section: "돈 앞에서 충분히 생각하고 움직이는 편이라 속도는 느려도 큰 실수는 적은 편이에요.",
    caution: "생각만 하다 좋은 타이밍을 놓치지 않게 기준 날짜를 정해 보세요",
    revNeg: "막상 돈을 움직일 때는 오래 고민하는 편이에요.",
  },

  // ── 연애 ──────────────────────────────────────────────
  "love.star.none": {
    section: "연애가 삶의 1순위로 드러나기보다 내 일과 생활이 안정된 뒤에 인연이 자연스럽게 따라오는 구조예요.",
    caution: "관심 있는 사람에게도 표현이 늦어 기회를 놓칠 수 있어요",
    revNeg: "정작 연애는 천천히, 신중하게 시작하는 편이에요.",
  },
  "love.star.present": {
    section: "인연의 별이 적당히 자리 잡고 있어 관계를 안정적으로 이어 가는 힘이 있어요.",
    strength: "관계를 안정적으로 이어 가는 힘",
    revPos: "인연을 만들고 이어 가는 힘은 있지만,",
  },
  "love.star.many": {
    section: "인연의 별이 여러 번 보여 사람의 관심을 받기 쉬운 타입이에요.",
    strength: "자연스럽게 호감을 사는 매력",
    keyword: "매력",
    revPos: "주변의 관심은 잘 받는 편이지만,",
  },
  "love.star.crowded": {
    section: "선택지가 많을수록 오히려 고민이 길어질 수 있어요.",
    caution: "여러 관계 사이에서 확실한 선을 긋는 게 중요해요",
    revNeg: "한 사람을 고르는 순간에는 고민이 길어지는 편이에요.",
  },
  "love.expression": {
    section: "말과 표현으로 마음을 전하는 능력이 있어 연애에서 분위기를 잘 만드는 편이에요.",
    strength: "마음을 말로 전하는 표현력",
    revPos: "마음을 표현하는 데는 능숙하지만,",
  },
  "love.daybranch.combine": {
    section: "배우자 자리(일지)가 다른 글자와 합을 이뤄 가까운 관계에서 정을 붙이는 힘이 있어요.",
    strength: "가까운 사람과 정을 쌓는 힘",
    revPos: "가까워진 사람과는 정이 깊게 들지만,",
  },
  "love.daybranch.clash": {
    section: "배우자 자리(일지)에 충이 있어 관계에 변화와 자극이 많은 편이에요. 지루함보다 역동이 맞는 타입이에요.",
    caution: "가까운 사이일수록 감정이 부딪힐 때 잠깐 거리를 두는 게 좋아요",
    revNeg: "가까운 사이에서는 부딪힘과 변화도 함께 겪는 편이에요.",
  },
  "love.bigeop_pride": {
    section: "자존심이 강해 먼저 숙이기 어려운 순간이 생길 수 있어요.",
    caution: "연애에서 이기고 지는 문제로 만들지 않는 게 포인트예요",
    revNeg: "자존심 때문에 먼저 다가가는 건 어려워하는 편이에요.",
  },

  // ── 직업 ──────────────────────────────────────────────
  "career.gwan.none": {
    section: "정해진 조직의 틀보다 자율과 재량이 있는 환경에서 더 편안한 편이에요.",
    caution: "규칙이 많은 환경에서는 쉽게 답답함을 느낄 수 있어요",
    revNeg: "위에서 정해 주는 규칙과 통제는 답답해하는 편이에요.",
  },
  "career.gwan.present": {
    section: "책임과 역할이 분명한 자리에서 인정받는 힘이 있어요.",
    strength: "조직 안에서 인정받는 책임감",
    revPos: "맡은 역할에서는 인정받는 편이지만,",
  },
  "career.gwan.many": {
    section: "책임과 역할이 여러 겹으로 들어오는 구조라 일복이 많은 편이에요.",
    strength: "여러 역할을 소화하는 능력",
    revPos: "여러 책임을 소화해 내는 힘은 있지만,",
  },
  "career.gwan.pressure": {
    section: "기대와 책임이 한꺼번에 몰리면 부담을 크게 느낄 수 있어요.",
    caution: "맡을 수 있는 범위를 미리 말해 두는 연습이 필요해요",
    revNeg: "책임이 몰리면 혼자 부담을 크게 느끼는 편이에요.",
  },
  "career.jeonggwan": {
    section: "원칙과 신뢰를 지키는 모습이 커리어의 무기가 되는 편이에요.",
    strength: "원칙을 지키는 신뢰감",
    keyword: "신뢰",
  },
  "career.pyeongwan": {
    section: "위기나 압박 속에서 오히려 실력이 드러나는 승부형 기질이 있어요.",
    strength: "압박 속에서 버티는 승부 근성",
    keyword: "승부",
  },
  "career.inseong_expertise": {
    section: "배우고 쌓은 지식이 곧 경쟁력이 되는 구조예요. 자격·전문성 쪽과 잘 맞아요.",
    strength: "공부한 만큼 쌓이는 전문성",
  },
  "career.gwan_in": {
    section: "책임(관)과 배움(인)이 이어지는 흐름이 있어 실력으로 자리를 넓혀 가는 커리어형이에요.",
    strength: "실력으로 자리를 넓히는 커리어 흐름",
    keyword: "전문가",
  },

  // ── 사업 ──────────────────────────────────────────────
  "business.siksang.none": {
    section: "새 아이디어를 쏟아내기보다 이미 자리 잡은 방식을 안정적으로 운영하는 쪽이 잘 맞아요.",
    caution: "새로 시작할 때는 아이디어 파트너를 두면 좋아요",
    revNeg: "새 아이템을 처음부터 만드는 건 부담스러워하는 편이에요.",
  },
  "business.siksang.present": {
    section: "만들고 표현하는 힘이 있어 나만의 콘텐츠나 상품을 만드는 데 강점이 있어요.",
    strength: "나만의 결과물을 만드는 생산력",
    revPos: "새로운 걸 만들어 내는 힘은 좋지만,",
  },
  "business.saengjae": {
    section: "만든 것이 돈으로 이어지는 '생재' 흐름이 보여 사업 감각이 드러나는 편이에요.",
    strength: "만든 것을 수익으로 잇는 사업 감각",
    keyword: "사업 감각",
    revPos: "만든 것을 돈으로 잇는 감각은 있지만,",
  },
  "business.opportunity": {
    section: "기회를 포착해 빠르게 판을 벌이는 감각이 있어요.",
    strength: "기회를 빠르게 포착하는 감각",
    revPos: "기회를 보면 빠르게 판을 벌이지만,",
  },
  "business.independence": {
    section: "누군가의 지시보다 내 판을 직접 꾸릴 때 의욕이 커지는 독립형이에요.",
    strength: "내 판을 직접 꾸리는 독립심",
    revPos: "내 판을 직접 꾸리려는 의욕은 크지만,",
  },
  "business.overload": {
    section: "기회는 많은데 감당할 힘이 따라가지 못하는 순간이 생길 수 있는 구조예요.",
    caution: "욕심나는 기회일수록 감당 가능한 규모부터 시작하는 게 좋아요",
    revNeg: "벌인 일이 내 체력과 시간을 넘기기 쉬운 편이에요.",
  },
  "business.slow_start": {
    section: "준비와 공부가 길어져 시작이 늦어지는 경향이 있어요.",
    caution: "완벽하게 준비되기 전에 작게 먼저 시작해 보는 게 도움이 돼요",
    revNeg: "시작 버튼을 누르기까지는 시간이 오래 걸리는 편이에요.",
  },

  // ── 인간관계 ─────────────────────────────────────────
  "relationship.harmony": {
    section: "사주 안의 글자들이 서로 합을 이뤄 사람과 잘 어울리고 인연을 맺는 힘이 있어요.",
    strength: "사람과 자연스럽게 어울리는 친화력",
    keyword: "인연",
    revPos: "사람들과 어울리는 힘은 좋지만,",
  },
  "relationship.friction": {
    section: "글자끼리 부딪히는 충이 있어 관계에 긴장과 변화가 생기기 쉬운 편이에요.",
    caution: "의견이 부딪힐 때 바로 반응하기보다 한 템포 쉬어 가는 게 좋아요",
    revNeg: "부딪히는 상황에서는 쉽게 물러서지 않는 편이에요.",
  },
  "relationship.sensitivity": {
    section: "사소한 말이나 상황에 예민하게 반응하는 순간이 생길 수 있어요.",
    caution: "작은 서운함을 오래 쌓아 두지 않는 게 좋아요",
    revNeg: "사소한 말에는 생각보다 오래 신경 쓰는 편이에요.",
  },
  "relationship.peers": {
    section: "또래·동료와 어울리는 힘이 있어 같이 하는 일에서 에너지를 얻는 편이에요.",
    strength: "동료와 함께 가는 팀워크",
    revPos: "친구와 동료는 많은 편이지만,",
  },
  "relationship.support": {
    section: "필요한 순간에 도와주는 사람이 곁에 있는 구조예요.",
    strength: "도움을 받고 또 나누는 인복",
    keyword: "인복",
    revPos: "주변의 도움을 받는 복은 있지만,",
  },
  "relationship.sharp_words": {
    section: "말이 날카롭게 전달되는 순간이 있을 수 있어요.",
    caution: "맞는 말이라도 전하는 방식을 한 번 다듬어 보면 좋아요",
    revNeg: "할 말은 하는 성격이라 말이 날카롭게 들리기도 해요.",
  },
  "relationship.independent": {
    section: "글자끼리 크게 얽히지 않아 사람과 적당한 거리를 두며 관계를 꾸리는 편이에요.",
    keyword: "적당한 거리",
  },

  // ── 실행력 ───────────────────────────────────────────
  "execution.strong_self": {
    strength: "스스로 밀고 나가는 실행력",
    revPos: "한번 마음먹으면 밀어붙이는 힘이 있지만,",
  },
  "execution.needs_support": {
    caution: "혼자 다 하려 하기보다 함께할 사람을 찾으면 실행이 쉬워져요",
    revNeg: "혼자서는 시작의 힘이 약해질 때가 있어요.",
  },
  "execution.balanced": { strength: "상황에 맞게 속도를 조절하는 균형감", revPos: "속도 조절은 잘하는 편이지만," },
  "execution.output": { strength: "생각을 바로 행동으로 옮기는 출력", revPos: "생각을 행동으로 옮기는 건 빠르지만," },
  "execution.pressure_drive": { strength: "마감과 압박에서 오히려 강해지는 집중력", revPos: "압박이 오면 오히려 힘을 내지만," },
  "execution.overthink": {
    caution: "생각이 길어질수록 첫 행동을 작게 정해 두는 게 좋아요",
    revNeg: "생각이 많아 첫발을 떼기까지 오래 걸리는 편이에요.",
  },
  "execution.yang_energy": { strength: "에너지가 바깥으로 뻗는 활동력", revPos: "에너지가 넘쳐 활동적이지만," },

  // ── 운의 흐름 (타고난 성향) ─────────────────────────
  "flow.balanced": { strength: "오행이 고르게 갖춰진 균형", keyword: "균형", revPos: "오행이 고르게 갖춰진 편이지만," },
  "flow.one_missing": { keyword: "채움" },
  "flow.skewed": {
    caution: "부족한 기운을 채워 주는 사람·환경을 곁에 두면 흐름이 편해져요",
    revNeg: "한쪽 기운으로 쏠려 있어 컨디션의 기복이 생기기 쉬워요.",
  },
  "flow.connections": { strength: "인연과 기회가 이어지는 연결의 흐름", revPos: "인연이 이어지는 흐름은 좋지만," },
  "flow.turbulence": {
    caution: "변화가 많을 때일수록 기본 루틴을 지키는 게 좋아요",
    revNeg: "삶의 국면이 바뀌는 변화도 자주 겪는 편이에요.",
  },
  "flow.partial_data": {},
};

const all: Record<string, SignalCopy> = { ...BASE };
for (const [e, c] of Object.entries(ELEMENT_DOMINANT)) all[`personality.element.dominant.${e}`] = c;
for (const [e, c] of Object.entries(ELEMENT_MISSING)) all[`personality.element.missing.${e}`] = c;

export const SIGNAL_COPY: Readonly<Record<string, SignalCopy>> = Object.freeze(all);

/** 영역 해석 제목 */
export const SECTION_TITLES = Object.freeze({
  wealth: "돈에서는 이런 특징이 있어요",
  love: "연애에서는?",
  career: "직업에서는?",
  business: "사업에서는?",
  relationship: "사람 사이에서는?",
});
