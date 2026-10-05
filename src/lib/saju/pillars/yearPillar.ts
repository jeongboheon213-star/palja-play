// 연주: 입춘을 경계로 한 "절기 해"의 60갑자.
// 입춘 순간은 SolarTermProvider 결과(SolarTermContext)에서만 읽는다. 여기서 입춘을 계산하지 않는다.

import { pillarFromCycleIndex } from "../ganji";
import type { Pillar } from "../types";
import { confirmed, isIpchun, providerEvidence, resolveTerm, solarYearOfTerm, uncertain, unavailable, type PillarInputs } from "./common";
import type { PillarResult } from "./types";

/** 절기 해(서기) → 연주. 1984년(입춘 이후)이 갑자. */
export function yearPillarForSolarYear(solarYear: number): Pillar {
  return pillarFromCycleIndex(solarYear - 1984);
}

export function calculateYearPillar(inp: PillarInputs): PillarResult {
  const r = resolveTerm(inp.solarTermContext, inp.policy);
  const base = {
    position: "year" as const,
    item: "yearPillar" as const,
    policyDependencies: ["solarTerm.provider", "time.historicalOffsets"] as const,
  };

  if (r.kind === "unavailable") {
    return unavailable({ ...base, evidence: { method: "ipchun-boundary", failure: r.detail, ...providerEvidence(inp) } }, r.reason);
  }

  if (r.kind === "ambiguous") {
    const y = solarYearOfTerm(r.boundaryTerm);
    const evidence = {
      method: "ipchun-boundary",
      timeKnown: false,
      boundaryTermId: r.boundaryTerm.termId,
      boundaryTermInstantUtc: r.boundaryTerm.termInstantUtc,
      ...providerEvidence(inp),
    };
    if (isIpchun(r.boundaryTerm.termId)) {
      // 입춘 당일 + 시간 미상: 전/후 해 중 하나를 고르지 않는다.
      return uncertain({ ...base, evidence }, [yearPillarForSolarYear(y - 1), yearPillarForSolarYear(y)], "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY");
    }
    // 입춘이 아닌 절이면 연도는 바뀌지 않는다.
    return confirmed({ ...base, evidence: { ...evidence, solarYear: y } }, yearPillarForSolarYear(y), false);
  }

  const y = solarYearOfTerm(r.term);
  const risk = r.nearBoundaryTermIds.some(isIpchun);
  return confirmed(
    {
      ...base,
      evidence: {
        method: "ipchun-boundary",
        timeKnown: r.timeKnown,
        referenceTermId: r.term.termId,
        referenceTermInstantUtc: r.term.termInstantUtc,
        solarYear: y,
        ...providerEvidence(inp),
      },
    },
    yearPillarForSolarYear(y),
    risk,
  );
}
