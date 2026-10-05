// SajuData → Signals. 규칙은 결정적이며 같은 SajuData 는 항상 같은 Signal 목록을 만든다.
// 문장을 만들지 않는다 (문장은 Reading 단계에서 Signal id 로 고른다).
// 12운성은 읽지 않는다 (정책 twelveStagesInReadings = false).

import { TEN_GOD_GROUP, type SajuData, type TenGodGroup } from "../saju/chart";
import type { PillarPosition, TenGod } from "../saju/types";
import { VERIFICATION_LEVELS, VERIFICATION_STATUS, type VerificationItemId, type VerificationLevel } from "../saju/verification";
import { extractFeatures, type Features } from "./features";
import { DOMAINS, type Domain, type EvidenceSource, type Polarity, type Signal, type SignalEvidence, type Strength } from "./types";

const POS_KO: Readonly<Record<PillarPosition, string>> = { year: "연", month: "월", day: "일", hour: "시" };

function minLevel(items: readonly VerificationItemId[]): VerificationLevel {
  let idx = VERIFICATION_LEVELS.length - 1;
  for (const i of items) idx = Math.min(idx, VERIFICATION_LEVELS.indexOf(VERIFICATION_STATUS[i].level));
  return VERIFICATION_LEVELS[idx] as VerificationLevel;
}

const SOURCE_ITEMS: Readonly<Record<EvidenceSource, readonly VerificationItemId[]>> = {
  dayMaster: ["dayPillar"],
  tenGods: ["tenGods", "hiddenStems"],
  fiveElements: ["fiveElements"],
  relations: ["relations"],
  strengthIndex: ["tenGods", "hiddenStems"],
};

class Builder {
  readonly out: Signal[] = [];
  add(id: string, domain: Domain, polarity: Polarity, strength: number, evidence: readonly SignalEvidence[]): void {
    const s = Math.max(1, Math.min(3, Math.round(strength))) as Strength;
    const items = Array.from(new Set(evidence.flatMap((e) => SOURCE_ITEMS[e.source])));
    this.out.push(Object.freeze({ id, domain, polarity, strength: s, evidence: Object.freeze(evidence.map((e) => Object.freeze({ ...e, positions: Object.freeze([...e.positions]) }))), sourceVerification: minLevel(items) }));
  }
}

function tgEvidence(f: Features, pred: (t: TenGod) => boolean, label: string): SignalEvidence {
  const hs = f.hits.filter((h) => pred(h.tenGod));
  const detail = hs.length === 0 ? `${label} 없음` : `${label} ${hs.length}개 (${hs.map((h) => `${POS_KO[h.position]}${h.slot === "stem" ? "간" : "지"} ${h.tenGod}`).join(", ")})`;
  return { source: "tenGods", positions: Array.from(new Set(hs.map((h) => h.position))), detail };
}
const inGroup = (g: TenGodGroup) => (t: TenGod) => TEN_GOD_GROUP[t] === g;
const is = (x: TenGod) => (t: TenGod) => t === x;

export interface SignalSet {
  readonly signals: readonly Signal[];
  /** 해석 근거가 된 기둥 (uncertain 기둥 제외) */
  readonly coverage: { readonly includedPositions: readonly PillarPosition[]; readonly excludedPositions: readonly PillarPosition[] };
}

/** 일간이 없으면(일주 uncertain) Signal 을 만들지 않는다. */
export function deriveSignals(d: SajuData): SignalSet | null {
  if (!d.dayMaster) return null;
  const f = extractFeatures(d);
  const g = f.groupCount;
  const c = (t: TenGod) => f.tenGodCount[t] ?? 0;
  const b = new Builder();
  const dm = d.dayMaster;
  const dmEv: SignalEvidence = { source: "dayMaster", positions: ["day"], detail: `일간 ${dm.stem}(${dm.element}, ${dm.yinYang === "yang" ? "양" : "음"})` };
  const strengthEv: SignalEvidence = { source: "strengthIndex", positions: f.includedPositions, detail: `일간 힘 지표 ${f.strengthIndex} (비겁·인성 ${f.supportScore} / 전체 ${f.hits.length})` };

  // ── 성격 (점수 없음, 캐릭터·성향용) ──────────────────────
  b.add(`personality.daymaster.${dm.stem}`, "personality", "neutral", 2, [dmEv]);
  for (const e of f.dominantElements) {
    b.add(`personality.element.dominant.${e}`, "personality", "neutral", f.elementCounts[e] >= 4 ? 3 : 2, [{ source: "fiveElements", positions: f.includedPositions, detail: `${e} ${f.elementCounts[e]}개` }]);
  }
  for (const e of f.missingElements) {
    b.add(`personality.element.missing.${e}`, "personality", "neutral", 1, [{ source: "fiveElements", positions: f.includedPositions, detail: `${e} 0개` }]);
  }
  for (const grp of ["비겁", "식상", "재성", "관성", "인성"] as const) {
    if (g[grp] >= 2) b.add(`personality.group.${grp}`, "personality", "neutral", g[grp] >= 4 ? 3 : 2, [tgEvidence(f, inGroup(grp), grp)]);
  }
  b.add(`personality.strength.${f.strengthIndex}`, "personality", "neutral", 1, [strengthEv]);

  // ── 재물 ───────────────────────────────────────────────
  const jaeEv = tgEvidence(f, inGroup("재성"), "재성");
  if (g.재성 === 0) b.add("wealth.jae.none", "wealth", "negative", 1, [jaeEv]);
  else if (g.재성 === 1) b.add("wealth.jae.present", "wealth", "positive", 1, [jaeEv]);
  else b.add("wealth.jae.strong", "wealth", "positive", g.재성 >= 3 ? 3 : 2, [jaeEv]);
  if (c("편재") >= 1) b.add("wealth.pyeonjae", "wealth", "positive", 2, [tgEvidence(f, is("편재"), "편재")]);
  if (c("정재") >= 1) b.add("wealth.jeongjae", "wealth", "positive", 1, [tgEvidence(f, is("정재"), "정재")]);
  if (g.식상 >= 1 && g.재성 >= 1) b.add("wealth.siksang_to_jae", "wealth", "positive", 2, [tgEvidence(f, inGroup("식상"), "식상"), jaeEv]);
  if (g.비겁 >= 3 || (g.비겁 >= 2 && g.재성 >= 1)) b.add("wealth.bigeop_outflow", "wealth", "negative", g.비겁 >= 3 ? 2 : 1, [tgEvidence(f, inGroup("비겁"), "비겁")]);
  if (g.인성 >= 3) b.add("wealth.inseong_slow", "wealth", "negative", 1, [tgEvidence(f, inGroup("인성"), "인성")]);

  // ── 연애 ───────────────────────────────────────────────
  const spouseGroup: TenGodGroup = d.input.gender === "male" ? "재성" : "관성";
  const spouseEv = tgEvidence(f, inGroup(spouseGroup), `배우자 별(${spouseGroup}, ${d.input.gender === "male" ? "남성" : "여성"} 기준)`);
  if (g[spouseGroup] === 0) b.add("love.star.none", "love", "negative", 1, [spouseEv]);
  else if (g[spouseGroup] <= 2) b.add("love.star.present", "love", "positive", 2, [spouseEv]);
  else {
    b.add("love.star.many", "love", "positive", 2, [spouseEv]);
    b.add("love.star.crowded", "love", "negative", 1, [spouseEv]);
  }
  if (g.식상 >= 1) b.add("love.expression", "love", "positive", g.식상 >= 2 ? 2 : 1, [tgEvidence(f, inGroup("식상"), "식상")]);
  const dayBranchCombine = f.combines.filter((r) => r.positions.includes("day") && r.kind !== "천간합");
  const dayBranchClash = f.clashes.filter((r) => r.positions.includes("day") && r.kind === "지지충");
  if (dayBranchCombine.length > 0) b.add("love.daybranch.combine", "love", "positive", 2, [{ source: "relations", positions: dayBranchCombine.flatMap((r) => r.positions), detail: `일지 ${dayBranchCombine.map((r) => r.kind).join(", ")}` }]);
  if (dayBranchClash.length > 0) b.add("love.daybranch.clash", "love", "negative", 2, [{ source: "relations", positions: dayBranchClash.flatMap((r) => r.positions), detail: "일지 충" }]);
  if (g.비겁 >= 3) b.add("love.bigeop_pride", "love", "negative", 1, [tgEvidence(f, inGroup("비겁"), "비겁")]);

  // ── 직업 ───────────────────────────────────────────────
  const gwanEv = tgEvidence(f, inGroup("관성"), "관성");
  if (g.관성 === 0) b.add("career.gwan.none", "career", "negative", 1, [gwanEv]);
  else if (g.관성 <= 2) b.add("career.gwan.present", "career", "positive", 2, [gwanEv]);
  else {
    b.add("career.gwan.many", "career", "positive", 1, [gwanEv]);
    b.add("career.gwan.pressure", "career", "negative", 1, [gwanEv]);
  }
  if (c("정관") >= 1) b.add("career.jeonggwan", "career", "positive", 1, [tgEvidence(f, is("정관"), "정관")]);
  if (c("편관") >= 1) b.add("career.pyeongwan", "career", "positive", 1, [tgEvidence(f, is("편관"), "편관")]);
  if (g.인성 >= 1) b.add("career.inseong_expertise", "career", "positive", 1, [tgEvidence(f, inGroup("인성"), "인성")]);
  if (g.관성 >= 1 && g.인성 >= 1) b.add("career.gwan_in", "career", "positive", 2, [gwanEv, tgEvidence(f, inGroup("인성"), "인성")]);

  // ── 사업 ───────────────────────────────────────────────
  const sikEv = tgEvidence(f, inGroup("식상"), "식상");
  if (g.식상 === 0) b.add("business.siksang.none", "business", "negative", 1, [sikEv]);
  else b.add("business.siksang.present", "business", "positive", g.식상 >= 2 ? 2 : 1, [sikEv]);
  if (g.식상 >= 1 && g.재성 >= 1) b.add("business.saengjae", "business", "positive", 2, [sikEv, jaeEv]);
  if (c("편재") >= 1) b.add("business.opportunity", "business", "positive", 1, [tgEvidence(f, is("편재"), "편재")]);
  if (g.비겁 >= 2) b.add("business.independence", "business", "positive", 1, [tgEvidence(f, inGroup("비겁"), "비겁")]);
  if (f.strengthIndex === "weak" && g.재성 >= 3) b.add("business.overload", "business", "negative", 2, [jaeEv, strengthEv]);
  if (g.인성 >= 3 && g.식상 === 0) b.add("business.slow_start", "business", "negative", 1, [tgEvidence(f, inGroup("인성"), "인성"), sikEv]);

  // ── 인간관계 ────────────────────────────────────────────
  const relEv = (list: Features["combines"], label: string): SignalEvidence => ({
    source: "relations",
    positions: Array.from(new Set(list.flatMap((r) => r.positions))),
    detail: `${label} ${list.length}개 (${list.map((r) => r.kind).join(", ")})`,
  });
  const relStart = b.out.length;
  if (f.combines.length > 0) b.add("relationship.harmony", "relationship", "positive", f.combines.length, [relEv(f.combines, "합")]);
  if (f.clashes.length > 0) b.add("relationship.friction", "relationship", "negative", f.clashes.length, [relEv(f.clashes, "충")]);
  if (f.frictions.length > 0) b.add("relationship.sensitivity", "relationship", "negative", 1, [relEv(f.frictions, "형·해·파")]);
  if (g.비겁 >= 2) b.add("relationship.peers", "relationship", "positive", 1, [tgEvidence(f, inGroup("비겁"), "비겁")]);
  if (g.인성 >= 2) b.add("relationship.support", "relationship", "positive", 1, [tgEvidence(f, inGroup("인성"), "인성")]);
  if (c("상관") >= 2) b.add("relationship.sharp_words", "relationship", "negative", 1, [tgEvidence(f, is("상관"), "상관")]);
  if (b.out.length === relStart) b.add("relationship.independent", "relationship", "neutral", 1, [relEv([], "합·충")]);

  // ── 실행력 ─────────────────────────────────────────────
  if (f.strengthIndex === "strong") b.add("execution.strong_self", "execution", "positive", 2, [strengthEv]);
  else if (f.strengthIndex === "weak") b.add("execution.needs_support", "execution", "negative", 1, [strengthEv]);
  else b.add("execution.balanced", "execution", "positive", 1, [strengthEv]);
  if (g.식상 >= 1) b.add("execution.output", "execution", "positive", 1, [sikEv]);
  if (c("편관") >= 1) b.add("execution.pressure_drive", "execution", "positive", 1, [tgEvidence(f, is("편관"), "편관")]);
  if (g.인성 >= 3) b.add("execution.overthink", "execution", "negative", 2, [tgEvidence(f, inGroup("인성"), "인성")]);
  if (f.dominantElements.includes("화") || f.dominantElements.includes("목")) {
    b.add("execution.yang_energy", "execution", "positive", 1, [{ source: "fiveElements", positions: f.includedPositions, detail: `목·화 ${f.elementCounts.목 + f.elementCounts.화}개` }]);
  }

  // ── 운의 흐름 (타고난 흐름 성향. 대운·세운 시기 판단이 아님) ──
  const balEv: SignalEvidence = { source: "fiveElements", positions: f.includedPositions, detail: `없는 오행 ${f.missingElements.length}개${f.missingElements.length ? ` (${f.missingElements.join("")})` : ""}` };
  if (f.includedPositions.length < 3) b.add("flow.partial_data", "flow", "neutral", 1, [balEv]);
  else if (f.missingElements.length === 0) b.add("flow.balanced", "flow", "positive", 2, [balEv]);
  else if (f.missingElements.length === 1) b.add("flow.one_missing", "flow", "neutral", 1, [balEv]);
  else b.add("flow.skewed", "flow", "negative", f.missingElements.length >= 3 ? 2 : 1, [balEv]);
  if (f.combines.length >= 2) b.add("flow.connections", "flow", "positive", 1, [relEv(f.combines, "합")]);
  if (f.clashes.length >= 2) b.add("flow.turbulence", "flow", "negative", 1, [relEv(f.clashes, "충")]);

  const order = (s: Signal) => DOMAINS.indexOf(s.domain);
  const signals = [...b.out].sort((x, y) => order(x) - order(y));
  return Object.freeze({
    signals: Object.freeze(signals),
    coverage: Object.freeze({ includedPositions: d.fiveElements.includedPositions, excludedPositions: d.fiveElements.excludedPositions }),
  });
}
