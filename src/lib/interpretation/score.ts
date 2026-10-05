// Signals → 7개 능력치. 난수 없음, 같은 Signal 목록이면 항상 같은 점수.
// 점수는 전통 사주의 절대 측정값이 아니라 사주팔자PLAY 서비스용 해석 지표다.
//
// 계산
//  raw   = Σ(positive 강도) − Σ(negative 강도)   (neutral 은 0)
//  z     = (raw − center) / spread               (영역마다 Signal 개수가 달라서 눈금을 맞춘다)
//  value = round(mid + amp × tanh(z / soft))     (극단값이 부드럽게 수렴, min~max 안)
//
// center/spread 는 내부 표본(1962~2026, 5일 간격 × 시간 4종)의 raw 평균·표준편차를 반올림한 고정값이다.
// 실제 사용자 분포가 아니며, 바꾸면 SCORE_VERSION 을 올린다.

import type { SignalSet } from "./signals";
import { STAT_KEYS, STAT_LABELS, type Score, type ScoreSet, type StatKey } from "./types";

export const SCORE_VERSION = "score-0.1.0" as const;

export const SCORE_RULE = Object.freeze({
  mid: 62,
  amp: 30,
  soft: 1.6,
  calibration: Object.freeze({
    wealth: { center: 3.5, spread: 3.0 },
    love: { center: 2.7, spread: 2.0 },
    business: { center: 2.8, spread: 2.1 },
    career: { center: 4.0, spread: 2.7 },
    relationship: { center: 0.3, spread: 1.6 },
    execution: { center: 1.7, spread: 1.2 },
    flow: { center: 0.6, spread: 1.3 },
  } satisfies Record<StatKey, { center: number; spread: number }>),
});

export function rawOf(set: SignalSet, stat: StatKey): number {
  let raw = 0;
  for (const s of set.signals) {
    if (s.domain !== stat) continue;
    if (s.polarity === "positive") raw += s.strength;
    else if (s.polarity === "negative") raw -= s.strength;
  }
  return raw;
}

export function scoreSignals(set: SignalSet): ScoreSet {
  const scores: Score[] = STAT_KEYS.map((stat) => {
    const { center, spread } = SCORE_RULE.calibration[stat];
    const z = (rawOf(set, stat) - center) / spread;
    const value = Math.round(SCORE_RULE.mid + SCORE_RULE.amp * Math.tanh(z / SCORE_RULE.soft));
    const ids = set.signals.filter((s) => s.domain === stat).map((s) => s.id);
    return Object.freeze({ stat, label: STAT_LABELS[stat], value, signalIds: Object.freeze(ids) });
  });
  return Object.freeze({ scoreVersion: SCORE_VERSION, scores: Object.freeze(scores), kind: "service-indicator" as const });
}
