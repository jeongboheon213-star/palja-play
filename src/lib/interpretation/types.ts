// 해석 계층 타입. SajuData → Signals → Score → Reading.
// 계산(SajuData)을 근거로만 만들어지며, AI·난수를 쓰지 않는다.

import type { PillarPosition } from "../saju/types";
import type { VerificationLevel } from "../saju/verification";

export const DOMAINS = ["personality", "wealth", "love", "career", "business", "relationship", "execution", "flow"] as const;
export type Domain = (typeof DOMAINS)[number];

/**
 * positive : 이 영역 지표를 올리는 방향의 근거
 * negative : 이 영역에서 주의가 필요한 방향의 근거 (나쁘다는 뜻이 아니라 반대 방향)
 * neutral  : 성향 설명용, 점수에 영향 없음
 */
export type Polarity = "positive" | "negative" | "neutral";
export type Strength = 1 | 2 | 3;

export type EvidenceSource = "dayMaster" | "tenGods" | "fiveElements" | "relations" | "strengthIndex";

export interface SignalEvidence {
  readonly source: EvidenceSource;
  readonly positions: readonly PillarPosition[];
  /** 사람이 읽을 근거 요약 (내부/디버그용, 사용자 문구 아님) */
  readonly detail: string;
}

export interface Signal {
  /** 규칙 id. 같은 SajuData 면 항상 같은 id 집합 */
  readonly id: string;
  readonly domain: Domain;
  readonly polarity: Polarity;
  readonly strength: Strength;
  readonly evidence: readonly SignalEvidence[];
  /** 근거 데이터의 검증 상태 중 가장 낮은 값 */
  readonly sourceVerification: VerificationLevel;
}

export const STAT_KEYS = ["wealth", "love", "business", "career", "relationship", "execution", "flow"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** 화면 이름 (기존 UI 유지) */
export const STAT_LABELS: Readonly<Record<StatKey, string>> = Object.freeze({
  wealth: "재물력",
  love: "연애력",
  business: "사업력",
  career: "직업력",
  relationship: "인간관계",
  execution: "실행력",
  flow: "운의 흐름",
});

export interface Score {
  readonly stat: StatKey;
  readonly label: string;
  /** 0~100. 전통 사주의 절대 측정값이 아니라 팔자PLAY 서비스용 해석 지표 */
  readonly value: number;
  /** 이 점수를 만든 Signal id. 비어 있으면 안 된다. */
  readonly signalIds: readonly string[];
}

export interface ScoreSet {
  readonly scoreVersion: string;
  readonly scores: readonly Score[];
  /** 점수의 성격 표시 */
  readonly kind: "service-indicator";
}
