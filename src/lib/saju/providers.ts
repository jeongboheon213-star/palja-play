// 교체 가능한 계층의 인터페이스. 구현은 Phase 3 이후.

import type { Policy, SolarTermProviderId } from "./policies";
import type { SajuData, SajuInput } from "./types";
import type { VerificationLevel } from "./verification";

export interface SolarTermResult {
  readonly provider: SolarTermProviderId;
  readonly verificationStatus: VerificationLevel;
  readonly currentTerm: { readonly name: string; readonly index: number };
  /** 현재 절기 시작 시각 (UTC ISO) */
  readonly currentTermInstantUtc: string;
  /** 다음 절기 시작 시각 (UTC ISO) */
  readonly nextTermInstantUtc: string;
  /** 가장 가까운 절입 시각까지의 거리(분, 절댓값) */
  readonly minutesFromBoundary: number;
  readonly boundaryWarning: boolean;
}

/** 절기 제공자. Alpha / Verified / Kasi 구현을 교체할 수 있다. */
export interface SolarTermProvider {
  readonly id: SolarTermProviderId;
  readonly verificationStatus: VerificationLevel;
  getSolarTerm(dateTime: Date): SolarTermResult;
}

/** 달력 제공자. 현재는 양력만. 음력은 별도 구현으로 추가. */
export interface CalendarProvider {
  readonly kind: "solar";
  /** 달력상 존재하는 날짜인지 */
  isValidDate(isoDate: string): boolean;
}

export type OverlapChoice = "earlier" | "later";

export interface NormalizeOptions {
  /** 같은 벽시계 시각이 두 번 있는 경우, 사용자가 명시적으로 고른 쪽. 없으면 오류로 돌려준다. */
  readonly overlapChoice?: OverlapChoice;
}

export type TimeNormalizeErrorCode = "NONEXISTENT_LOCAL_TIME" | "AMBIGUOUS_LOCAL_TIME" | "OUT_OF_COVERAGE";

export type TimeNoteCode =
  | "TIME_UNKNOWN"
  | "HISTORICAL_OFFSETS_OFF"
  | "DST_REMOVED"
  | "LONGITUDE_APPLIED"
  | "OVERLAP_RESOLVED_BY_CHOICE"
  | "DATE_SHIFTED_BY_NORMALIZATION";

export interface AppliedSegment {
  readonly id: string;
  readonly abbrev: string;
  readonly stdOffsetMinutes: number;
  readonly dstSavingMinutes: number;
  readonly totalOffsetMinutes: number;
}

export interface TimeCandidate {
  readonly instantUtc: string;
  readonly segmentId: string;
  readonly abbrev: string;
}

export interface NormalizedBirthTime {
  readonly timeKnown: boolean;
  /** 사용자가 입력한 벽시계 값 그대로 */
  readonly input: { readonly date: string; readonly time: string | null };
  /** 출생 순간(UTC). 시간 미상이면 null. */
  readonly instantUtc: string | null;
  /** 적용된 구간. 시간 미상이면 null. */
  readonly segment: AppliedSegment | null;
  /** 정책 적용 후 사주 계산에 쓸 시각(서머타임 제거, 경도 보정 반영). 시간 미상이면 time=null. */
  readonly effective: { readonly date: string; readonly time: string | null };
  /** effective 날짜 하루(00:00 이상 다음날 00:00 미만)에 해당하는 UTC 구간. 시간 미상일 때 절입 포함 여부 판단용. */
  readonly effectiveDayRangeUtc: { readonly startUtc: string; readonly endUtc: string };
  readonly adjustments: {
    readonly dstRemovedMinutes: number;
    readonly longitudeMinutes: number;
    /** instant + 이 값 = effective */
    readonly effectiveOffsetMinutes: number;
  };
  readonly provenance: {
    readonly dataVersion: string;
    readonly historicalOffsets: boolean;
    readonly source: string;
    readonly verification: VerificationLevel;
  };
  readonly notes: readonly TimeNoteCode[];
}

export type TimeNormalizeResult =
  | { readonly ok: true; readonly value: NormalizedBirthTime }
  | {
      readonly ok: false;
      readonly code: TimeNormalizeErrorCode;
      readonly message: string;
      /** AMBIGUOUS_LOCAL_TIME일 때 가능한 두 순간 (이른 순) */
      readonly candidates?: readonly TimeCandidate[];
    };

/** 시간 정책 적용기 (표준시 변경, 서머타임, 경도 보정). 자시 처리는 일주 계산 단계의 몫. */
export interface TimeNormalizer {
  normalize(input: SajuInput, policy: Policy, options?: NormalizeOptions): TimeNormalizeResult;
}

export type CalculationResult =
  | { readonly ok: true; readonly data: SajuData }
  | { readonly ok: false; readonly code: CalculationErrorCode; readonly message: string };

export type CalculationErrorCode =
  | "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY"
  | "NONEXISTENT_LOCAL_TIME"
  | "AMBIGUOUS_LOCAL_TIME"
  | "UNSUPPORTED_INPUT";

export interface SajuCalculator {
  readonly engineVersion: string;
  calculate(input: SajuInput, policy: Policy): CalculationResult;
}
