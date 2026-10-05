// 날짜/시간 문자열 순수 유틸. 시스템 시간대·현재 시각에 의존하지 않는다.

export const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const TIME_SHAPE_RE = /^\d{2}:\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface IsoDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  const table = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[month - 1] ?? 0;
}

/** 엄격한 YYYY-MM-DD 파싱. 달력상 존재하지 않는 날짜(2월 30일 등)는 null. */
export function parseIsoDate(s: string): IsoDateParts | null {
  const m = ISO_DATE_RE.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isValidIsoDate(s: string): boolean {
  return parseIsoDate(s) !== null;
}

/** 유효한 ISO 날짜끼리만 비교할 것. 사전식 비교가 곧 날짜 비교다. */
export function compareIsoDate(a: string, b: string): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 엄격한 HH:mm (00:00~23:59). "24:00", "7:05" 등은 null. */
export function parseHm(s: string): { hour: number; minute: number } | null {
  const m = TIME_RE.exec(s);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}
