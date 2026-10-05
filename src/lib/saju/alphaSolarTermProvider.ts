// AlphaSolarTermProvider (internal-alpha, not-verified).
//
// 알고리즘 요약
//  - 태양 황경: astronomy.ts 의 apparentSolarLongitudeDeg (모델 정보는 SOLAR_LONGITUDE_MODEL).
//  - 절기 순간: 해당 절기 목표 황경과의 원형 차이 f(t) = circularDiff(λ(t), target) 의 영점.
//    f 는 해당 구간에서 단조 증가하므로 [lo, hi] 를 먼저 찾고(f(lo) < 0 <= f(hi)),
//    정수 밀리초 이분법으로 hi - lo <= 1 ms 가 될 때까지 좁힌다. 결과는 f(t) >= 0 이 되는 최소 정수 ms.
//  - 탐색: 추정 순간 ± 3일에서 시작, 브래킷 실패 시 최대 5번 2배 확장. 이분법 최대 64회.
//  - 실패하면 근사 시각을 돌려주지 않고 구조화 오류를 돌려준다.
//  - 전역 캐시 없음. 호출마다 순수하게 계산한다 (질의당 황경 평가 약 100회).
//
// 밀리초 출력은 표현 단위(precision)이며 정확도(accuracy)가 아니다.
// 이 모듈은 연주/월주를 판단하지 않는다.

import { MS_PER_DAY, MS_PER_MINUTE, isoUtcFromEpochMs } from "./civil";
import { circularDifferenceDeg, normalizeDegrees } from "./angles";
import { SOLAR_LONGITUDE_MODEL, SUPPORTED_FROM_MS, SUPPORTED_TO_MS, apparentSolarLongitudeDeg } from "./astronomy";
import type { BoundaryWarningPolicy } from "./policies";
import type {
  ProviderInfo,
  ProviderResult,
  SolarTermErrorCode,
  SolarTermInstant,
  SolarTermLookup,
  SolarTermProvider,
  SolarTermResult,
} from "./providers";
import { SOLAR_TERMS, termAt, termIndexForLongitude, type SolarTermDefinition } from "./solarTerms";

export const ALPHA_PROVIDER_VERSION = "alpha-solar-term-0.1.0";
export const ALPHA_ALGORITHM_VERSION = `${SOLAR_LONGITUDE_MODEL.id}/${SOLAR_LONGITUDE_MODEL.version}`;

export interface AlphaSolarTermProviderOptions {
  /** 서비스 경고 범위(정책). 정확도 기준이 아니다. */
  readonly boundaryWarning: BoundaryWarningPolicy;
  /** 테스트/교체용 황경 함수. 기본은 내장 모델. */
  readonly longitudeFn?: (epochMs: number) => number;
  /** 이분법 최대 반복 (기본 64) */
  readonly maxIterations?: number;
  /** 지원 범위(밀리초). 기본은 내장 모델 범위 */
  readonly supportedRange?: { readonly fromEpochMs: number; readonly toEpochMs: number };
}

const INITIAL_HALF_WIDTH_MS = 3 * MS_PER_DAY;
const MAX_BRACKET_EXPANSIONS = 5;
const MEAN_RATE_DEG_PER_DAY = SOLAR_LONGITUDE_MODEL.meanMotionDegPerDay;
const TERM_SPACING_GUESS_MS = 15.2 * MS_PER_DAY;
const MAX_RANGE_MS = 400 * MS_PER_DAY;

function fail(code: SolarTermErrorCode, message: string): { ok: false; code: SolarTermErrorCode; message: string } {
  return { ok: false, code, message };
}

export function createAlphaSolarTermProvider(options: AlphaSolarTermProviderOptions): SolarTermProvider {
  const lon = options.longitudeFn ?? apparentSolarLongitudeDeg;
  const maxIter = options.maxIterations ?? 64;
  const rangeFrom = options.supportedRange?.fromEpochMs ?? SUPPORTED_FROM_MS;
  const rangeTo = options.supportedRange?.toEpochMs ?? SUPPORTED_TO_MS;
  const warnMs = options.boundaryWarning.minutes * MS_PER_MINUTE;

  const info: ProviderInfo = Object.freeze({
    id: "alpha" as const,
    name: "AlphaSolarTermProvider",
    version: ALPHA_PROVIDER_VERSION,
    algorithmVersion: ALPHA_ALGORITHM_VERSION,
    source: "internal-alpha" as const,
  });

  function inRange(ms: number): boolean {
    return ms >= rangeFrom && ms < rangeTo;
  }

  function toInstant(def: SolarTermDefinition, epochMs: number): SolarTermInstant {
    return {
      termId: def.id,
      nameKo: def.nameKo,
      targetLongitude: def.targetLongitude,
      order: def.order,
      termInstantUtc: isoUtcFromEpochMs(epochMs),
      epochMs,
    };
  }

  /** def 의 목표 황경을 지나는 가장 가까운 순간(정수 ms)을 guess 근처에서 찾는다. */
  function crossing(def: SolarTermDefinition, guessMs: number): ProviderResult<number> {
    const f = (t: number): number => circularDifferenceDeg(lon(t), def.targetLongitude);
    let half = INITIAL_HALF_WIDTH_MS;
    let lo = 0;
    let hi = 0;
    let bracketed = false;
    for (let attempt = 0; attempt <= MAX_BRACKET_EXPANSIONS; attempt++) {
      lo = Math.round(guessMs - half);
      hi = Math.round(guessMs + half);
      if (!inRange(lo) || !inRange(hi)) {
        return fail("SOLAR_TERM_OUT_OF_SUPPORTED_RANGE", `절기 탐색 구간이 지원 범위 밖입니다 (${def.nameKo}).`);
      }
      const flo = f(lo);
      const fhi = f(hi);
      if (!Number.isFinite(flo) || !Number.isFinite(fhi)) {
        return fail("SOLAR_TERM_NON_FINITE", `황경 계산 결과가 유한하지 않습니다 (${def.nameKo}).`);
      }
      if (flo < 0 && fhi >= 0) {
        bracketed = true;
        break;
      }
      half *= 2;
    }
    if (!bracketed) return fail("SOLAR_TERM_NOT_BRACKETED", `절기 순간을 포함하는 구간을 찾지 못했습니다 (${def.nameKo}).`);

    for (let i = 0; i < maxIter; i++) {
      if (hi - lo <= 1) return { ok: true, value: hi };
      const mid = Math.floor((lo + hi) / 2);
      const fm = f(mid);
      if (!Number.isFinite(fm)) return fail("SOLAR_TERM_NON_FINITE", `황경 계산 결과가 유한하지 않습니다 (${def.nameKo}).`);
      if (fm < 0) lo = mid;
      else hi = mid;
    }
    if (hi - lo <= 1) return { ok: true, value: hi };
    return fail("SOLAR_TERM_DID_NOT_CONVERGE", `최대 반복 횟수 안에 수렴하지 않았습니다 (${def.nameKo}).`);
  }

  function locate(epochMs: number): SolarTermResult {
    if (typeof epochMs !== "number" || !Number.isFinite(epochMs) || !Number.isInteger(epochMs)) {
      return fail("SOLAR_TERM_INVALID_INPUT", "질의 순간은 정수 밀리초여야 합니다.");
    }
    if (!inRange(epochMs)) return fail("SOLAR_TERM_OUT_OF_SUPPORTED_RANGE", "지원 범위 밖의 순간입니다.");
    const lambda = lon(epochMs);
    if (!Number.isFinite(lambda)) return fail("SOLAR_TERM_NON_FINITE", "황경 계산 결과가 유한하지 않습니다.");

    const k0 = termIndexForLongitude(lambda);
    const def0 = termAt(k0);
    const delta = normalizeDegrees(lambda - def0.targetLongitude); // [0, 15) 근방
    const guess0 = epochMs - Math.round((delta / MEAN_RATE_DEG_PER_DAY) * MS_PER_DAY);
    const c0 = crossing(def0, guess0);
    if (!c0.ok) return c0;

    let curIdx = k0;
    let curMs = c0.value;
    if (epochMs < curMs) {
      // 밀리초 반올림 경계에서 한 절기 앞으로 물러난다
      curIdx = (k0 + 23) % 24;
      const c = crossing(termAt(curIdx), curMs - TERM_SPACING_GUESS_MS);
      if (!c.ok) return c;
      curMs = c.value;
    }
    const prevIdx = (curIdx + 23) % 24;
    const nextIdx = (curIdx + 1) % 24;
    const cp = crossing(termAt(prevIdx), curMs - TERM_SPACING_GUESS_MS);
    if (!cp.ok) return cp;
    const cn = crossing(termAt(nextIdx), curMs + TERM_SPACING_GUESS_MS);
    if (!cn.ok) return cn;

    if (!(cp.value < curMs && curMs <= epochMs && epochMs < cn.value)) {
      return fail("SOLAR_TERM_INCONSISTENT", "절기 순서가 일관되지 않습니다.");
    }

    const currentTerm = toInstant(termAt(curIdx), curMs);
    const previousTerm = toInstant(termAt(prevIdx), cp.value);
    const nextTerm = toInstant(termAt(nextIdx), cn.value);
    const since = epochMs - curMs;
    const until = cn.value - epochMs;
    const nearestIsCurrent = since <= until;
    const nearest = nearestIsCurrent ? currentTerm : nextTerm;
    const signed = nearestIsCurrent ? since : -until;

    const value: SolarTermLookup = {
      provider: info,
      verificationStatus: "not-verified",
      precision: { unit: "millisecond" },
      accuracy: { status: "not-verified", errorBoundSeconds: null },
      queryInstantUtc: isoUtcFromEpochMs(epochMs),
      queryEpochMs: epochMs,
      currentTerm,
      previousTerm,
      nextTerm,
      sinceCurrentTermMs: since,
      untilNextTermMs: until,
      boundary: {
        mathematical: { nearestTerm: nearest, signedDistanceMs: signed },
        serviceWarning: {
          warn: Math.abs(signed) <= warnMs,
          windowMinutes: options.boundaryWarning.minutes,
          reason: options.boundaryWarning.reason,
          nearestTermId: nearest.termId,
        },
      },
    };
    return { ok: true, value };
  }

  function termsInRange(startEpochMs: number, endEpochMs: number): ProviderResult<readonly SolarTermInstant[]> {
    if (![startEpochMs, endEpochMs].every((n) => Number.isFinite(n) && Number.isInteger(n))) {
      return fail("SOLAR_TERM_INVALID_INPUT", "구간 경계는 정수 밀리초여야 합니다.");
    }
    if (endEpochMs <= startEpochMs) return { ok: true, value: [] };
    if (endEpochMs - startEpochMs > MAX_RANGE_MS) return fail("SOLAR_TERM_INVALID_INPUT", "구간이 너무 깁니다 (최대 400일).");
    const first = locate(startEpochMs);
    if (!first.ok) return first;
    const out: SolarTermInstant[] = [];
    let cur = first.value.currentTerm;
    if (cur.epochMs >= startEpochMs && cur.epochMs < endEpochMs) out.push(cur);
    let next = first.value.nextTerm;
    const maxSteps = Math.ceil((endEpochMs - startEpochMs) / (13 * MS_PER_DAY)) + 2;
    for (let i = 0; i < maxSteps && next.epochMs < endEpochMs; i++) {
      out.push(next);
      cur = next;
      const idx = SOLAR_TERMS.findIndex((t) => t.id === cur.termId);
      const c = crossing(termAt(idx + 1), cur.epochMs + TERM_SPACING_GUESS_MS);
      if (!c.ok) return c;
      next = toInstant(termAt(idx + 1), c.value);
    }
    return { ok: true, value: out };
  }

  function getSolarTerm(dateTime: Date): SolarTermResult {
    // 호환용 어댑터: Date 의 getTime() 만 읽는다 (현재 시각/시간대 사용 없음).
    return locate(dateTime.getTime());
  }

  return Object.freeze({ info, verificationStatus: "not-verified" as const, getSolarTerm, locate, termsInRange });
}

