// 해석 계층 타입. 계산(SajuData)을 근거로만 만들어지며, AI는 계산하지 않는다.

import type { PillarPosition } from "../saju/types";

export type SignalKind = "support" | "tension" | "neutral";

/** SajuData에서 도출된 근거 신호. 모든 점수는 Signal로 추적 가능해야 한다. */
export interface Signal {
  readonly id: string;
  readonly kind: SignalKind;
  /** 근거가 된 SajuData 위치 */
  readonly evidence: readonly { readonly position: PillarPosition; readonly detail: string }[];
  /** 서로 반대 방향인 신호의 id (Tension일 때) */
  readonly opposes?: string;
}

export const STAT_KEYS = ["drive", "stability", "social", "insight", "creativity", "resilience", "fortune"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export interface Score {
  readonly stat: StatKey;
  /** 0~100 */
  readonly value: number;
  /** 이 점수를 만든 Signal id. 비어 있으면 안 된다. */
  readonly signalIds: readonly string[];
}

export type ReadingTier = "free" | "premium";
/** FREE = WHAT, PREMIUM = WHY / HOW / WHEN */
export type ReadingAxis = "what" | "why" | "how" | "when";

export interface Reading {
  readonly id: string;
  readonly tier: ReadingTier;
  readonly axis: ReadingAxis;
  readonly title: string;
  readonly body: string;
  readonly signalIds: readonly string[];
}
