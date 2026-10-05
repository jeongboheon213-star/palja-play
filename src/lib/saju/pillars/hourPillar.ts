// 시주: 출생 시간이 있을 때만 계산한다. 시간 미상이면 hourPillar = null (임의 시각을 넣지 않는다).
//
// 규칙
//  - 시지: effective 시각 기준 2시간 단위. 자시 23:00~00:59, 축시 01:00~02:59, … 해시 21:00~22:59
//  - 시간: 오서둔(五鼠遁). 갑·기일 자시=갑자, 을·경일=병자, 병·신일=무자, 정·임일=경자, 무·계일=임자
//  - 23시대(자시 앞부분)의 일간 기준:
//      jasi                 : 일주 자체가 다음 날로 넘어가므로 그 일간을 쓴다
//      midnight / splitJasi : 일주는 당일이지만 자시는 다음 날의 첫 시진이므로 다음 날 일간 기준 (시주가 2시간마다 끊김 없이 이어진다)
//    이 선택은 Alpha 정책이며 전문가 검토 전이다 (verification: jasiPolicy not-verified).

import { parseHm } from "../isoDate";
import { branchAt, stemAt, stemIndex } from "../ganji";
import type { Pillar, Stem } from "../types";
import { confirmed, unavailable, type PillarInputs } from "./common";
import { dayPillarDate, dayPillarForDate, shiftDate } from "./dayPillar";
import type { PillarResult } from "./types";

/** 시각(시) → 시지 순번 (0 = 자) */
export function hourBranchIndex(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

export function hourPillarFor(dayStem: Stem, hour: number): Pillar {
  const b = hourBranchIndex(hour);
  const ziStem = (stemIndex(dayStem) % 5) * 2; // 갑→갑(0), 을→병(2) ...
  return Object.freeze({ stem: stemAt(ziStem + b), branch: branchAt(b) });
}

export function calculateHourPillar(inp: PillarInputs): PillarResult | null {
  const n = inp.normalized;
  // 시간 미상: 시주는 없다.
  if (!n.timeKnown || n.effective.time === null) return null;

  const jasi = inp.policy.time.jasiPolicy;
  const base = {
    position: "hour" as const,
    item: "hourPillar" as const,
    policyDependencies: ["time.historicalOffsets", "time.longitudeCorrection", "time.jasiPolicy"] as const,
  };
  const hm = parseHm(n.effective.time);
  const evidence = { method: "two-hour-branch+day-stem", effectiveDate: n.effective.date, effectiveTime: n.effective.time, jasiPolicy: jasi };
  if (!hm) return unavailable({ ...base, evidence }, "INVALID_NORMALIZED_INPUT");

  // 시간의 기준이 되는 날짜
  let stemDate = dayPillarDate(n.effective.date, n.effective.time, jasi);
  if (stemDate !== null && hm.hour === 23 && jasi !== "jasi") stemDate = shiftDate(stemDate, 1);
  const dayP = stemDate === null ? null : dayPillarForDate(stemDate);
  if (!dayP || stemDate === null) return unavailable({ ...base, evidence }, "INVALID_NORMALIZED_INPUT");

  return confirmed(
    { ...base, evidence: { ...evidence, hourStemBaseDate: stemDate, hourStemBaseDayStem: dayP.stem, lateZiHour: hm.hour === 23 } },
    hourPillarFor(dayP.stem, hm.hour),
    false,
  );
}
