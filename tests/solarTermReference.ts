// 외부 기준 대조 도구(harness). 기준 데이터가 없으면 NOT RUN 이다.
import { epochMsFromIsoUtc } from "../src/lib/saju/civil";
import type { SolarTermProvider } from "../src/lib/saju/providers";
import { SOLAR_TERMS } from "../src/lib/saju/solarTerms";

export interface SolarTermReferenceCase {
  readonly source: string;
  readonly sourceVersion?: string;
  /** 절기 id (solarTerms.ts 의 id) */
  readonly term: string;
  readonly expectedUtc: string;
  readonly toleranceSeconds: number;
}

export interface ReferenceOutcome {
  readonly case: SolarTermReferenceCase;
  readonly pass: boolean;
  readonly diffSeconds: number | null;
  readonly reason?: string;
}

export type ReferenceStatus = "PASS" | "FAIL" | "NOT RUN";

export function compareAgainstReferences(
  provider: SolarTermProvider,
  cases: readonly SolarTermReferenceCase[],
): { status: ReferenceStatus; outcomes: ReferenceOutcome[] } {
  if (cases.length === 0) return { status: "NOT RUN", outcomes: [] };
  const outcomes: ReferenceOutcome[] = [];
  for (const c of cases) {
    const def = SOLAR_TERMS.find((t) => t.id === c.term);
    const exp = epochMsFromIsoUtc(c.expectedUtc);
    if (!def || exp === null) {
      outcomes.push({ case: c, pass: false, diffSeconds: null, reason: "invalid case" });
      continue;
    }
    // 기준 순간 0.5일 뒤에서 질의하면 currentTerm 이 해당 절기가 된다.
    const r = provider.locate(exp + 12 * 3_600_000);
    if (!r.ok || r.value.currentTerm.termId !== c.term) {
      outcomes.push({ case: c, pass: false, diffSeconds: null, reason: r.ok ? "different term" : r.code });
      continue;
    }
    const diff = (r.value.currentTerm.epochMs - exp) / 1000;
    outcomes.push({ case: c, pass: Math.abs(diff) <= c.toleranceSeconds, diffSeconds: diff });
  }
  return { status: outcomes.every((o) => o.pass) ? "PASS" : "FAIL", outcomes };
}
