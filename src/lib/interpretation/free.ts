// FREE 결과 (WHAT: 나는 어떤 사람인가).
// 모든 문장은 Signal id 를 근거로 갖는다. 반전 포인트는 같은 영역에 반대 polarity Signal 이 실제로 있을 때만 만든다.

import { STEM_HANJA } from "../saju/ganji";
import type { SajuData } from "../saju/chart";
import type { CalculationConfidence, Element, PillarPosition, Stem } from "../saju/types";
import { CHARACTERS } from "./copy/characters";
import { SECTION_TITLES, SIGNAL_COPY, type SignalCopy } from "./copy/signalCopy";
import { NOTICE_TEXT, type NoticeCode } from "./notices";
import { scoreSignals } from "./score";
import { deriveSignals, type SignalSet } from "./signals";
import type { Domain, Score, Signal } from "./types";
import { INTERPRETATION_VERSION } from "./version";
import { SCORE_VERSION } from "./score";

export interface ReadingItem {
  readonly text: string;
  readonly signalIds: readonly string[];
}

export interface ReadingSection {
  readonly domain: "wealth" | "love" | "career" | "business" | "relationship";
  readonly title: string;
  readonly score: number;
  readonly items: readonly ReadingItem[];
}

export interface ResultVersions {
  readonly engineVersion: string;
  readonly schemaVersion: string;
  readonly interpretationVersion: string;
  readonly scoreVersion: string;
  readonly solarTermProviderVersion: string;
  readonly policyVersion: string;
}

export interface PillarDisplay {
  readonly position: PillarPosition;
  readonly label: string;
  readonly ganji: string | null;
  readonly hanja: string | null;
  readonly confidence: CalculationConfidence;
  readonly boundaryRisk: boolean;
  /** uncertain 일 때 가능한 값 (고르지 않음) */
  readonly candidates: readonly string[];
}

export interface FreeReading {
  readonly tier: "free";
  readonly axis: "what";
  readonly versions: ResultVersions;
  readonly character: {
    readonly id: string;
    readonly name: string;
    readonly emoji: string;
    readonly tagline: string;
    readonly dayMaster: Stem;
    readonly dayMasterHanja: string;
    readonly element: Element;
    readonly signalIds: readonly string[];
  };
  readonly pillars: readonly PillarDisplay[];
  readonly coreTraits: readonly ReadingItem[];
  readonly strengths: readonly ReadingItem[];
  readonly cautions: readonly ReadingItem[];
  readonly fiveElements: {
    readonly counts: Readonly<Record<Element, number>>;
    readonly total: number;
    readonly dominant: readonly Element[];
    readonly missing: readonly Element[];
    readonly excludedPositions: readonly PillarPosition[];
    readonly summary: readonly ReadingItem[];
  };
  readonly scores: readonly Score[];
  readonly sections: readonly ReadingSection[];
  readonly keywords: readonly ReadingItem[];
  /** 0개일 수 있다 (근거 없는 반전 문장 금지) */
  readonly reversals: readonly (ReadingItem & { readonly domain: Domain })[];
  readonly notices: readonly { readonly code: NoticeCode; readonly text: string; readonly positions?: readonly PillarPosition[] }[];
  readonly boundaryRisk: boolean;
}

export type FreeReadingResult =
  | { readonly ok: true; readonly reading: FreeReading; readonly signals: SignalSet }
  | { readonly ok: false; readonly code: "DAY_MASTER_UNAVAILABLE" };

export const FREE_LIMITS = Object.freeze({ traits: [5, 7], strengths: [5, 7], cautions: [3, 5], keywords: [3, 5] } as const);

const POSITION_LABEL: Readonly<Record<PillarPosition, string>> = { year: "연주", month: "월주", day: "일주", hour: "시주" };
const SECTION_DOMAINS = ["wealth", "love", "career", "business", "relationship"] as const;
const REVERSAL_DOMAINS: readonly Domain[] = ["wealth", "love", "career", "business", "relationship", "execution", "flow"];

const copyOf = (s: Signal): SignalCopy => SIGNAL_COPY[s.id] ?? {};
/** 강도 높은 순, 같으면 원래 순서 */
const byStrength = (list: readonly Signal[]) => [...list].map((s, i) => ({ s, i })).sort((a, b) => b.s.strength - a.s.strength || a.i - b.i).map((x) => x.s);

class Collector {
  readonly items: ReadingItem[] = [];
  private readonly seen = new Set<string>();
  constructor(private readonly max: number) {}
  add(text: string | undefined, ids: readonly string[]): void {
    if (!text || this.seen.has(text) || this.items.length >= this.max) return;
    this.seen.add(text);
    this.items.push(Object.freeze({ text, signalIds: Object.freeze([...ids]) }));
  }
  get size(): number {
    return this.items.length;
  }
}

export function buildFreeReading(d: SajuData): FreeReadingResult {
  const set = deriveSignals(d);
  if (!set || !d.dayMaster) return { ok: false, code: "DAY_MASTER_UNAVAILABLE" };
  const signals = set.signals;
  const scoreSet = scoreSignals(set);
  const dm = d.dayMaster;
  const ch = CHARACTERS[dm.stem];
  const dmId = `personality.daymaster.${dm.stem}`;
  const dmIds = [dmId];
  const ordered = byStrength(signals);
  const personality = ordered.filter((s) => s.domain === "personality" && s.id !== dmId);

  // 핵심 성향: 캐릭터 3 + 성향 Signal → 부족하면 캐릭터 예비 후보
  const traits = new Collector(FREE_LIMITS.traits[1]);
  for (const t of ch.traits) traits.add(t, dmIds);
  for (const s of personality) traits.add(copyOf(s).trait, [s.id]);
  for (const t of ch.moreTraits) if (traits.size < FREE_LIMITS.traits[0]) traits.add(t, dmIds);

  // 강점: 캐릭터 3 + positive Signal 강점 → 부족하면 예비 후보
  const strengths = new Collector(FREE_LIMITS.strengths[1]);
  for (const t of ch.strengths) strengths.add(t, dmIds);
  for (const s of ordered) if (s.polarity !== "negative") strengths.add(copyOf(s).strength, [s.id]);
  for (const t of ch.moreStrengths) if (strengths.size < FREE_LIMITS.strengths[0]) strengths.add(t, dmIds);

  // 주의점: negative Signal 우선 → 캐릭터 → 예비
  const cautions = new Collector(FREE_LIMITS.cautions[1]);
  for (const s of ordered) if (s.polarity === "negative") cautions.add(copyOf(s).caution, [s.id]);
  for (const t of ch.cautions) cautions.add(t, dmIds);
  for (const t of ch.moreCautions) if (cautions.size < FREE_LIMITS.cautions[0]) cautions.add(t, dmIds);

  // 오행 밸런스
  const elementSummary = new Collector(4);
  for (const s of signals.filter((x) => x.id.startsWith("personality.element."))) elementSummary.add(copyOf(s).element, [s.id]);
  const flowSig = signals.find((s) => s.domain === "flow" && ["flow.balanced", "flow.one_missing", "flow.skewed", "flow.partial_data"].includes(s.id));
  if (flowSig) {
    const text =
      flowSig.id === "flow.balanced"
        ? "다섯 가지 기운이 모두 들어 있어 균형이 좋은 편이에요."
        : flowSig.id === "flow.partial_data"
          ? "확정된 기둥이 적어 오행 분포는 확정된 글자만으로 보여 드려요."
          : flowSig.id === "flow.skewed"
            ? "기운이 몇 가지로 쏠려 있어 개성이 뚜렷한 구조예요."
            : "한 가지 기운이 비어 있어 그 기운을 채워 주는 사람·환경과 잘 맞아요.";
    elementSummary.add(text, [flowSig.id]);
  }

  // 영역 해석
  const sections: ReadingSection[] = SECTION_DOMAINS.map((domain) => {
    const c = new Collector(4);
    c.add(ch.lines[domain], dmIds);
    for (const s of byStrength(signals.filter((x) => x.domain === domain))) c.add(copyOf(s).section, [s.id]);
    const score = scoreSet.scores.find((x) => x.stat === domain)!.value;
    return Object.freeze({ domain, title: SECTION_TITLES[domain], score, items: Object.freeze(c.items) });
  });

  // 인생 키워드
  const keywords = new Collector(FREE_LIMITS.keywords[1]);
  for (const k of ch.keywords) keywords.add(k, dmIds);
  for (const s of ordered) keywords.add(copyOf(s).keyword, [s.id]);

  // 반전 포인트: 같은 영역의 positive(revPos) + negative(revNeg) 가 실제로 있을 때만
  const reversals: (ReadingItem & { domain: Domain })[] = [];
  for (const domain of REVERSAL_DOMAINS) {
    const inDomain = byStrength(signals.filter((s) => s.domain === domain));
    const pos = inDomain.find((s) => s.polarity === "positive" && copyOf(s).revPos);
    const neg = inDomain.find((s) => s.polarity === "negative" && copyOf(s).revNeg);
    if (pos && neg) reversals.push(Object.freeze({ domain, text: `${copyOf(pos).revPos} ${copyOf(neg).revNeg}`, signalIds: Object.freeze([pos.id, neg.id]) }));
  }

  // 안내
  const notices: FreeReading["notices"][number][] = [];
  if (d.boundaryRisk) notices.push({ code: "BOUNDARY_RISK", text: NOTICE_TEXT.BOUNDARY_RISK });
  if (!d.time.timeKnown) notices.push({ code: "TIME_UNKNOWN", text: NOTICE_TEXT.TIME_UNKNOWN });
  const uncertainPositions = (["year", "month", "day"] as const).filter((p) => d.confidence[p] === "uncertain");
  if (uncertainPositions.length > 0) notices.push({ code: "PILLAR_UNCERTAIN", text: NOTICE_TEXT.PILLAR_UNCERTAIN, positions: uncertainPositions });
  if (d.fiveElements.includedPositions.length < 3) notices.push({ code: "PARTIAL_DATA", text: NOTICE_TEXT.PARTIAL_DATA });

  const pillars: PillarDisplay[] = (["year", "month", "day", "hour"] as const).map((pos) => {
    const p = d.pillars[pos];
    return Object.freeze({
      position: pos,
      label: POSITION_LABEL[pos],
      ganji: p?.ganji ?? null,
      hanja: p?.hanja ?? null,
      confidence: p ? p.confidence : ("unavailable" as const),
      boundaryRisk: p?.boundaryRisk ?? false,
      candidates: Object.freeze((p?.candidates ?? []).map((c) => `${c.stem}${c.branch}`)),
    });
  });

  const reading: FreeReading = {
    tier: "free",
    axis: "what",
    versions: resultVersions(d),
    character: { id: ch.id, name: ch.name, emoji: ch.emoji, tagline: ch.tagline, dayMaster: dm.stem, dayMasterHanja: STEM_HANJA[dm.stem], element: dm.element, signalIds: dmIds },
    pillars,
    coreTraits: traits.items,
    strengths: strengths.items,
    cautions: cautions.items,
    fiveElements: {
      counts: d.fiveElements.counts,
      total: d.fiveElements.total,
      dominant: signals.filter((s) => s.id.startsWith("personality.element.dominant.")).map((s) => s.id.split(".").pop() as Element),
      missing: signals.filter((s) => s.id.startsWith("personality.element.missing.")).map((s) => s.id.split(".").pop() as Element),
      excludedPositions: d.fiveElements.excludedPositions,
      summary: elementSummary.items,
    },
    scores: scoreSet.scores,
    sections,
    keywords: keywords.items,
    reversals,
    notices,
    boundaryRisk: d.boundaryRisk,
  };
  return { ok: true, reading: deepFreeze(reading), signals: set };
}

export function resultVersions(d: SajuData): ResultVersions {
  return Object.freeze({
    engineVersion: d.engineVersion,
    schemaVersion: d.schemaVersion,
    interpretationVersion: INTERPRETATION_VERSION,
    scoreVersion: SCORE_VERSION,
    solarTermProviderVersion: d.provenance.solarTermProvider.version,
    policyVersion: d.provenance.policyVersion,
  });
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}
