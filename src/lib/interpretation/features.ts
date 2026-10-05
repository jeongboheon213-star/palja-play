// SajuData 에서 Signal 규칙이 쓰는 특징값을 뽑는다. 12운성은 읽지 않는다.

import { TEN_GOD_GROUP, type SajuData, type TenGodGroup } from "../saju/chart";
import { ELEMENTS, type Element, type PillarPosition, type RelationKind, type TenGod } from "../saju/types";

export interface TenGodHit {
  readonly tenGod: TenGod;
  readonly position: PillarPosition;
  readonly slot: "stem" | "branch";
}

export type StrengthIndex = "strong" | "balanced" | "weak";

export interface Features {
  /** 일간 제외 천간 + 지지 정기의 십성 목록 (confirmed 기둥만) */
  readonly hits: readonly TenGodHit[];
  readonly groupCount: Readonly<Record<TenGodGroup, number>>;
  readonly tenGodCount: Readonly<Partial<Record<TenGod, number>>>;
  readonly elementCounts: Readonly<Record<Element, number>>;
  /** 3개 이상인 오행 (많은 순) */
  readonly dominantElements: readonly Element[];
  /** 0개인 오행. 포함된 기둥이 3개 미만이면 판단하지 않고 빈 배열 */
  readonly missingElements: readonly Element[];
  /**
   * 일간 힘 지표 (서비스 단순화): 비겁·인성 수 + 월지가 비겁·인성이면 1 가산.
   * 전통 신강/신약 판정이 아니다.
   */
  readonly strengthIndex: StrengthIndex;
  readonly supportScore: number;
  readonly combines: readonly { kind: RelationKind; positions: readonly PillarPosition[] }[];
  readonly clashes: readonly { kind: RelationKind; positions: readonly PillarPosition[] }[];
  readonly frictions: readonly { kind: RelationKind; positions: readonly PillarPosition[] }[];
  readonly includedPositions: readonly PillarPosition[];
}

const COMBINE: readonly RelationKind[] = ["천간합", "지지육합", "삼합", "반합", "방합"];
const CLASH: readonly RelationKind[] = ["천간충", "지지충"];
const FRICTION: readonly RelationKind[] = ["지지형", "지지해", "지지파"];

export function extractFeatures(d: SajuData): Features {
  const hits: TenGodHit[] = [];
  for (const pos of ["year", "month", "day", "hour"] as const) {
    const t = d.tenGods[pos];
    if (!t) continue;
    if (t.stem) hits.push({ tenGod: t.stem, position: pos, slot: "stem" });
    hits.push({ tenGod: t.branch, position: pos, slot: "branch" });
  }
  const groupCount: Record<TenGodGroup, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const tenGodCount: Partial<Record<TenGod, number>> = {};
  for (const h of hits) {
    groupCount[TEN_GOD_GROUP[h.tenGod]]++;
    tenGodCount[h.tenGod] = (tenGodCount[h.tenGod] ?? 0) + 1;
  }

  const ec = d.fiveElements.counts;
  const dominantElements = [...ELEMENTS].filter((e) => ec[e] >= 3).sort((a, b) => ec[b] - ec[a] || ELEMENTS.indexOf(a) - ELEMENTS.indexOf(b));
  const missingElements = d.fiveElements.includedPositions.length >= 3 ? ELEMENTS.filter((e) => ec[e] === 0) : [];

  const monthBranch = d.tenGods.month?.branch;
  const monthSupports = monthBranch !== undefined && (TEN_GOD_GROUP[monthBranch] === "비겁" || TEN_GOD_GROUP[monthBranch] === "인성");
  const supportScore = groupCount.비겁 + groupCount.인성 + (monthSupports ? 1 : 0);
  const others = hits.length - groupCount.비겁 - groupCount.인성;
  const strengthIndex: StrengthIndex = supportScore >= others + 2 ? "strong" : supportScore + 2 <= others ? "weak" : "balanced";

  const pick = (kinds: readonly RelationKind[]) => d.relations.filter((r) => kinds.includes(r.kind)).map((r) => ({ kind: r.kind, positions: r.positions }));

  return {
    hits,
    groupCount,
    tenGodCount,
    elementCounts: ec,
    dominantElements,
    missingElements,
    strengthIndex,
    supportScore,
    combines: pick(COMBINE),
    clashes: pick(CLASH),
    frictions: pick(FRICTION),
    includedPositions: d.fiveElements.includedPositions,
  };
}
