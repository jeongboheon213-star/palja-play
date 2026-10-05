// SajuData: 네 기둥 + 기본 사주 데이터(일간, 오행, 지장간, 십성, 12운성, 합충형).
// 해석·점수와 분리된 "원본 데이터"다. 문장을 만들지 않는다.
//
// 원칙
//  - uncertain/unavailable 기둥은 후보를 고르지 않으므로 오행·십성·관계 계산에서 제외하고, 제외 목록을 남긴다.
//  - 12운성은 rule = unverified, inReadings = false (Signals 가 읽지 않는다).

import { BRANCH_ELEMENT, STEM_ELEMENT, stemYinYang, type YinYang } from "../ganji";
import type { Policy } from "../policies";
import type { FourPillarsProvenance, FourPillarsResult, PillarResult } from "../pillars";
import { ELEMENTS, type Branch, type CalculationConfidence, type Element, type PillarPosition, type Relation, type SajuInput, type Stem, type TenGod, type TwelveStage } from "../types";
import { VERIFICATION_STATUS, type VerificationStatus } from "../verification";
import { SCHEMA_VERSION } from "../version";
import { findRelations, type PositionedPillar } from "./relations";
import { branchIndex, hiddenStemsOf, mainHiddenStem } from "./tables";
import { tenGodOf } from "./tenGods";
import { twelveStageOf } from "./twelveStages";

export const POSITIONS: readonly PillarPosition[] = ["year", "month", "day", "hour"];

export interface DayMaster {
  readonly stem: Stem;
  readonly element: Element;
  readonly yinYang: YinYang;
}

export interface FiveElements {
  /** 천간 + 지지(지지 오행) 글자 수. confirmed 기둥만. */
  readonly counts: Readonly<Record<Element, number>>;
  readonly total: number;
  readonly includedPositions: readonly PillarPosition[];
  /** uncertain/unavailable/시간 미상이라 빠진 기둥 */
  readonly excludedPositions: readonly PillarPosition[];
}

export interface PositionTenGods {
  /** 일간 자신은 null */
  readonly stem: TenGod | null;
  /** 지지 정기 기준 */
  readonly branch: TenGod;
  /** 지장간 각각의 십성 (여기 → 정기 순) */
  readonly hidden: readonly { readonly stem: Stem; readonly tenGod: TenGod }[];
}

export interface TwelveStagesData {
  readonly rule: "unverified" | "verified";
  /** Signals/해석에 쓰지 않는다 */
  readonly inReadings: boolean;
  readonly byPosition: Readonly<Partial<Record<PillarPosition, TwelveStage>>>;
}

export interface SajuData {
  readonly schemaVersion: string;
  readonly engineVersion: string;
  readonly input: SajuInput;
  readonly policy: Policy;
  readonly verification: VerificationStatus;
  readonly pillars: {
    readonly year: PillarResult;
    readonly month: PillarResult;
    readonly day: PillarResult;
    /** 시간 미상이면 null */
    readonly hour: PillarResult | null;
  };
  readonly confidence: Readonly<Record<PillarPosition, CalculationConfidence>>;
  readonly boundaryRisk: boolean;
  /** 일주가 confirmed 일 때만 */
  readonly dayMaster: DayMaster | null;
  readonly fiveElements: FiveElements;
  readonly hiddenStems: Readonly<Partial<Record<PillarPosition, readonly Stem[]>>>;
  /** 일간이 있을 때만 채워진다 */
  readonly tenGods: Readonly<Partial<Record<PillarPosition, PositionTenGods>>>;
  readonly twelveStages: TwelveStagesData | null;
  readonly relations: readonly Relation[];
  readonly time: {
    readonly timeKnown: boolean;
    readonly effectiveDate: string;
    readonly effectiveTime: string | null;
    readonly notes: readonly string[];
  };
  readonly provenance: FourPillarsProvenance;
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}

export function buildSajuData(input: SajuInput, policy: Policy, four: Extract<FourPillarsResult, { ok: true }>): SajuData {
  const { pillars } = four;
  const confirmedPillars: PositionedPillar[] = [];
  const excluded: PillarPosition[] = [];
  for (const pos of POSITIONS) {
    const p = pillars[pos];
    if (p && p.confidence === "confirmed" && p.pillar) confirmedPillars.push({ position: pos, stem: p.pillar.stem, branch: p.pillar.branch });
    else excluded.push(pos);
  }

  const counts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of confirmedPillars) {
    counts[STEM_ELEMENT[p.stem]]++;
    counts[BRANCH_ELEMENT[branchIndex(p.branch)] as Element]++;
  }

  const dayP = pillars.day.confidence === "confirmed" ? pillars.day.pillar : null;
  const dayMaster: DayMaster | null = dayP ? { stem: dayP.stem, element: STEM_ELEMENT[dayP.stem], yinYang: stemYinYang(dayP.stem) } : null;

  const hiddenStems: Partial<Record<PillarPosition, readonly Stem[]>> = {};
  const tenGods: Partial<Record<PillarPosition, PositionTenGods>> = {};
  const stages: Partial<Record<PillarPosition, TwelveStage>> = {};
  for (const p of confirmedPillars) {
    const hs = hiddenStemsOf(p.branch as Branch);
    hiddenStems[p.position] = hs;
    if (dayMaster) {
      tenGods[p.position] = {
        stem: p.position === "day" ? null : tenGodOf(dayMaster.stem, p.stem),
        branch: tenGodOf(dayMaster.stem, mainHiddenStem(p.branch)),
        hidden: hs.map((s) => ({ stem: s, tenGod: tenGodOf(dayMaster.stem, s) })),
      };
      stages[p.position] = twelveStageOf(dayMaster.stem, p.branch);
    }
  }

  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    engineVersion: four.provenance.engineVersion,
    input: { ...input }, // 호출자의 객체를 동결하지 않도록 복사
    policy,
    verification: VERIFICATION_STATUS,
    pillars,
    confidence: four.confidence,
    boundaryRisk: four.boundaryRisk,
    dayMaster,
    fiveElements: {
      counts,
      total: ELEMENTS.reduce((a, e) => a + counts[e], 0),
      includedPositions: confirmedPillars.map((p) => p.position),
      excludedPositions: excluded,
    },
    hiddenStems,
    tenGods,
    twelveStages: dayMaster ? { rule: policy.twelveStageRule, inReadings: policy.twelveStagesInReadings, byPosition: stages } : null,
    relations: findRelations(confirmedPillars),
    time: {
      timeKnown: four.normalized.timeKnown,
      effectiveDate: four.normalized.effective.date,
      effectiveTime: four.normalized.effective.time,
      notes: [...four.normalized.notes],
    },
    provenance: four.provenance,
  });
}
