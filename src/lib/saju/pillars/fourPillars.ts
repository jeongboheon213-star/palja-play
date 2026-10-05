// 네 기둥 조립: 정규화 → 절기 컨텍스트 → 네 개의 독립 기둥 함수.
// 각 기둥 함수는 서로의 결과를 받지 않는다 (같은 입력에서 각자 계산).

import type { Policy } from "../policies";
import type { NormalizeOptions, NormalizedBirthTime, SolarTermProvider, TimeCandidate, TimeNormalizer, TimeNormalizeErrorCode } from "../providers";
import { resolveSolarTermContext, type SolarTermContext } from "../solarTermContext";
import type { CalculationConfidence, CalculationWarning, PillarPosition, SajuInput } from "../types";
import { ENGINE_VERSION } from "../version";
import type { PillarInputs } from "./common";
import { calculateDayPillar } from "./dayPillar";
import { calculateHourPillar } from "./hourPillar";
import { calculateMonthPillar } from "./monthPillar";
import type { PillarResult } from "./types";
import { calculateYearPillar } from "./yearPillar";

export interface FourPillarsDeps {
  readonly normalizer: TimeNormalizer;
  readonly solarTermProvider: SolarTermProvider;
  readonly policy: Policy;
}

export interface FourPillars {
  readonly year: PillarResult;
  readonly month: PillarResult;
  readonly day: PillarResult;
  /** 시간 미상이면 null. 추정하지 않는다. */
  readonly hour: PillarResult | null;
}

export interface FourPillarsProvenance {
  readonly engineVersion: string;
  readonly policyVersion: string;
  readonly solarTermProvider: { readonly id: string; readonly version: string; readonly algorithmVersion: string; readonly verificationStatus: string };
  readonly timeData: NormalizedBirthTime["provenance"];
}

export type FourPillarsResult =
  | {
      readonly ok: true;
      readonly pillars: FourPillars;
      /** 기둥별 확정 정도. 시간 미상의 시주는 unavailable. */
      readonly confidence: Readonly<Record<PillarPosition, CalculationConfidence>>;
      /** 기둥 중 하나라도 절기 경계 위험이 있는가 */
      readonly boundaryRisk: boolean;
      readonly normalized: NormalizedBirthTime;
      readonly warnings: readonly CalculationWarning[];
      readonly provenance: FourPillarsProvenance;
    }
  | {
      readonly ok: false;
      readonly code: TimeNormalizeErrorCode;
      readonly message: string;
      readonly candidates?: readonly TimeCandidate[];
    };

export function calculateFourPillars(input: SajuInput, deps: FourPillarsDeps, options: NormalizeOptions = {}): FourPillarsResult {
  const norm = deps.normalizer.normalize(input, deps.policy, options);
  if (!norm.ok) {
    return norm.candidates
      ? { ok: false, code: norm.code, message: norm.message, candidates: norm.candidates }
      : { ok: false, code: norm.code, message: norm.message };
  }
  const normalized = norm.value;
  const ctx: SolarTermContext = resolveSolarTermContext(deps.solarTermProvider, normalized, deps.policy.solarTerm.boundaryWarning.minutes);
  const inp: PillarInputs = {
    normalized,
    solarTermContext: ctx,
    solarTermProvider: deps.solarTermProvider,
    policy: deps.policy,
  };

  const pillars: FourPillars = Object.freeze({
    year: calculateYearPillar(inp),
    month: calculateMonthPillar(inp),
    day: calculateDayPillar(inp),
    hour: calculateHourPillar(inp),
  });

  const info = deps.solarTermProvider.info;
  return Object.freeze({
    ok: true as const,
    pillars,
    confidence: Object.freeze({
      year: pillars.year.confidence,
      month: pillars.month.confidence,
      day: pillars.day.confidence,
      hour: pillars.hour ? pillars.hour.confidence : ("unavailable" as const),
    }),
    boundaryRisk: [pillars.year, pillars.month, pillars.day, pillars.hour].some((p) => p?.boundaryRisk === true),
    normalized,
    warnings: Object.freeze([...ctx.warnings]),
    provenance: Object.freeze({
      engineVersion: ENGINE_VERSION,
      policyVersion: deps.policy.policyVersion,
      solarTermProvider: Object.freeze({
        id: info.id,
        version: info.version,
        algorithmVersion: info.algorithmVersion,
        verificationStatus: deps.solarTermProvider.verificationStatus,
      }),
      timeData: normalized.provenance,
    }),
  });
}
