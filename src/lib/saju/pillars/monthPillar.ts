// 월주: 절(節) 경계로 나눈 달의 60갑자.
// 절입 순간은 SolarTermProvider 결과(SolarTermContext)에서만 읽는다. 절입 시각을 여기 적지 않는다.
//
// 규칙 (표준 월건법)
//  - 월지: 입춘=인(寅), 경칩=묘, 청명=진, 입하=사, 망종=오, 소서=미, 입추=신, 백로=유, 한로=술, 입동=해, 대설=자, 소한=축
//  - 월간: 연간 기준 오호둔(五虎遁). 갑·기년 인월=병인, 을·경년=무인, 병·신년=경인, 정·임년=임인, 무·계년=갑인

import { branchAt, stemAt, stemIndex } from "../ganji";
import type { Pillar } from "../types";
import {
  confirmed,
  governingJeolOrder,
  isIpchun,
  isJeol,
  previousJeolOrder,
  providerEvidence,
  resolveTerm,
  solarYearOfTerm,
  uncertain,
  unavailable,
  type PillarInputs,
} from "./common";
import { yearPillarForSolarYear } from "./yearPillar";
import type { PillarResult } from "./types";

/** (절기 해, 절 순번 1·3·…·23) → 월주 */
export function monthPillarFor(solarYear: number, jeolOrder: number): Pillar {
  const k = (jeolOrder - 1) / 2; // 0 = 인월
  const yearStem = yearPillarForSolarYear(solarYear).stem;
  const inMonthStem = (stemIndex(yearStem) % 5) * 2 + 2; // 갑→병(2), 을→무(4) ...
  return Object.freeze({ stem: stemAt(inMonthStem + k), branch: branchAt(k + 2) });
}

export function calculateMonthPillar(inp: PillarInputs): PillarResult {
  const r = resolveTerm(inp.solarTermContext, inp.policy);
  const base = {
    position: "month" as const,
    item: "monthPillarSolarTerm" as const,
    policyDependencies: ["solarTerm.provider", "time.historicalOffsets"] as const,
  };

  if (r.kind === "unavailable") {
    return unavailable({ ...base, evidence: { method: "jeol-boundary", failure: r.detail, ...providerEvidence(inp) } }, r.reason);
  }

  if (r.kind === "ambiguous") {
    // 시간 미상 + 절입 당일: 절입 전 달 / 절입 후 달 중 고르지 않는다.
    const t = r.boundaryTerm;
    const afterYear = solarYearOfTerm(t);
    const afterOrder = governingJeolOrder(t);
    const beforeOrder = previousJeolOrder(afterOrder);
    const beforeYear = isIpchun(t.termId) ? afterYear - 1 : afterYear;
    return uncertain(
      {
        ...base,
        evidence: {
          method: "jeol-boundary",
          timeKnown: false,
          boundaryTermId: t.termId,
          boundaryTermInstantUtc: t.termInstantUtc,
          ...providerEvidence(inp),
        },
      },
      [monthPillarFor(beforeYear, beforeOrder), monthPillarFor(afterYear, afterOrder)],
      "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY",
    );
  }

  const jeolOrder = governingJeolOrder(r.term);
  const solarYear = solarYearOfTerm(r.term);
  const risk = r.nearBoundaryTermIds.some(isJeol);
  return confirmed(
    {
      ...base,
      evidence: {
        method: "jeol-boundary",
        timeKnown: r.timeKnown,
        referenceTermId: r.term.termId,
        referenceTermInstantUtc: r.term.termInstantUtc,
        governingJeolOrder: jeolOrder,
        solarYear,
        ...providerEvidence(inp),
      },
    },
    monthPillarFor(solarYear, jeolOrder),
    risk,
  );
}
