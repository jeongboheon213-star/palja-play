// 네 기둥 결과 타입. 계산 결과와 근거(provenance)를 함께 담는다.

import type { CalculationConfidence, Pillar, PillarPosition } from "../types";
import type { VerificationItemId, VerificationLevel } from "../verification";

/**
 * 기둥을 하나로 정하지 못했거나 계산하지 못한 이유.
 * 화면 문구는 UI 계층이 정한다.
 */
export type PillarReasonCode =
  /** 시간 미상 + 그날 안에 절입이 있음 → 전/후를 고르지 않는다 */
  | "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY"
  /** 시간 미상 + 자시/경도 보정 정책 때문에 날짜가 갈릴 수 있음 */
  | "NEEDS_BIRTH_TIME_FOR_DAY_BOUNDARY"
  /** 시간 미상 → 시주 없음 */
  | "BIRTH_TIME_UNKNOWN"
  /** 절기 제공자가 결과를 주지 못함 */
  | "SOLAR_TERM_UNAVAILABLE"
  /** 날짜 형식 등 입력 문제 */
  | "INVALID_NORMALIZED_INPUT";

/** 이 기둥이 어떤 정책 값에 의존하는가 (정책이 바뀌면 결과가 바뀔 수 있음) */
export type PolicyDependency =
  | "solarTerm.provider"
  | "time.historicalOffsets"
  | "time.longitudeCorrection"
  | "time.jasiPolicy";

export type EvidenceValue = string | number | boolean | null;

export interface PillarResult {
  readonly position: PillarPosition;
  /**
   * confirmed   : 현재 Alpha 엔진의 정책상 하나로 정해짐
   * uncertain   : 현재 엔진에서도 하나로 정할 수 없음 (candidates 참고, 고르지 않음)
   * unavailable : 계산 불가
   */
  readonly confidence: CalculationConfidence;
  /**
   * 결과는 정해졌지만 검증되지 않은 절기 경계 근처라 외부 엔진과 결과가 달라질 수 있음.
   * 결과를 막지 않는다. confidence 와 독립된 값이다.
   */
  readonly boundaryRisk: boolean;
  /** confirmed 일 때만 값이 있다 */
  readonly pillar: Pillar | null;
  readonly ganji: string | null;
  readonly hanja: string | null;
  /** uncertain 일 때 가능한 값들 (시간 순). 고르지 않는다. */
  readonly candidates: readonly Pillar[];
  readonly reason: PillarReasonCode | null;
  /** 계산 근거 (직렬화 가능한 값만) */
  readonly evidence: Readonly<Record<string, EvidenceValue>>;
  readonly policyDependencies: readonly PolicyDependency[];
  readonly verification: { readonly item: VerificationItemId; readonly level: VerificationLevel };
}
