// 사주 계산 계층의 공용 타입. Phase 2에서는 타입만 정의하고 계산은 하지 않는다.

import type { Policy } from "./policies";
import type { VerificationStatus, VerificationLevel } from "./verification";

export const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const ELEMENTS = ["목", "화", "토", "금", "수"] as const;
export const TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as const;
export const TWELVE_STAGES = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"] as const;

export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];
export type Element = (typeof ELEMENTS)[number];
export type TenGod = (typeof TEN_GODS)[number];
export type TwelveStage = (typeof TWELVE_STAGES)[number];

export type Gender = "male" | "female";
export type PillarPosition = "year" | "month" | "day" | "hour";

export interface Pillar {
  readonly stem: Stem;
  readonly branch: Branch;
}

/** 검증을 통과한 정규화 입력. 시간 미상은 null. */
export interface SajuInput {
  /** YYYY-MM-DD (양력) */
  readonly birthDate: string;
  /** HH:mm 또는 null(모름) */
  readonly birthTime: string | null;
  readonly gender: Gender;
  readonly calendar: "solar";
  readonly birthCountry: "KR";
}

export type RelationKind =
  | "천간합"
  | "천간충"
  | "지지육합"
  | "지지충"
  | "지지형"
  | "지지해"
  | "지지파"
  | "삼합"
  | "방합";

export interface Relation {
  readonly kind: RelationKind;
  readonly positions: readonly PillarPosition[];
  readonly members: readonly (Stem | Branch)[];
}

/** 절입 계산 근거 기록 (월주 신뢰도 표시용) */
export interface SolarTermRecord {
  readonly provider: "alpha" | "verified" | "kasi";
  readonly verificationStatus: VerificationLevel;
  /** 기준이 된 절기 시각(UTC, ISO). 실행 시각이 아니라 계산 입력에서 정해지는 값. */
  readonly termInstantUtc: string;
  readonly termName: string;
  readonly minutesFromBoundary: number;
  readonly boundaryWarning: boolean;
}

export interface TwelveStageField {
  readonly rule: "unverified" | "verified";
  readonly year: TwelveStage;
  readonly month: TwelveStage;
  readonly day: TwelveStage;
  readonly hour: TwelveStage | null;
}

export interface SajuData {
  readonly schemaVersion: string;
  readonly engineVersion: string;
  readonly input: SajuInput;
  /** 계산에 쓰인 정책 스냅샷 */
  readonly policy: Policy;
  /** 계산 시점의 검증 상태 스냅샷 */
  readonly verification: VerificationStatus;
  readonly pillars: {
    readonly year: Pillar;
    readonly month: Pillar;
    readonly day: Pillar;
    /** 시간 미상이면 null. 추정하지 않는다. */
    readonly hour: Pillar | null;
  };
  readonly dayMaster: Stem;
  readonly elementCounts: Readonly<Record<Element, number>>;
  readonly tenGods: Readonly<Partial<Record<PillarPosition, { stem: TenGod | null; branch: TenGod }>>>;
  /** 계산 필드만 존재. Signals/해석에 연결하지 않는다. */
  readonly twelveStages: TwelveStageField | null;
  readonly relations: readonly Relation[];
  readonly solarTerm: SolarTermRecord;
}

export type { Policy, VerificationStatus, VerificationLevel };

/** 계산 결과의 확정 정도. uncertain/unavailable을 confirmed로 바꾸지 않는다. */
export type CalculationConfidence = "confirmed" | "uncertain" | "unavailable";

/** 화면 문구와 분리된 구조화 경고. 문구는 UI 계층이 정한다. */
export type CalculationWarningCode = "SOLAR_TERM_DAY_TIME_UNKNOWN" | "SOLAR_TERM_BOUNDARY_NEAR";

export interface CalculationWarning {
  readonly code: CalculationWarningCode;
  readonly affects: readonly PillarPosition[];
}
