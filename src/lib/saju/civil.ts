// 순수 달력 산술. Date 객체와 시스템 시간대를 사용하지 않는다.
// "분" 단위 정수 표현: epoch(1970-01-01T00:00Z) 이후 경과 분.

import { TIME_RE } from "./isoDate";

export const MINUTES_PER_DAY = 1440;

export interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** 1970-01-01 기준 일수 (그레고리력, proleptic) */
export function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function civilFromDays(days: number): CivilDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

const p2 = (n: number): string => String(n).padStart(2, "0");
const p4 = (n: number): string => String(n).padStart(4, "0");

/** 달력 날짜 + 시각 → 분 (해당 값을 UTC로 간주한 "벽시계 분") */
export function minutesFromParts(year: number, month: number, day: number, hour: number, minute: number): number {
  return daysFromCivil(year, month, day) * MINUTES_PER_DAY + hour * 60 + minute;
}

export interface DateTimeParts {
  readonly date: string; // YYYY-MM-DD
  readonly time: string; // HH:mm
}

export function partsFromMinutes(minutes: number): DateTimeParts {
  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const rem = minutes - days * MINUTES_PER_DAY;
  const c = civilFromDays(days);
  return {
    date: `${p4(c.year)}-${p2(c.month)}-${p2(c.day)}`,
    time: `${p2(Math.floor(rem / 60))}:${p2(rem % 60)}`,
  };
}

/** 분 → "YYYY-MM-DDTHH:mm:00Z" */
export function isoUtcFromMinutes(minutes: number): string {
  const p = partsFromMinutes(minutes);
  return `${p.date}T${p.time}:00Z`;
}

const ISO_UTC_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):00Z$/;

/** "YYYY-MM-DDTHH:mm:00Z" → 분. 형식이 다르거나 존재하지 않는 시각이면 null. */
export function minutesFromIsoUtc(iso: string): number | null {
  const m = ISO_UTC_RE.exec(iso);
  if (!m) return null;
  const [y, mo, d, h, mi] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])];
  if (!TIME_RE.test(`${m[4]}:${m[5]}`)) return null;
  const back = civilFromDays(daysFromCivil(y, mo, d));
  if (back.year !== y || back.month !== mo || back.day !== d) return null;
  return minutesFromParts(y, mo, d, h, mi);
}
