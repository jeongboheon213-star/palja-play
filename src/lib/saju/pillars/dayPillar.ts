// 일주: 날짜의 60갑자 (절기와 무관).
//
// 방식: 율리우스 적일(JDN, Fliegel–Van Flandern 정수 공식)에서 60갑자 순번 = (JDN + 49) mod 60.
// 검증 상태: 다른 독립 공식(테스트 쪽 구현)과의 내부 일치만 확인 → verified-internally 를 넘지 않는다.
//
// 날짜 경계는 자시 정책을 따른다.
//  - midnight / splitJasi : 00:00 에 날짜가 바뀐다
//  - jasi                 : 23:00 부터 다음 날 일주
// 시간 미상인데 정책상 날짜가 갈릴 수 있으면(jasi 정책, 경도 보정) 고르지 않고 uncertain.

import { parseHm, parseIsoDate } from "../isoDate";
import { daysFromCivil, civilFromDays } from "../civil";
import { pillarFromCycleIndex } from "../ganji";
import type { Pillar } from "../types";
import { confirmed, uncertain, unavailable, type PillarInputs } from "./common";
import type { PillarResult } from "./types";

/** 그레고리력 날짜 → 율리우스 적일 (정수 공식, Date 미사용) */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.trunc((month - 14) / 12);
  return (
    Math.trunc((1461 * (year + 4800 + a)) / 4) +
    Math.trunc((367 * (month - 2 - 12 * a)) / 12) -
    Math.trunc((3 * Math.trunc((year + 4900 + a) / 100)) / 4) +
    day -
    32075
  );
}

/** 날짜 → 일주 60갑자 순번 (0 = 갑자) */
export function dayCycleIndex(year: number, month: number, day: number): number {
  return (((julianDayNumber(year, month, day) + 49) % 60) + 60) % 60;
}

export function dayPillarForDate(isoDate: string): Pillar | null {
  const d = parseIsoDate(isoDate);
  if (!d) return null;
  return pillarFromCycleIndex(dayCycleIndex(d.year, d.month, d.day));
}

/** ISO 날짜를 days 만큼 이동 */
export function shiftDate(isoDate: string, days: number): string | null {
  const d = parseIsoDate(isoDate);
  if (!d) return null;
  const c = civilFromDays(daysFromCivil(d.year, d.month, d.day) + days);
  return `${String(c.year).padStart(4, "0")}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
}

/** 자시 정책을 적용한 "일주 날짜". 시간 미상이면 effective 날짜 그대로. */
export function dayPillarDate(effectiveDate: string, effectiveTime: string | null, jasi: "midnight" | "jasi" | "splitJasi"): string | null {
  if (effectiveTime === null || jasi !== "jasi") return effectiveDate;
  const hm = parseHm(effectiveTime);
  if (!hm) return null;
  return hm.hour === 23 ? shiftDate(effectiveDate, 1) : effectiveDate;
}

export function calculateDayPillar(inp: PillarInputs): PillarResult {
  const n = inp.normalized;
  const jasi = inp.policy.time.jasiPolicy;
  const base = {
    position: "day" as const,
    item: "dayPillar" as const,
    policyDependencies: ["time.historicalOffsets", "time.longitudeCorrection", "time.jasiPolicy"] as const,
  };
  const evidence = {
    method: "jdn-mod-60",
    effectiveDate: n.effective.date,
    effectiveTime: n.effective.time,
    jasiPolicy: jasi,
    timeKnown: n.timeKnown,
  };

  if (!n.timeKnown) {
    const today = dayPillarForDate(n.effective.date);
    if (!today) return unavailable({ ...base, evidence }, "INVALID_NORMALIZED_INPUT");
    // 자시 정책이 23시에 날짜를 넘기면 23:00~23:59 출생은 다음 날 일주 → 시간 없이는 정할 수 없다.
    if (jasi === "jasi") {
      const next = dayPillarForDate(shiftDate(n.effective.date, 1) ?? "");
      return uncertain({ ...base, evidence }, next ? [today, next] : [today], "NEEDS_BIRTH_TIME_FOR_DAY_BOUNDARY");
    }
    // 경도 보정이 시각을 앞으로 당기면 자정 직후 출생은 전날이 된다.
    const lon = n.adjustments.longitudeMinutes;
    if (lon !== 0) {
      const other = dayPillarForDate(shiftDate(n.effective.date, lon < 0 ? -1 : 1) ?? "");
      const cands = other ? (lon < 0 ? [other, today] : [today, other]) : [today];
      return uncertain({ ...base, evidence: { ...evidence, longitudeMinutes: lon } }, cands, "NEEDS_BIRTH_TIME_FOR_DAY_BOUNDARY");
    }
    return confirmed({ ...base, evidence: { ...evidence, dayPillarDate: n.effective.date } }, today, false);
  }

  const date = dayPillarDate(n.effective.date, n.effective.time, jasi);
  const p = date === null ? null : dayPillarForDate(date);
  if (!p || date === null) return unavailable({ ...base, evidence }, "INVALID_NORMALIZED_INPUT");
  return confirmed({ ...base, evidence: { ...evidence, dayPillarDate: date } }, p, false);
}
