// Independent display layer: score and battle rules remain owned by their existing engines.
import { STAT_KEYS, type StatKey } from "../interpretation/types";
import { REFERENCE_HISTOGRAMS, REFERENCE_SAMPLE_SIZE, TIER_REFERENCE_VERSION } from "./reference";
export { TIER_REFERENCE_VERSION };
export const TIER_VERSION = "tier-0.1.0";
export const TIER_BANDS = [
  { tier: "S+", maxTopPercent: 1 }, { tier: "S", maxTopPercent: 5 },
  { tier: "A+", maxTopPercent: 15 }, { tier: "A", maxTopPercent: 35 },
  { tier: "B+", maxTopPercent: 60 }, { tier: "B", maxTopPercent: 85 },
  { tier: "C", maxTopPercent: 100 },
] as const;
export interface TierResult {
  readonly tier: (typeof TIER_BANDS)[number]["tier"];
  readonly score: number;
  /** Inclusive upper tail: all tied scores receive the same conservative rank. */
  readonly topPercent: number;
  readonly percentile: number;
  readonly label: string;
  readonly tierVersion: string;
  readonly referenceVersion: string;
}
export function tierFor(score: number, field: StatKey | "total" = "total"): TierResult {
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error("Invalid PLAY score");
  const histogram = REFERENCE_HISTOGRAMS[field];
  const atOrAbove = histogram.slice(score).reduce((sum: number, n: number) => sum + n, 0);
  const top = atOrAbove * 100 / REFERENCE_SAMPLE_SIZE;
  const topPercent = Math.ceil(top * 10) / 10;
  const tier = TIER_BANDS.find((b) => top <= b.maxTopPercent)!.tier;
  return Object.freeze({ tier, score, topPercent, percentile: 100 - topPercent,
    label: `사주팔자PLAY 기준 상위 ${topPercent === 0 ? "0.1% 미만" : `${topPercent}%`}`,
    tierVersion: TIER_VERSION, referenceVersion: TIER_REFERENCE_VERSION });
}
export function tiersForScores(scores: readonly number[]) {
  if (scores.length !== STAT_KEYS.length) throw new Error("Seven scores required");
  const stats = STAT_KEYS.map((stat, i) => Object.freeze({ stat, ...tierFor(scores[i]!, stat) }));
  const total = tierFor(Math.round(scores.reduce((a, b) => a + b, 0) / STAT_KEYS.length));
  // Best relative standing, then original STAT_KEYS order for ties.
  const topStat = stats.reduce((a, b) => b.topPercent < a.topPercent ? b : a);
  return Object.freeze({ total, stats: Object.freeze(stats), topStat });
}
