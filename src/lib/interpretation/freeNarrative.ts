// 무료 WHAT 전용. 기존 Signals/Features의 의미를 통합한다. 점수·새 명리 규칙을 만들지 않는다.
import { STEM_ELEMENT } from "../saju/ganji";
import { TEN_GOD_GROUP, type SajuData } from "../saju/chart";
import type { PillarPosition } from "../saju/types";
import { CHARACTERS } from "./copy/characters";
import { SECTION_TITLES, SIGNAL_COPY } from "./copy/signalCopy";
import { extractFeatures } from "./features";
import type { ReadingItem, ReadingSection } from "./free";
import type { SignalSet } from "./signals";
import type { Domain, Score, Signal } from "./types";
import { freeStyle } from "./freeStyle";

const POS: Record<PillarPosition, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };
const GROUPS = ["비겁", "식상", "재성", "관성", "인성"] as const;
const DOMAINS = ["wealth", "love", "career", "business", "relationship"] as const;

export interface FreeEvidence {
  readonly domain: Domain;
  readonly title: string;
  readonly facts: readonly string[];
}

/** 표시되는 실제 선택 근거와 해당 분야 점수 기여를 구분한다. 점수 62는 base가 아니라 변환식 중앙값이다. */
export function freeEvidence(set: SignalSet, items: readonly ReadingItem[], domain: Domain, title: string, score?: Score): FreeEvidence {
  const ids = new Set(items.flatMap((i) => i.signalIds));
  const chosen = set.signals.filter((s) => ids.has(s.id));
  const readable = (text: string) => text.replace(/일간 힘 지표 strong/g, "서비스용 힘 지표 주도형").replace(/일간 힘 지표 balanced/g, "서비스용 힘 지표 균형형").replace(/일간 힘 지표 weak/g, "서비스용 힘 지표 보완형");
  const facts = [...new Set(chosen.flatMap((s) => s.evidence.map((e) => readable(e.detail))))];
  if (score) {
    facts.push(`이 분야 지표: ${score.value}점 (전통 사주의 절대 측정값이 아닌 PLAY 지표)`);
    for (const s of set.signals.filter((s) => s.domain === domain)) {
      const contribution = s.polarity === "neutral" ? "0" : `${s.polarity === "positive" ? "+" : "−"}${s.strength}`;
      facts.push(`${s.evidence.map((e) => readable(e.detail)).join(" / ")} → 변환 전 기여 ${contribution}`);
    }
  }
  return { domain, title, facts };
}

export function buildFreeNarrative(d: SajuData, set: SignalSet, scores: readonly Score[]) {
  const f = extractFeatures(d);
  const g = f.groupCount;
  const tg = (name: keyof typeof f.tenGodCount) => f.tenGodCount[name] ?? 0;
  const ch = CHARACTERS[d.dayMaster!.stem];
  const dmId = `personality.daymaster.${d.dayMaster!.stem}`;
  const byId = new Map(set.signals.map((s) => [s.id, s]));
  const has = (id: string) => byId.has(id);
  const idsFor = (...domains: Domain[]) => set.signals.filter((s) => domains.includes(s.domain)).map((s) => s.id);
  const item = (text: string, ids: readonly string[]): ReadingItem => {
    const active = [...new Set(ids.filter((id) => byId.has(id)))];
    if (!active.length) throw new Error("무료 해석에 실제 근거가 필요합니다");
    return { text, signalIds: active };
  };
  const sectionItems: Record<string, ReadingItem[]> = {};
  const section = (domain: typeof DOMAINS[number], first: string, second: string, extra: readonly string[] = []): ReadingSection => {
    const ids = [...idsFor(domain), ...extra];
    const result = freeStyle(d, set, { domain, title: SECTION_TITLES[domain], score: scores.find((s) => s.stat === domain)!.value, items: [item(first, ids), item(second, ids)] });
    sectionItems[domain] = [result.summary!, ...result.items];
    return result;
  };

  const sections = DOMAINS.map(domain => section(domain, "", "", domain === "wealth" && g.재성 === 0 && g.식상 > 0 ? idsFor("business") : domain === "business" && g.재성 === 0 ? ["wealth.jae.none"] : []));

  // 성향: 일간 1개 + 실제 그룹/복합 특징을 우선. 결측시만 기존 일간 문구로 최소 개수를 보완한다.
  const traits: ReadingItem[] = [item(ch.traits[0]!, [dmId])];
  const add = (list: ReadingItem[], text: string, ids: readonly string[], max: number) => {
    if (list.length < max && !list.some((i) => i.text === text)) list.push(item(text, ids));
  };
  if (has("career.gwan_in")) add(traits, "맡은 일을 해내려는 마음과 충분히 이해하려는 성향이 함께 있어요.", ["career.gwan_in"], 7);
  if (has("business.independence") && g.식상 > 0) add(traits, "자기 방식으로 생각을 꺼내고 결과를 만들어 보고 싶어 하는 면이 있어요.", ["business.independence", "business.siksang.present"], 7);
  const groupText = {
    비겁: ["내 기준을 지키는 성향이 여러 자리에서 보여요.", "자기 판단을 앞세우는 특징이 명식 곳곳에서 반복돼요."],
    식상: ["생각을 말이나 결과물로 풀어내려는 성향이 여러 자리에 있어요.", "표현하고 만들어 내는 특징이 명식에서 특히 자주 나타나요."],
    재성: ["현실적인 성과와 돈의 쓰임을 의식하는 성향이 여러 자리에 있어요.", "돈과 성과를 의식하는 특징이 명식에서 특히 자주 나타나요."],
    관성: ["내가 맡은 역할과 지켜야 할 기준을 중요하게 여기는 편이에요.", "책임과 기준을 의식하는 특징이 명식 곳곳에서 반복돼요."],
    인성: ["바로 움직이기보다 배우고 납득하는 과정을 중시하는 편이에요.", "배우고 생각하는 특징이 명식에서 특히 자주 나타나요."],
  };
  for (const group of [...GROUPS].sort((a, b) => g[b] - g[a])) {
    if (has(`personality.group.${group}`)) add(traits, groupText[group][g[group] >= 4 ? 1 : 0]!, [`personality.group.${group}`], 7);
  }
  for (const e of f.dominantElements) add(traits, SIGNAL_COPY[`personality.element.dominant.${e}`]!.trait!, [`personality.element.dominant.${e}`], 7);
  for (const text of [...ch.traits.slice(1), ...ch.moreTraits]) if (traits.length < 5) add(traits, text, [dmId], 7);

  // 강점은 점수 기여가 큰 분야부터. 중복된 성향 신호가 실제 분야 근거를 밀어내지 않는다.
  const strengths: ReadingItem[] = [];
  const strengthText = {
    wealth: has("wealth.siksang_to_jae") ? "자신의 결과물과 현실적인 가치를 연결해 보는 감각" : tg("정재") && tg("편재") ? "꾸준한 관리와 새로운 기회를 함께 보는 재물 감각" : tg("편재") ? "새로운 거래와 가능성을 알아보는 감각" : "차곡차곡 쌓고 관리하는 재물 성향",
    love: has("love.expression") ? g.식상 >= 2 ? "마음을 여러 방식으로 드러내는 표현력" : "마음을 말과 행동으로 꺼내는 힘" : "가까운 관계를 의식하고 이어 가려는 마음",
    career: has("career.gwan_in") ? "배움으로 맡은 책임을 뒷받침하는 힘" : tg("정관") ? "맡은 역할을 꾸준히 지키는 책임감" : tg("편관") ? "어려운 과제에 맞서는 집중력" : "배우고 깊이 이해하려는 성향",
    business: has("business.independence") && g.식상 > 0 ? "내 방식으로 생각을 결과물로 꺼내는 힘" : has("business.saengjae") ? "아이디어를 실제 쓰임과 연결해 보는 힘" : g.식상 > 0 ? "생각을 밖으로 꺼내 결과물을 만드는 힘" : "자신의 방향을 정하려는 독립성",
    relationship: has("relationship.harmony") ? "사람 사이에서 공통점을 찾아 이어 가는 힘" : has("relationship.peers") ? "내 기준을 유지하면서 사람과 함께하는 힘" : "상대의 사정을 이해하려는 성향",
    execution: has("execution.overthink") ? "충분히 납득한 일에 힘을 모으는 성향" : has("execution.pressure_drive") ? "책임이 분명할 때 움직이는 힘" : "내가 받아들인 방향을 실행에 옮기는 힘",
    flow: "여러 기운이 겉으로 드러난 명식의 폭넓은 구성",
  };
  for (const score of [...scores].sort((a, b) => b.value - a.value)) {
    const positives = set.signals.filter((s) => s.domain === score.stat && s.polarity === "positive");
    const negatives = set.signals.filter((s) => s.domain === score.stat && s.polarity === "negative");
    // 낮은 지표를 강한 장점처럼 포장하지 않는다. 혼재/낮은 분야는 본문에서 읽는다.
    if (positives.length && score.value >= 60 && (score.stat !== "flow" || has("flow.balanced"))) {
      add(strengths, strengthText[score.stat], [...positives, ...negatives].map((s) => s.id), 7);
    }
  }
  for (const group of GROUPS) if (has(`personality.group.${group}`) && strengths.length < 5) add(strengths, SIGNAL_COPY[`personality.group.${group}`]!.strength!, [`personality.group.${group}`], 7);
  for (const text of [...ch.strengths, ...ch.moreStrengths]) if (strengths.length < 5) add(strengths, text, [dmId], 7);

  const cautions: ReadingItem[] = [];
  const cautionText: Record<string, string> = {
    "wealth.jae.none": g.식상 > 0 ? "표현하는 힘이 보이는 것과 돈을 관리하는 특징이 강한 것은 구분해서 볼 필요가 있어요." : "주요 해석 자리에서 재물 특징이 약하다는 결과를 실제 재산이나 돈에 대한 관심과 같은 뜻으로 읽지는 않아요.",
    "wealth.bigeop_outflow": has("wealth.siksang_to_jae") ? "결과물의 가치를 돈과 연결하는 힘이 있어도 내 뜻이나 사람 사이의 돈 문제에서는 남기는 힘이 분산될 수 있어요." : tg("정재") && tg("편재") ? "관리와 기회에 모두 관심이 가지만, 자기 판단을 앞세우는 면이 겹쳐 돈을 지키는 방식에는 차이가 생길 수 있어요." : g.비겁 >= 3 ? "내 기준이 여러 자리에 반복되어, 돈을 다루는 일에서도 자기 뜻을 쉽게 내려놓지 않을 수 있어요." : "돈을 다루는 감각과 내 뜻을 앞세우는 힘이 겹쳐, 버는 것과 남기는 것에 차이가 생길 수 있어요.",
    "wealth.inseong_slow": "돈에 관한 결정에서도 충분히 이해하려는 마음 때문에 생각이 길어질 수 있어요.",
    "love.star.none": "마음을 드러내는 방식만으로 가까운 관계의 깊이까지 판단하기는 어려워요.",
    "love.star.crowded": "관계에 관심을 쏟는 만큼 기대도 커져, 만족을 느끼는 기준이 높아질 수 있어요.",
    "love.daybranch.clash": "가까운 사이에서도 서로의 방식이 다르게 느껴질 수 있어요. 특정한 갈등을 뜻하지는 않아요.",
    "love.bigeop_pride": "가까운 사람을 소중히 여기는 마음과 내 기준을 내려놓는 것은 다르게 나타날 수 있어요.",
    "career.gwan.none": "정해진 역할에 맞추는 힘이 두드러지지 않아, 내 방식과 조직의 기준에 차이를 느낄 수 있어요.",
    "career.gwan.pressure": "책임감이 여러 자리에 나타나는 만큼 맡은 역할을 스스로의 부담으로 받아들일 수 있어요.",
    "business.siksang.none": "깊이 생각하거나 기회를 보는 힘이 있어도 밖으로 꺼내는 과정은 별도로 필요할 수 있어요.",
    "business.overload": "기회에 마음이 움직이는 정도와 혼자 감당하는 힘에는 차이가 있을 수 있어요.",
    "business.slow_start": "충분히 이해하려는 마음이 큰 반면 표현하는 힘은 약하게 보여, 시작까지 시간이 걸릴 수 있어요.",
    "relationship.friction": has("relationship.harmony") ? f.clashes.length >= 2 ? "이어지는 관계가 있어도 서로 다른 방향을 향하는 특징이 여러 곳에 남아, 가까운 사이에서도 의견을 굽히기 어려울 수 있어요." : "사람과 연결을 이어 가는 힘이 있어도 서로의 입장이 다르면 쉽게 넘기지 않는 면이 있어요." : f.clashes.length >= 2 ? "서로 다른 방향을 향하는 특징이 여러 곳에 있어, 내 입장이 다른 사람에게 강하게 느껴질 수 있어요." : "서로의 차이를 받아들이는 일이 가깝게 지내는 것보다 더 중요하게 느껴질 수 있어요.",
    "relationship.sensitivity": has("relationship.peers") ? "자기 기준을 지키는 힘에 예민하게 반응하는 특징이 겹쳐, 가까운 사이의 작은 차이도 오래 마음에 남을 수 있어요." : has("relationship.support") ? "상대의 사정을 이해하려는 면이 있어도, 사소한 차이를 받아들이는 마음까지 가벼운 것은 아닐 수 있어요." : "가까이 지내더라도 작은 차이를 예민하게 받아들이는 면이 함께 있어요.",
    "relationship.sharp_words": "생각을 또렷하게 전하는 힘이 반복되어, 상대에게는 말이 강하게 느껴질 수도 있어요.",
    "execution.needs_support": "뜻을 정한 것과 혼자 힘을 오래 유지하는 것은 다르게 나타날 수 있어요.",
    "execution.overthink": "배우고 생각하는 특징이 반복되어, 준비한 만큼 시작이 빨라지는 것은 아닐 수 있어요.",
    "flow.skewed": "겉으로 드러난 기운이 한쪽에 모여 있어, 여러 성향을 고르게 설명하기 어려운 명식이에요.",
    "flow.turbulence": "서로 다른 방향을 향하는 관계가 여러 곳에 있어, 한 가지 방향으로만 읽기는 어려워요.",
  };
  const seenDomain = new Set<Domain>();
  const negs = set.signals.filter((s) => s.polarity === "negative").sort((a, b) => b.strength - a.strength);
  for (const s of negs) if (!seenDomain.has(s.domain) && cautionText[s.id]) {
    add(cautions, cautionText[s.id]!, [...idsFor(s.domain), ...(s.id === "wealth.jae.none" && g.식상 > 0 ? ["business.siksang.present"] : [])], 5); seenDomain.add(s.domain);
  }
  for (const s of negs) if (cautions.length < 3 && cautionText[s.id]) add(cautions, cautionText[s.id]!, [s.id], 5);
  for (const text of [...ch.cautions, ...ch.moreCautions]) if (cautions.length < 3) add(cautions, text, [dmId], 5);

  // 주의점도 실제로 선택된 음의 근거를 유지하고, 행동 하나로 표현한다.
  const cautionTips: Record<string, string> = {
  "wealth.jae.none": "돈 관리가 낯설다면 이번 달 고정 지출부터 한 장에 모아 보세요.",
  "wealth.bigeop_outflow": "부탁받은 돈은 내 생활비를 뺀 뒤 감당할 수 있는지 따져 보세요.",
  "wealth.inseong_slow": "돈에 관한 생각이 길어지면 결정을 미루는 이유 하나를 적어 보세요.",
  "love.star.none": "가까운 사이에서 편했던 순간을 떠올려 내 바람을 알아보세요.",
  "love.star.crowded": "관계에서 원하는 것이 많아지면 꼭 필요한 바람과 기대를 나눠 보세요.",
  "love.daybranch.clash": "서로의 방식이 다르면 바로 고치려 하기보다 차이부터 적어 보세요.",
  "love.bigeop_pride": "가까운 사람의 제안 중 내가 받아들일 수 있는 부분 하나를 골라요.",
  "career.gwan.none": "일을 시작할 때 함께 일하는 사람이 기대하는 기준부터 물어보세요.",
  "career.gwan.pressure": "책임이 버겁다면 지금 맡은 일을 목록으로 써 도움받을 부분을 골라요.",
  "business.siksang.none": "생각만으로 맴도는 일은 가장 먼저 보여 줄 모습을 정해 보세요.",
  "business.overload": "하고 싶은 일과 혼자 맡을 수 있는 일을 두 목록으로 나눠 보세요.",
  "business.slow_start": "준비가 길어지면 시작 전에 꼭 알아야 할 것 하나만 남겨 보세요.",
  "relationship.friction": "다른 의견을 들었을 때 내 입장을 바로 정하기 전에 잠깐 여유를 둬요.",
  "relationship.sensitivity": "오래 마음에 남은 말은 느낌과 실제로 들은 내용을 나눠 적어 보세요.",
  "relationship.sharp_words": "하고 싶은 말이 강해질 때는 상대가 받아들일 표현으로 한 번 고쳐요.",
  "execution.needs_support": "힘이 빨리 빠지는 일은 끝낼 분량을 나눠 작은 단위로 정해요.",
  "execution.overthink": "준비를 더하고 싶어지면 이미 마련한 것으로 시작할 부분을 찾아요.",
  "flow.skewed": "익숙한 선택만 떠오르면 평소 쓰지 않던 방법 하나를 비교해 보세요.",
  "flow.turbulence": "여러 방향이 마음에 걸리면 당장 바꾸지 않을 기준 하나를 정해요."
};
  const usedTips = new Set<string>();
  for (let i = 0; i < cautions.length; i++) {
    const selected = negs.find(n => cautions[i]!.signalIds.includes(n.id) && cautionTips[n.id] && !usedTips.has(cautionTips[n.id]!));
    if (selected) { cautions[i] = item(cautionTips[selected.id]!, cautions[i]!.signalIds); usedTips.add(cautions[i]!.text); }
  }

  const elementSummary: ReadingItem[] = [];
  for (const e of f.dominantElements) add(elementSummary, `겉으로 드러난 ${d.fiveElements.total}글자 중 ${e} 기운이 ${f.elementCounts[e]}개로 ${f.elementCounts[e] >= 4 ? "특히 많이" : "비교적 많이"} 나타나요. ${SIGNAL_COPY[`personality.element.dominant.${e}`]!.trait}으로 읽을 수 있어요.`, [`personality.element.dominant.${e}`], 4);
  if (f.missingElements.length) {
    const hidden = f.missingElements.filter((e) => Object.values(d.hiddenStems).some((stems) => stems.some((s) => STEM_ELEMENT[s] === e)));
    add(elementSummary, `겉으로 드러난 ${d.fiveElements.total}글자에서는 ${f.missingElements.join("·")} 기운이 보이지 않아요.${hidden.length ? ` 다만 지장간에는 ${hidden.join("·")} 기운이 있어 명식 전체에 없다는 뜻은 아니에요.` : " 명식 전체의 성향이나 능력이 없다는 뜻으로 해석하지는 않아요."}`, f.missingElements.map((e) => `personality.element.missing.${e}`), 4);
  }
  const flow = set.signals.find((s) => s.domain === "flow" && ["flow.balanced", "flow.one_missing", "flow.skewed", "flow.partial_data"].includes(s.id))!;
  add(elementSummary, flow.id === "flow.partial_data" ? "확정된 글자만 살펴본 분포예요. 빠진 기둥의 성향은 추측해서 채우지 않아요." : flow.id === "flow.balanced" ? "겉으로 드러난 글자에 다섯 기운이 모두 나타나요. 개수가 같거나 모든 성향이 균등하다는 뜻은 아니에요." : "오행 개수는 겉으로 드러난 천간과 지지의 분포예요. 타고난 성향을 읽는 자료이며 앞으로의 운을 뜻하지는 않아요.", [flow.id], 4);

  const keywords: ReadingItem[] = [];
  if (has("career.gwan_in")) add(keywords, "전문성", ["career.gwan_in"], 5);
  if (has("business.independence") && g.식상 > 0) add(keywords, "독창성", ["business.independence", "business.siksang.present"], 5);
  if (has("wealth.siksang_to_jae")) add(keywords, "가치화", ["wealth.siksang_to_jae"], 5);
  if (tg("정재") && tg("편재")) add(keywords, "실속", ["wealth.jeongjae", "wealth.pyeonjae"], 5);
  if (has("relationship.harmony") && has("relationship.friction")) add(keywords, "선긋기", ["relationship.harmony", "relationship.friction"], 5);
  for (const group of [...GROUPS].sort((a, b) => g[b] - g[a])) if (has(`personality.group.${group}`)) add(keywords, ({ 비겁: "주도성", 식상: "표현력", 재성: "실속", 관성: "책임감", 인성: "탐구심" } as const)[group], [`personality.group.${group}`], 5);
  for (const text of ch.keywords) if (keywords.length < 5) add(keywords, text, [dmId], 5);
  // 결측/겹치는 키워드에서도 5개를 채운다. 기존 캐릭터의 traits/strengths를 짧게 표현할 뿐 새 해석을 추가하지 않는다.
  const characterKeywords = {
    갑: ["추진력", "정직"], 을: ["적응력", "설득"], 병: ["솔직함", "존재감"], 정: ["공감력", "의리"], 무: ["신중함", "포용력"],
    기: ["알뜰함", "성실함"], 경: ["추진력", "의리"], 신: ["깔끔함", "신중함"], 임: ["확장력", "친화력"], 계: ["관찰력", "상상력"],
  } as const;
  for (const text of characterKeywords[d.dayMaster!.stem]) if (keywords.length < 5) add(keywords, text, [dmId], 5);

  // 반전은 기존과 동일하게 실제 반대 극성의 짝이 있는 분야만. 긴 HOW를 복사하지 않는다.
  const reversalOf = (pos: Signal, neg: Signal): string => {
    const domain = pos.domain;
    if (domain === "wealth") {
      if (neg.id === "wealth.inseong_slow") return pos.id === "wealth.pyeonjae" ? "새 기회에 눈길이 가도 충분히 이해하려는 마음이 있어, 관심과 실제 결정 사이에 시간이 걸릴 수 있어요." : "재물의 쓰임을 의식하는 특징이 있어도 배우고 생각하는 힘이 반복돼, 돈에 관한 결론은 느려질 수 있어요.";
      return pos.id === "wealth.siksang_to_jae" ? "만들어 낸 것을 돈과 연결하려는 면이 있지만, 자기 뜻이나 관계가 돈을 지키는 방식에 끼어들 수 있어요." : pos.id === "wealth.pyeonjae" ? "새로운 돈의 기회를 보는 면과 내 판단을 앞세우는 면이 함께 있어, 기회를 알아보는 것과 남기는 것은 다르게 나타날 수 있어요." : g.재성 >= 3 ? "재물 특징이 여러 자리에 있어도 내 기준이 함께 반복돼, 돈에 관심을 두는 정도와 관리 방식은 달라질 수 있어요." : "현실적으로 돈을 다루려는 면이 있지만, 자기 뜻이나 사람 사이의 관계가 지출 결정에 끼어들 수 있어요.";
    }
    if (domain === "love") {
      if (neg.id === "love.star.none") return pos.id === "love.expression" ? g.식상 >= 2 ? "표현하는 힘이 여러 자리에 나타나도 가까운 관계를 읽는 특징이 같은 정도로 보이는 것은 아니에요." : "마음을 밖으로 꺼낼 수 있어도 가까운 관계를 이어 가는 방식까지 같은 힘으로 읽히지는 않아요." : "가까워지는 연결이 계산되더라도 관계를 중시하는 특징은 주요 해석 자리에서 약하게 보여요.";
      if (neg.id === "love.daybranch.clash") return pos.id === "love.expression" ? "마음을 표현하는 힘이 있어도 가까운 사이에서는 서로 다른 방식을 느낄 수 있어요." : "가까운 관계를 중시하는 면과 각자의 방식을 지키는 면이 함께 있어요.";
      if (neg.id === "love.star.crowded") return pos.id === "love.expression" ? "마음을 표현하면서도 관계에서 기대하는 바가 많아, 표현만으로 만족이 정해지지는 않아요." : "관계를 의식하는 특징이 반복되어, 관심이 커지는 만큼 기대도 높아질 수 있어요.";
      return pos.id === "love.expression" ? "마음을 드러내는 힘이 있지만 자기 기준도 반복돼, 말로 다가가는 것과 상대에게 맞추는 것은 다를 수 있어요." : pos.id === "love.daybranch.combine" ? "가까워지는 연결이 있어도 자기 방식은 쉽게 내려놓지 않을 수 있어요." : "관계를 중시하는 면이 있어도 자기 방식은 쉽게 내려놓지 않을 수 있어요.";
    }
    if (domain === "career") return pos.id === "career.gwan_in" ? "배우면서 책임을 뒷받침하는 힘이 있어도 맡은 역할이 반복되면 스스로 느끼는 부담이 커질 수 있어요." : "맡은 역할을 의식하는 힘이 있지만 책임이 여러 자리에 반복돼, 성실함과 부담이 함께 나타날 수 있어요.";
    if (domain === "business") {
      if (neg.id === "business.overload") return pos.id === "business.saengjae" ? "결과물을 수입과 연결하려는 힘이 있지만 재물 특징에 비해 혼자 감당하는 힘은 낮아, 관심의 크기만큼 일을 맡기 어려울 수 있어요." : "기회나 결과물에 마음이 움직여도 혼자 감당하는 힘은 다른 정도로 나타날 수 있어요.";
      if (neg.id === "business.slow_start") return "내 방향을 정하려는 힘이 있어도 준비와 생각이 반복되어, 독립적인 판단이 곧 빠른 시작으로 이어지지는 않아요.";
      return pos.id === "business.opportunity" ? "기회를 보는 감각이 있어도 직접 만들어 내는 힘은 주요 해석 자리에서 약하게 보여요." : "자기 방향을 정하려는 면은 있지만 밖으로 꺼내는 힘은 같은 정도로 두드러지지 않아요.";
    }
    if (domain === "relationship") {
      if (neg.id === "relationship.sharp_words") return pos.id === "relationship.harmony" ? "공통점을 찾아 사람과 이어지는 힘이 있어도 생각을 강하게 표현하는 면이 함께 있어요." : "함께 지내거나 이해하려는 마음이 있어도 말은 상대에게 강하게 느껴질 수 있어요.";
      if (neg.id === "relationship.sensitivity") return pos.id === "relationship.harmony" ? f.combines.length >= 3 ? "여러 연결이 있어도 작은 차이를 민감하게 느끼는 면은 남아 있어, 관계의 폭과 편안함은 다르게 나타날 수 있어요." : "가까워지는 연결이 있어도 작은 차이가 오래 마음에 남을 수 있어요." : pos.id === "relationship.support" ? "이해하려는 마음과 사소한 차이를 민감하게 느끼는 면이 나란히 있어요." : "내 기준으로 함께하는 힘이 있어도 작은 차이를 가볍게 넘기지 않을 수 있어요.";
      return pos.id === "relationship.harmony" ? f.clashes.length >= 2 ? "여러 입장 차이가 있어도 사람을 잇는 연결은 함께 남아 있어요. 가까움과 의견의 일치는 다르게 읽힙니다." : f.combines.length >= 3 ? "사람을 잇는 연결이 여러 곳에 있지만 서로 다른 입장도 남아 있어, 폭넓게 지내는 것과 동의하는 것은 달라질 수 있어요." : "사람과 이어지려는 면이 있어도 내 입장까지 쉽게 바꾸는 것은 아닐 수 있어요." : pos.id === "relationship.support" ? "상대의 사정을 이해하는 힘이 있어도 서로의 의견 차이는 별도로 남을 수 있어요." : "내 기준으로 사람과 함께하는 면이 있어도 다른 입장에는 쉽게 물러서지 않을 수 있어요.";
    }
    if (domain === "execution") return neg.id === "execution.overthink" ? pos.id === "execution.strong_self" ? "자기 방향을 밀고 가는 힘이 있어도 준비와 생각이 반복돼, 결심한 만큼 시작이 빠른 것은 아닐 수 있어요." : "움직이려는 면에 충분히 이해하려는 마음이 겹쳐, 준비가 실행 속도를 늦출 수 있어요." : pos.id === "execution.output" ? "밖으로 꺼내는 힘이 있어도 혼자 오래 유지하는 힘은 다른 정도로 나타날 수 있어요." : "압박이나 의욕이 움직임을 도울 수 있어도 혼자 감당하는 힘까지 같은 것은 아니에요.";
    return neg.id === "flow.turbulence" ? pos.id === "flow.balanced" ? "겉으로 드러난 기운이 모두 있어도 서로 다른 방향을 향하는 관계가 반복돼, 분포만으로 편안한 흐름을 단정하기는 어려워요." : "기운을 잇는 연결과 서로 다른 방향을 향하는 관계가 함께 반복돼, 연결만으로 편안한 흐름을 단정하기는 어려워요." : "기운을 잇는 연결이 있어도 겉 분포는 한쪽에 모여 있어, 연결과 균형을 같은 뜻으로 읽지는 않아요.";
  };
  const reversals: (ReadingItem & { readonly domain: Domain })[] = [];
  for (const domain of ["wealth", "love", "career", "business", "relationship", "execution", "flow"] as const) {
    const ordered = set.signals.filter((s) => s.domain === domain).sort((a, b) => b.strength - a.strength);
    const pos = ordered.find((s) => s.polarity === "positive" && SIGNAL_COPY[s.id]?.revPos);
    const neg = ordered.find((s) => s.polarity === "negative" && SIGNAL_COPY[s.id]?.revNeg);
    if (pos && neg) {
      // 원래 선택된 실제 반대 극성 짝의 의미만 사용한다.
      reversals.push({ domain, ...item(reversalOf(pos, neg), [pos.id, neg.id]) });
    }
  }

  // 같은 화면에서 이미 전한 문장은 되풀이하지 않는다. 표현 변형/해시가 아닌 표시 중복 제거다.
  const seenSentences = new Set<string>();
  const sentenceKey = (text: string) => text.trim().replace(/[.!?]+$/, "");
  for (const section of sections) {
    for (const reading of [section.summary!, ...section.items]) {
      for (const sentence of reading.text.split(/(?<=[.!?])\s+/)) seenSentences.add(sentenceKey(sentence));
    }
  }
  const dedupe = <T extends ReadingItem>(list: T[]) => {
    const unique: T[] = [];
    for (const reading of list) {
      const remaining = reading.text.split(/(?<=[.!?])\s+/).filter(sentence => {
        const key = sentenceKey(sentence);
        if (seenSentences.has(key)) return false;
        seenSentences.add(key); return true;
      });
      if (remaining.length) unique.push({ ...reading, text: remaining.join(" ") });
    }
    list.splice(0, list.length, ...unique);
  };
  for (const list of [traits, strengths, cautions, elementSummary]) dedupe(list);
  dedupe(reversals);

  const evidence: FreeEvidence[] = [freeEvidence(set, [...traits, ...strengths, ...cautions, ...elementSummary, ...keywords, ...reversals], "personality", "성향·강점·주의점·오행의 근거")];
  // 십성 수와 자리, 관계 종류/위치를 실제 데이터 그대로. 자리별 사건 의미를 덧붙이지 않는다.
  const facts = [...evidence[0]!.facts,
    "십성 집계 범위: 일간을 뺀 천간 + 지지 정기, 확정된 기둥만. 여기·중기는 점수에 합산하지 않음.",
    ...GROUPS.map((group) => `${group} ${g[group]}개: ${f.hits.filter((h) => TEN_GOD_GROUP[h.tenGod] === group).map((h) => `${POS[h.position]} ${h.slot === "stem" ? "천간" : "지지 정기"} ${h.tenGod}`).join(", ") || "없음"}`),
    ...d.relations.map((r) => `${r.kind}: ${r.positions.map((p) => POS[p]).join("·")}`),
    "합·충의 종류와 위치는 연결/차이의 근거로만 사용하며, 기둥별 사건이나 시기는 해석하지 않음.",
  ];
  evidence[0] = { ...evidence[0]!, facts: [...new Set(facts)] };
  for (const domain of DOMAINS) evidence.push(freeEvidence(set, sectionItems[domain]!, domain, SECTION_TITLES[domain], scores.find((s) => s.stat === domain)));
  return { coreTraits: traits, strengths, cautions, elementSummary, sections, keywords, reversals, evidence };
}
