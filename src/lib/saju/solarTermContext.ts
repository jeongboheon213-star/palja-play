// 절기 컨텍스트: TimeNormalizer 결과 + SolarTermProvider 결과를 결합한다.
// 연주/월주는 계산하지 않는다. 이 단계는 "절기 경계가 이 사람의 결과를 불확정으로 만드는가"만 판정한다.
//
// 시간 미상: 00:00/12:00/23:59 같은 시각을 넣어 판정하지 않는다.
//   effectiveDayRangeUtc 안에 (월/연 경계 후보인) 절기 순간이 들어가는지만 검사한다.
//   들어가면 uncertain + NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY, 전/후를 고르지 않는다.
//   전체 계산 오류로 만들지 않는다.

import { MS_PER_MINUTE, epochMsFromIsoUtc, formatLocalFromEpochMs } from "./civil";
import type { NormalizedBirthTime, SolarTermInstant, SolarTermLookup, SolarTermProvider, SolarTermErrorCode } from "./providers";
import { getSolarTermById } from "./solarTerms";
import type { CalculationConfidence, CalculationWarning, PillarPosition } from "./types";

export interface LocalInstantView {
  readonly termId: string;
  readonly termInstantUtc: string;
  readonly effectiveDate: string;
  readonly effectiveTime: string;
}

export interface SolarTermDayAssessment {
  readonly range: { readonly startUtc: string; readonly endUtc: string };
  /** 범위 안에 있는 월/연 경계 후보 절기 */
  readonly boundaryTermsInRange: readonly SolarTermInstant[];
  readonly status: "determined" | "ambiguous";
  /** 하루 전체에서 동일한 현재 절기. ambiguous 이면 전/후를 고르지 않으므로 null. */
  readonly currentTermAtDayStart: SolarTermInstant | null;
  /** 범위 바로 바깥(경고 범위 이내)에 경계 후보 절기가 있는가. 서비스 경고이며 정확도 기준이 아니다. */
  readonly nearRangeEdge: boolean;
}

export type SolarTermContext =
  | {
      readonly ok: true;
      readonly confidence: CalculationConfidence;
      readonly timeKnown: boolean;
      readonly lookup: SolarTermLookup | null;
      readonly dayAssessment: SolarTermDayAssessment | null;
      readonly warnings: readonly CalculationWarning[];
      readonly localInstants: readonly LocalInstantView[];
    }
  | {
      readonly ok: false;
      readonly confidence: "unavailable";
      readonly code: SolarTermErrorCode | "INVALID_NORMALIZED_INPUT";
      readonly message: string;
      readonly warnings: readonly CalculationWarning[];
    };

function affectsFor(termId: string): readonly PillarPosition[] {
  const d = getSolarTermById(termId);
  return d?.yearBoundaryCandidate ? ["year", "month"] : ["month"];
}

function isBoundaryCandidate(termId: string): boolean {
  return getSolarTermById(termId)?.monthBoundaryCandidate === true;
}

export function resolveSolarTermContext(
  provider: SolarTermProvider,
  normalized: NormalizedBirthTime,
  warningWindowMinutes: number,
): SolarTermContext {
  const offset = normalized.adjustments.effectiveOffsetMinutes;
  const view = (t: SolarTermInstant): LocalInstantView => {
    const f = formatLocalFromEpochMs(t.epochMs, offset);
    return { termId: t.termId, termInstantUtc: t.termInstantUtc, effectiveDate: f.date, effectiveTime: f.time };
  };

  // ── 시간 있음 ────────────────────────────────────────
  if (normalized.timeKnown) {
    const ms = normalized.instantUtc === null ? null : epochMsFromIsoUtc(normalized.instantUtc);
    if (ms === null) return { ok: false, confidence: "unavailable", code: "INVALID_NORMALIZED_INPUT", message: "정규화된 출생 순간이 올바르지 않습니다.", warnings: [] };
    const r = provider.locate(ms);
    if (!r.ok) return { ok: false, confidence: "unavailable", code: r.code, message: r.message, warnings: [] };
    const l = r.value;
    const warnings: CalculationWarning[] = [];
    const near = l.boundary.mathematical.nearestTerm;
    if (l.boundary.serviceWarning.warn && isBoundaryCandidate(near.termId)) {
      warnings.push({ code: "SOLAR_TERM_BOUNDARY_NEAR", affects: affectsFor(near.termId), termIds: [near.termId] });
    }
    return {
      ok: true,
      confidence: "confirmed",
      timeKnown: true,
      lookup: l,
      dayAssessment: null,
      warnings,
      localInstants: [view(l.previousTerm), view(l.currentTerm), view(l.nextTerm)],
    };
  }

  // ── 시간 미상 ────────────────────────────────────────
  const startMs = epochMsFromIsoUtc(normalized.effectiveDayRangeUtc.startUtc);
  const endMs = epochMsFromIsoUtc(normalized.effectiveDayRangeUtc.endUtc);
  if (startMs === null || endMs === null) return { ok: false, confidence: "unavailable", code: "INVALID_NORMALIZED_INPUT", message: "날짜 구간이 올바르지 않습니다.", warnings: [] };

  const inRange = provider.termsInRange(startMs, endMs);
  if (!inRange.ok) return { ok: false, confidence: "unavailable", code: inRange.code, message: inRange.message, warnings: [] };
  const atStart = provider.locate(startMs);
  if (!atStart.ok) return { ok: false, confidence: "unavailable", code: atStart.code, message: atStart.message, warnings: [] };
  const atLast = provider.locate(endMs - 1);
  if (!atLast.ok) return { ok: false, confidence: "unavailable", code: atLast.code, message: atLast.message, warnings: [] };

  const boundaryTerms = inRange.value.filter((t) => isBoundaryCandidate(t.termId));
  const winMs = warningWindowMinutes * MS_PER_MINUTE;
  const justBefore = atStart.value.currentTerm;
  const justAfter = atLast.value.nextTerm;
  const nearRangeEdge =
    (justBefore.epochMs < startMs && startMs - justBefore.epochMs <= winMs && isBoundaryCandidate(justBefore.termId)) ||
    (justAfter.epochMs >= endMs && justAfter.epochMs - endMs <= winMs && isBoundaryCandidate(justAfter.termId));

  const ambiguous = boundaryTerms.length > 0;
  const warnings: CalculationWarning[] = [];
  if (ambiguous) {
    const affects = Array.from(new Set(boundaryTerms.flatMap((t) => affectsFor(t.termId))));
    warnings.push({ code: "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY", affects, termIds: boundaryTerms.map((t) => t.termId) });
  }
  return {
    ok: true,
    confidence: ambiguous ? "uncertain" : "confirmed",
    timeKnown: false,
    lookup: null,
    dayAssessment: {
      range: normalized.effectiveDayRangeUtc,
      boundaryTermsInRange: boundaryTerms,
      status: ambiguous ? "ambiguous" : "determined",
      currentTermAtDayStart: ambiguous ? null : atStart.value.currentTerm,
      nearRangeEdge,
    },
    warnings,
    localInstants: [...(ambiguous ? [] : [atStart.value.currentTerm]), ...inRange.value, atLast.value.nextTerm].map(view),
  };
}
