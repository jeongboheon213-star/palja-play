// 겉보기 태양 황경 모델 (internal-alpha).
//
// 출처 상태: 아래 공식은 개발자가 Meeus, "Astronomical Algorithms" 2판 25장(낮은 정확도 태양 좌표)을
//   기억에 의존해 옮겨 적은 것이며, 책 원문과 대조하지 않았다. ΔT 다항식도 같다(Espenak–Meeus 계열을
//   기억에 의존). 출처를 확인하지 못했으므로 source 는 "internal-alpha" 로 기록한다.
// 정확도: 책이 밝힌 모델 정확도(0.01°)는 확인되지 않은 값이다. 태양은 하루에 약 0.9856° 움직이므로
//   0.01° 는 시간으로 환산하면 최대 약 14.6분이다. 실제 오차는 외부 기준과 대조하기 전까지 알 수 없다.
//
// 이 모듈은 순수 함수만 가진다: 현재 시각, Date, 난수, 시스템 시간대를 쓰지 않는다.

import { MS_PER_DAY, civilFromDays, epochMsFromIsoUtc } from "./civil";

export const SOLAR_LONGITUDE_MODEL = Object.freeze({
  id: "meeus-ch25-apparent-low-accuracy",
  version: "0.1.0",
  source: "internal-alpha" as const,
  sourceNote:
    "Meeus Astronomical Algorithms 2nd ed. ch.25 low-accuracy solar coordinates, transcribed from memory and not checked against the book; ΔT polynomials likewise.",
  quantity: "apparent geocentric ecliptic longitude of the Sun",
  frame: "ecliptic and mean equinox of date; nutation and aberration by the model's approximate terms",
  timeScale: "TT = UT + ΔT; input UTC is treated as UT (|UT1-UTC| < 0.9 s ignored)",
  statedModelAccuracyDeg: 0.01,
  statedModelAccuracyNote: "unconfirmed; equals up to ~14.6 minutes of time near the Sun's mean motion of 0.9856 deg/day",
  meanMotionDegPerDay: 0.9856473,
  supportedFromUtc: "1941-01-01T00:00:00Z",
  supportedToUtcExclusive: "2050-01-01T00:00:00Z",
  rangeReason: "ΔT polynomial segments recalled for 1941-2050 only",
});

export const SUPPORTED_FROM_MS = epochMsFromIsoUtc(SOLAR_LONGITUDE_MODEL.supportedFromUtc) as number;
export const SUPPORTED_TO_MS = epochMsFromIsoUtc(SOLAR_LONGITUDE_MODEL.supportedToUtcExclusive) as number;

const DEG = Math.PI / 180;

/** 소수 연도: 연 + (월 - 0.5) / 12 */
function decimalYear(epochMs: number): number {
  const c = civilFromDays(Math.floor(epochMs / MS_PER_DAY));
  return c.year + (c.month - 0.5) / 12;
}

/** ΔT = TT - UT (초). 지원 범위(1941~2049) 밖이면 NaN. */
export function deltaTSeconds(epochMs: number): number {
  const y = decimalYear(epochMs);
  if (y >= 1941 && y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  }
  if (y >= 1961 && y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  }
  if (y >= 1986 && y < 2005) {
    const t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  if (y >= 2005 && y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  return Number.NaN;
}

export function julianDayFromEpochMs(epochMs: number): number {
  return epochMs / MS_PER_DAY + 2440587.5;
}

/** 겉보기 태양 황경 (도, [0,360)). 지원 범위 밖이면 NaN. */
export function apparentSolarLongitudeDeg(epochMs: number): number {
  const dt = deltaTSeconds(epochMs);
  if (!Number.isFinite(dt)) return Number.NaN;
  const jde = julianDayFromEpochMs(epochMs) + dt / 86400;
  const T = (jde - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * DEG;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const trueLon = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = trueLon - 0.00569 - 0.00478 * Math.sin(omega * DEG);
  const r = apparent % 360;
  return r < 0 ? r + 360 : r;
}
