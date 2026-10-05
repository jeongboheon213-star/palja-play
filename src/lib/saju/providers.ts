// 교체 가능한 계층의 인터페이스. 구현은 Phase 3 이후.

import type { Policy, SolarTermProviderId } from "./policies";
import type { SajuData, SajuInput } from "./types";
import type { VerificationLevel } from "./verification";

// ── 절기 제공자 ────────────────────────────────────────────────
// 역할: 절기의 순간과 주변 절기 정보를 제공하는 것까지. 연주/월주 판단은 하지 않는다.

export type SolarTermErrorCode =
  | "SOLAR_TERM_NOT_BRACKETED"
  | "SOLAR_TERM_DID_NOT_CONVERGE"
  | "SOLAR_TERM_NON_FINITE"
  | "SOLAR_TERM_OUT_OF_SUPPORTED_RANGE"
  | "SOLAR_TERM_INCONSISTENT"
  | "SOLAR_TERM_INVALID_INPUT";

export type ProviderResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: SolarTermErrorCode; readonly message: string };

export interface ProviderInfo {
  readonly id: SolarTermProviderId;
  readonly name: string;
  readonly version: string;
  readonly algorithmVersion: string;
  /** 알고리즘 출처. 확인되지 않으면 internal-alpha */
  readonly source: "internal-alpha" | "kasi" | "external-verified";
}

/** 절기 하나의 순간. 절기 정의 값은 복사본이며 정의 자체는 solarTerms.ts 한 곳에 있다. */
export interface SolarTermInstant {
  readonly termId: string;
  readonly nameKo: string;
  readonly targetLongitude: number;
  readonly order: number;
  /** 표현 단위(밀리초)이며 정확도를 뜻하지 않는다 */
  readonly termInstantUtc: string;
  readonly epochMs: number;
}

export interface SolarTermLookup {
  readonly provider: ProviderInfo;
  readonly verificationStatus: VerificationLevel;
  /** 출력 표현 단위. 정확도가 아니다. */
  readonly precision: { readonly unit: "millisecond" };
  /** 실제 정확도. 외부 기준 대조 전에는 not-verified, 오차 한계는 알 수 없음(null). */
  readonly accuracy: { readonly status: VerificationLevel; readonly errorBoundSeconds: number | null };
  readonly queryInstantUtc: string;
  readonly queryEpochMs: number;
  /** 질의 순간 이하의 가장 최근 절기 (경계 정각이면 새 절기) */
  readonly currentTerm: SolarTermInstant;
  /** currentTerm 바로 앞 절기 */
  readonly previousTerm: SolarTermInstant;
  /** 질의 순간 이후 첫 절기 */
  readonly nextTerm: SolarTermInstant;
  readonly sinceCurrentTermMs: number;
  readonly untilNextTermMs: number;
  readonly boundary: {
    /** A. 수학적 경계: 계산된 절기 순간 그 자체와의 차이 (query - term, 음수면 이전) */
    readonly mathematical: { readonly nearestTerm: SolarTermInstant; readonly signedDistanceMs: number };
    /** B. 서비스 경고 경계: Alpha 정책의 경고 범위. 정확도 기준이 아니다. */
    readonly serviceWarning: {
      readonly warn: boolean;
      readonly windowMinutes: number;
      readonly reason: "alpha-provisional";
      readonly nearestTermId: string;
    };
  };
}

export type SolarTermResult = ProviderResult<SolarTermLookup>;

/** 절기 제공자. Alpha / KASI / Verified 구현으로 교체할 수 있다. */
export interface SolarTermProvider {
  readonly info: ProviderInfo;
  readonly verificationStatus: VerificationLevel;
  /** 호환용. Date에서는 getTime()만 읽는다. */
  getSolarTerm(dateTime: Date): SolarTermResult;
  locate(epochMs: number): SolarTermResult;
  /** [startEpochMs, endEpochMs) 안에 있는 모든 절기 (시간순) */
  termsInRange(startEpochMs: number, endEpochMs: number): ProviderResult<readonly SolarTermInstant[]>;
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
