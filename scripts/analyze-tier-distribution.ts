// Development-only tier reference distribution analyzer.
// No user data, network, randomness, or current time. It samples the supported solar-date domain.
// Output is analysis only; do not ship its generated numbers until reviewed.

import { computeBetaResult } from "../src/lib/engine/index";
import { STAT_KEYS, type StatKey } from "../src/lib/interpretation/types";
import { SCORE_VERSION } from "../src/lib/interpretation/score";

const START = Date.UTC(1962, 0, 1);
const END = Date.UTC(2026, 11, 31);
const STEP_DAYS = 5;
const TIMES = ["00:30", "06:30", "12:30", "18:30"] as const;
const GENDERS = ["male", "female"] as const;

type Row = Record<StatKey, number> & { total: number };

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) throw new Error("empty sample");
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i]!;
}

function summary(values: readonly number[]) {
  const s = [...values].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const variance = s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length;
  return {
    n: s.length,
    min: s[0],
    max: s.at(-1),
    mean: Number(mean.toFixed(3)),
    median: quantile(s, 0.5),
    std: Number(Math.sqrt(variance).toFixed(3)),
    p01: quantile(s, 0.01),
    p05: quantile(s, 0.05),
    p10: quantile(s, 0.10),
    p20: quantile(s, 0.20),
    p35: quantile(s, 0.35),
    p50: quantile(s, 0.50),
    p75: quantile(s, 0.75),
    p90: quantile(s, 0.90),
    p95: quantile(s, 0.95),
    p99: quantile(s, 0.99),
  };
}

const rows: Row[] = [];
let rejected = 0;
for (let ms = START; ms <= END; ms += STEP_DAYS * 86400000) {
  const birthDate = ymd(ms);
  for (const birthTime of TIMES) {
    for (const gender of GENDERS) {
      const r = computeBetaResult({ birthDate, birthTime, gender, calendar: "solar", birthCountry: "KR" });
      if (!r.ok) { rejected++; continue; }
      const row = {} as Row;
      for (const k of STAT_KEYS) row[k] = r.free.scores.find((x) => x.stat === k)!.value;
      row.total = Math.round(STAT_KEYS.reduce((sum, k) => sum + row[k], 0) / STAT_KEYS.length);
      rows.push(row);
    }
  }
}

if (!rows.length) throw new Error("no valid samples");
const fields = [...STAT_KEYS, "total"] as const;
const report = Object.fromEntries(fields.map((k) => [k, summary(rows.map((r) => r[k]))]));
console.log(JSON.stringify({
  distributionVersion: "tier-reference-0.1.0-analysis",
  scoreVersion: SCORE_VERSION,
  methodology: {
    populationClaim: false,
    label: "사주팔자PLAY 기준 분포",
    dateRange: ["1962-01-01", "2026-12-31"],
    stepDays: STEP_DAYS,
    times: TIMES,
    genders: GENDERS,
    totalFormula: "rounded equal-weight mean of 7 PLAY scores",
  },
  accepted: rows.length,
  rejected,
  report,
}, null, 2));
