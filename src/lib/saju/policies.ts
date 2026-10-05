// Alpha v0.1 정책. 정답이 아니라 "현재 정책"이며, 이 파일만 바꿔서 교체할 수 있다.

export type JasiPolicy = "midnight" | "jasi" | "splitJasi";
export type SolarTermProviderId = "alpha" | "verified" | "kasi";
export type CalendarKind = "solar";
export type CountryCode = "KR";

export interface CalendarPolicy {
  readonly supportedCalendars: readonly CalendarKind[];
  readonly supportedCountries: readonly CountryCode[];
  /** 지원 시작일 (포함) */
  readonly minSupportedDate: string;
  /** 음력 입력 지원 여부. 날짜를 추측 변환하지 않는다. */
  readonly lunarInput: boolean;
}

export interface TimePolicy {
  /** 역사적 표준시/서머타임 보정 사용 */
  readonly historicalOffsets: boolean;
  /** 보정 자료 출처. OS 시간대 데이터에 런타임 의존하지 않는다. */
  readonly offsetDataSource: "code-fixed";
  readonly longitudeCorrection: boolean;
  readonly referenceLongitude: number;
  readonly jasiPolicy: JasiPolicy;
}

export type BoundaryWarningReason = "alpha-provisional";

/**
 * 서비스 경고 범위. 계산 정확도의 기준이 아니다.
 * 범위 안이라고 계산이 틀렸다는 뜻도, 범위 밖이라고 정확하다는 뜻도 아니다.
 * Alpha 단계에서 경계에 가까운 결과를 보수적으로 표시하기 위한 서비스 정책일 뿐이다.
 */
export interface BoundaryWarningPolicy {
  readonly minutes: number;
  readonly reason: BoundaryWarningReason;
  readonly meaning: "service-warning-window-not-an-accuracy-bound";
}

export interface SolarTermPolicy {
  readonly provider: SolarTermProviderId;
  readonly boundaryWarning: BoundaryWarningPolicy;
  /** 시간 미상 + 절입 당일: 추측하지 않고 시간을 요청한다. */
  readonly unknownTimeOnTermDay: "needs-birth-time";
}

export interface Policy {
  readonly policyVersion: string;
  readonly label: string;
  readonly calendar: CalendarPolicy;
  readonly time: TimePolicy;
  readonly solarTerm: SolarTermPolicy;
  /** 12운성 규칙 상태. 전문가 검증 전까지 unverified. */
  readonly twelveStageRule: "unverified" | "verified";
  /** 12운성을 Signals/해석에 연결할지 여부 */
  readonly twelveStagesInReadings: boolean;
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}

export const ALPHA_POLICY: Policy = deepFreeze({
  policyVersion: "alpha-0.1",
  label: "Alpha v0.1 현재 정책 (최종 정답 아님)",
  calendar: {
    supportedCalendars: ["solar"],
    supportedCountries: ["KR"],
    minSupportedDate: "1962-01-01",
    lunarInput: false,
  },
  time: {
    historicalOffsets: true,
    offsetDataSource: "code-fixed",
    longitudeCorrection: false,
    referenceLongitude: 127.5,
    jasiPolicy: "midnight",
  },
  solarTerm: {
    provider: "alpha",
    boundaryWarning: { minutes: 30, reason: "alpha-provisional", meaning: "service-warning-window-not-an-accuracy-bound" },
    unknownTimeOnTermDay: "needs-birth-time",
  },
  twelveStageRule: "unverified",
  twelveStagesInReadings: false,
});

/** 자시 정책만 바꾼 새 정책을 만든다. 원본은 변경하지 않는다. */
export function withJasiPolicy(base: Policy, jasiPolicy: JasiPolicy): Policy {
  return deepFreeze({ ...base, time: { ...base.time, jasiPolicy } });
}

/** 경도 보정만 바꾼 새 정책을 만든다. */
export function withLongitudeCorrection(base: Policy, on: boolean): Policy {
  return deepFreeze({ ...base, time: { ...base.time, longitudeCorrection: on } });
}
