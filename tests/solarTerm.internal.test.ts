// [B] Internal consistency tests: 구현 내부 일관성. 외부 기준과의 일치(정확도)를 뜻하지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAlphaSolarTermProvider } from "../src/lib/saju/alphaSolarTermProvider";
import { apparentSolarLongitudeDeg } from "../src/lib/saju/astronomy";
import { ALPHA_POLICY } from "../src/lib/saju/policies";
import { MS_PER_DAY, MS_PER_MINUTE, civilFromDays, epochMsFromIsoUtc } from "../src/lib/saju/civil";
import { circularDifferenceDeg, normalizeDegrees } from "../src/lib/saju/angles";
import { SOLAR_TERMS } from "../src/lib/saju/solarTerms";
import { createKrTimeNormalizer } from "../src/lib/saju/timeNormalizer";
import { KR_TIME_HISTORY } from "../src/data/saju/kr-time-history";
import { resolveSolarTermContext } from "../src/lib/saju/solarTermContext";
import type { NormalizedBirthTime, SolarTermInstant, SolarTermLookup } from "../src/lib/saju/providers";
import type { SajuInput } from "../src/lib/saju/types";

const BW = ALPHA_POLICY.solarTerm.boundaryWarning;
const P = createAlphaSolarTermProvider({ boundaryWarning: BW });
const N = createKrTimeNormalizer(KR_TIME_HISTORY);
const ms = (s: string): number => epochMsFromIsoUtc(s) as number;
const lookup = (t: number): SolarTermLookup => {
  const r = P.locate(t);
  assert.ok(r.ok, r.ok ? "" : r.code);
  if (!r.ok) throw new Error("unreachable");
  return r.value;
};
const utcYmd = (t: number) => civilFromDays(Math.floor(t / MS_PER_DAY));

/** 1962-01-01 ~ 2031-01-01 의 모든 절기를 400일 이하 구간으로 나눠 수집 */
function allTerms(): SolarTermInstant[] {
  const out: SolarTermInstant[] = [];
  let a = ms("1962-01-01T00:00:00Z");
  const end = ms("2031-01-01T00:00:00Z");
  while (a < end) {
    const b = Math.min(a + 300 * MS_PER_DAY, end);
    const r = P.termsInRange(a, b);
    assert.ok(r.ok);
    if (r.ok) out.push(...r.value);
    a = b;
  }
  return out;
}
const TERMS = allTerms();

test("[B] 절기 순서: 시간 증가, 24개 순환, 간격 합리성, 중복 없음", () => {
  assert.ok(TERMS.length >= 24 * 68 && TERMS.length <= 24 * 70, String(TERMS.length));
  for (let i = 1; i < TERMS.length; i++) {
    const a = TERMS[i - 1]!;
    const b = TERMS[i]!;
    assert.equal(b.order, (a.order % 24) + 1, `${a.termInstantUtc} → ${b.termInstantUtc}`);
    const days = (b.epochMs - a.epochMs) / MS_PER_DAY;
    assert.ok(days > 14 && days < 16.5, `${a.nameKo}→${b.nameKo} ${days}`);
  }
});

test("[B] 입춘~다음 입춘 간격이 회귀년 근처 (365.2422일 ± 0.03)", () => {
  const ip = TERMS.filter((t) => t.termId === "ipchun");
  assert.ok(ip.length >= 68);
  for (let i = 1; i < ip.length; i++) {
    const d = (ip[i]!.epochMs - ip[i - 1]!.epochMs) / MS_PER_DAY;
    assert.ok(Math.abs(d - 365.2422) < 0.03, `${ip[i]!.termInstantUtc} ${d}`);
  }
});

test("[B] 황경 수렴: 절기 순간에서 황경이 목표에 도달하고 1ms 전에는 미달", () => {
  for (const t of TERMS.filter((_, i) => i % 7 === 0)) {
    const at = circularDifferenceDeg(apparentSolarLongitudeDeg(t.epochMs), t.targetLongitude);
    const before = circularDifferenceDeg(apparentSolarLongitudeDeg(t.epochMs - 1), t.targetLongitude);
    assert.ok(at >= 0 && at < 5e-8, `${t.termInstantUtc} ${at}`);
    assert.ok(before < 0, `${t.termInstantUtc} ${before}`);
  }
});

test("[B] 계절 시기 plausibility (UTC 날짜 범위; 외부 기준이 아니라 상식 범위 점검)", () => {
  const win: Record<string, [number, number, number, number]> = {
    ipchun: [2, 3, 2, 5], chunbun: [3, 19, 3, 21], haji: [6, 20, 6, 22], chubun: [9, 21, 9, 24], dongji: [12, 20, 12, 23],
  };
  for (const t of TERMS) {
    const w = win[t.termId];
    if (!w) continue;
    const c = utcYmd(t.epochMs);
    const v = c.month * 100 + c.day;
    assert.ok(v >= w[0] * 100 + w[1] && v <= w[2] * 100 + w[3], `${t.nameKo} ${t.termInstantUtc}`);
  }
});

test("[B] previous/next 관계: 표본 질의 2,000건", () => {
  const start = ms("1962-01-01T00:00:00Z");
  for (let i = 0; i < 2000; i++) {
    const q = start + i * 1_071_654_321; // 결정적 간격 (약 12.4일, 1962~2030 전체를 덮는다)
    if (q >= ms("2030-12-31T00:00:00Z")) break;
    const l = lookup(q);
    assert.ok(l.previousTerm.epochMs < l.currentTerm.epochMs);
    assert.ok(l.currentTerm.epochMs <= q && q < l.nextTerm.epochMs);
    assert.equal(l.currentTerm.order % 24 + 1, l.nextTerm.order);
    assert.equal(l.previousTerm.order % 24 + 1, l.currentTerm.order);
    assert.equal(l.sinceCurrentTermMs + l.untilNextTermMs, l.nextTerm.epochMs - l.currentTerm.epochMs);
    const n = lookup(l.nextTerm.epochMs);
    assert.equal(n.currentTerm.termId, l.nextTerm.termId);
    assert.equal(n.previousTerm.termId, l.currentTerm.termId);
    assert.equal(lookup(l.nextTerm.epochMs - 1).currentTerm.termId, l.currentTerm.termId);
  }
});

test("[B] termsInRange 와 locate 연쇄가 같은 절기 순간을 낸다", () => {
  for (let i = 0; i < TERMS.length; i += 13) {
    const t = TERMS[i]!;
    const r = lookup(t.epochMs);
    assert.equal(r.currentTerm.epochMs, t.epochMs);
  }
  const t = TERMS[100]!;
  const incl = P.termsInRange(t.epochMs, t.epochMs + 1);
  const excl = P.termsInRange(t.epochMs - MS_PER_DAY, t.epochMs);
  assert.ok(incl.ok && incl.value.length === 1 && incl.value[0]!.epochMs === t.epochMs);
  assert.ok(excl.ok && excl.value.every((x) => x.epochMs < t.epochMs));
});

const OFFSETS: readonly [string, number][] = [
  ["-30분", -30 * MS_PER_MINUTE], ["-1분", -MS_PER_MINUTE], ["-1ms", -1], ["정각", 0], ["+1ms", 1], ["+1분", MS_PER_MINUTE], ["+30분", 30 * MS_PER_MINUTE],
];

function boundaryCheck(t: SolarTermInstant) {
  const idx = SOLAR_TERMS.findIndex((x) => x.id === t.termId);
  const prevId = SOLAR_TERMS[(idx + 23) % 24]!.id;
  for (const [label, off] of OFFSETS) {
    const l = lookup(t.epochMs + off);
    const tag = `${t.termInstantUtc} ${t.nameKo} ${label}`;
    if (off < 0) {
      assert.equal(l.currentTerm.termId, prevId, tag);
      assert.equal(l.nextTerm.epochMs, t.epochMs, tag);
    } else {
      assert.equal(l.currentTerm.epochMs, t.epochMs, tag);
      assert.equal(l.currentTerm.termId, t.termId, tag);
    }
    assert.equal(l.boundary.mathematical.nearestTerm.epochMs, t.epochMs, tag);
    assert.equal(l.boundary.mathematical.signedDistanceMs, off, tag);
    assert.equal(l.boundary.serviceWarning.warn, true, tag); // 30분은 포함
    assert.equal(l.boundary.serviceWarning.nearestTermId, t.termId, tag);
  }
  for (const off of [-31 * MS_PER_MINUTE, 31 * MS_PER_MINUTE, -MS_PER_DAY, MS_PER_DAY]) {
    assert.equal(lookup(t.epochMs + off).boundary.serviceWarning.warn, false, `${t.termInstantUtc} ${off}`);
  }
}

test("[B] 절기 경계 7종 × 24절기 × 4개 연도 (-30분/-1분/-1ms/정각/+1ms/+1분/+30분)", () => {
  let n = 0;
  for (const y of [1962, 1987, 2000, 2026]) {
    const terms = TERMS.filter((t) => utcYmd(t.epochMs).year === y);
    assert.ok(terms.length >= 24, String(y));
    for (const t of terms) { boundaryCheck(t); n++; }
  }
  assert.ok(n >= 96);
});

test("[B] 입춘 강화 그룹: 1962~2030 모든 해, 경계 7종과 이웃 절기(대한/우수)", () => {
  const ip = TERMS.filter((t) => t.termId === "ipchun");
  assert.ok(ip.length >= 68);
  for (const t of ip) {
    boundaryCheck(t);
    const before = lookup(t.epochMs - 1);
    const after = lookup(t.epochMs);
    assert.equal(before.currentTerm.termId, "daehan");
    assert.equal(after.currentTerm.termId, "ipchun");
    assert.equal(after.previousTerm.termId, "daehan");
    assert.equal(after.nextTerm.termId, "usu");
    assert.equal(before.nextTerm.termId, "ipchun");
  }
  // 입춘 직전/직후 구분이 "절기 경계 반환"으로만 검증된다. 연주 판단은 Phase 3C 의 몫이다.
});

test("[B] 연도 경계: 그레고리력 연도의 24절기만 쓰지 않는다 (전년도/다음 해 절기 탐색)", () => {
  for (let y = 1963; y <= 2029; y++) {
    const dec31 = lookup(ms(`${y}-12-31T23:59:59.999Z`));
    const jan1 = lookup(ms(`${y + 1}-01-01T00:00:00.000Z`));
    assert.equal(dec31.currentTerm.termId, "dongji", String(y));
    assert.equal(jan1.currentTerm.termId, "dongji", String(y));
    assert.equal(utcYmd(dec31.nextTerm.epochMs).year, y + 1, `${y} next 소한은 다음 해`);
    assert.equal(dec31.nextTerm.termId, "sohan");
    // 1월 2일: previous = 대설(전년 12월), current = 동지(전년)
    const jan2 = lookup(ms(`${y}-01-02T00:00:00Z`));
    assert.equal(jan2.currentTerm.termId, "dongji");
    assert.equal(utcYmd(jan2.currentTerm.epochMs).year, y - 1);
    assert.equal(jan2.previousTerm.termId, "daeseol");
    assert.equal(utcYmd(jan2.previousTerm.epochMs).year, y - 1);
    assert.equal(jan2.nextTerm.termId, "sohan");
    assert.equal(utcYmd(jan2.nextTerm.epochMs).year, y);
    // 소한~대한~입춘 주변
    const sohan = TERMS.find((t) => t.termId === "sohan" && utcYmd(t.epochMs).year === y)!;
    assert.equal(lookup(sohan.epochMs - 1).currentTerm.termId, "dongji");
    assert.equal(lookup(sohan.epochMs).currentTerm.termId, "sohan");
    const daehan = TERMS.find((t) => t.termId === "daehan" && utcYmd(t.epochMs).year === y)!;
    assert.equal(lookup(daehan.epochMs).previousTerm.termId, "sohan");
    assert.equal(lookup(ms(`${y}-02-02T00:00:00Z`)).currentTerm.termId, "daehan");
  }
});

// ── 수치해석: 독립된 선형 황경 모델로 근 찾기 검증 ─────────────────
const T0 = ms("2000-01-01T00:00:00Z");
const RATE = 0.9856473; // deg/day
const linearLon = (t: number): number => normalizeDegrees(280 + (RATE * (t - T0)) / MS_PER_DAY);
const LIN = createAlphaSolarTermProvider({
  boundaryWarning: BW,
  longitudeFn: linearLon,
  supportedRange: { fromEpochMs: T0 - 400 * MS_PER_DAY, toEpochMs: T0 + 800 * MS_PER_DAY },
});

test("[B] 근 찾기: 선형 황경 모델의 정확한 교차 시각(해석해)을 ±2ms 로 찾는다 (360°/0° 통과 포함)", () => {
  const r = LIN.termsInRange(T0, T0 + 380 * MS_PER_DAY);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(r.value.length >= 24);
  for (const t of r.value) {
    const deg = normalizeDegrees(t.targetLongitude - 280);
    // 해석해: T0 + deg/RATE 일 (+ 360도 주기들)
    let exact = T0 + (deg / RATE) * MS_PER_DAY;
    while (exact < T0) exact += (360 / RATE) * MS_PER_DAY;
    let best = Infinity;
    for (const k of [-1, 0, 1]) best = Math.min(best, Math.abs(exact + k * (360 / RATE) * MS_PER_DAY - t.epochMs));
    assert.ok(best <= 2, `${t.nameKo} diff ${best}ms`);
  }
  const chunbun = r.value.find((t) => t.termId === "chunbun")!;
  const gyeongchip = r.value.find((t) => t.termId === "gyeongchip")!;
  assert.ok(chunbun.epochMs > gyeongchip.epochMs, "345° → 0° 통과 후 춘분");
  const l = LIN.locate(chunbun.epochMs - 1);
  assert.ok(l.ok && l.value.currentTerm.termId === "gyeongchip" && l.value.nextTerm.termId === "chunbun");
});

test("[B] 수치 안전장치: 구조화 오류를 돌려주고 근사 시각을 만들지 않는다", () => {
  const cfg = { boundaryWarning: BW, supportedRange: { fromEpochMs: T0 - 400 * MS_PER_DAY, toEpochMs: T0 + 800 * MS_PER_DAY } };
  const flat = createAlphaSolarTermProvider({ ...cfg, longitudeFn: () => 100 }).locate(T0);
  assert.ok(!flat.ok && flat.code === "SOLAR_TERM_NOT_BRACKETED");
  const nan = createAlphaSolarTermProvider({ ...cfg, longitudeFn: () => Number.NaN }).locate(T0);
  assert.ok(!nan.ok && nan.code === "SOLAR_TERM_NON_FINITE");
  const inf = createAlphaSolarTermProvider({ ...cfg, longitudeFn: () => Infinity }).locate(T0);
  assert.ok(!inf.ok && inf.code === "SOLAR_TERM_NON_FINITE");
  const slow = createAlphaSolarTermProvider({ ...cfg, longitudeFn: linearLon, maxIterations: 5 }).locate(T0 + 30 * MS_PER_DAY);
  assert.ok(!slow.ok && slow.code === "SOLAR_TERM_DID_NOT_CONVERGE");
  const decreasing = createAlphaSolarTermProvider({ ...cfg, longitudeFn: (t) => normalizeDegrees(-(RATE * (t - T0)) / MS_PER_DAY) }).locate(T0 + 30 * MS_PER_DAY);
  assert.ok(!decreasing.ok);
  for (const r of [flat, nan, inf, slow, decreasing]) assert.ok(!("value" in r));
  for (const bad of [1.5, Number.NaN, Infinity]) {
    const r = P.locate(bad);
    assert.ok(!r.ok && r.code === "SOLAR_TERM_INVALID_INPUT");
  }
  const early = P.locate(ms("1900-01-01T00:00:00Z"));
  assert.ok(!early.ok && early.code === "SOLAR_TERM_OUT_OF_SUPPORTED_RANGE");
  const late = P.locate(ms("2060-01-01T00:00:00Z"));
  assert.ok(!late.ok && late.code === "SOLAR_TERM_OUT_OF_SUPPORTED_RANGE");
  const longRange = P.termsInRange(ms("2000-01-01T00:00:00Z"), ms("2002-01-01T00:00:00Z"));
  assert.ok(!longRange.ok && longRange.code === "SOLAR_TERM_INVALID_INPUT");
  const empty = P.termsInRange(ms("2000-01-02T00:00:00Z"), ms("2000-01-01T00:00:00Z"));
  assert.ok(empty.ok && empty.value.length === 0);
});

// ── 시간 미상 / 절기 컨텍스트 ────────────────────────────────────
const inp = (birthDate: string, birthTime: string | null): SajuInput => ({ birthDate, birthTime, gender: "male", calendar: "solar", birthCountry: "KR" });
const norm = (d: string, t: string | null): NormalizedBirthTime => {
  const r = N.normalize(inp(d, t), ALPHA_POLICY);
  assert.ok(r.ok);
  if (!r.ok) throw new Error("unreachable");
  return r.value;
};
const kstDate = (epochMs: number): string => {
  const c = civilFromDays(Math.floor((epochMs + 9 * 3_600_000) / MS_PER_DAY));
  return `${String(c.year).padStart(4, "0")}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
};

test("[B] 시간 미상 Case A: 날짜 UTC 범위에 (월/연 경계 후보) 절기 없음 → 확정 가능", () => {
  const n = norm("2026-05-15", null);
  const c = resolveSolarTermContext(P, n, 30);
  assert.ok(c.ok);
  if (!c.ok) return;
  assert.equal(c.confidence, "confirmed");
  assert.equal(c.timeKnown, false);
  assert.equal(c.lookup, null);
  assert.deepEqual(c.warnings, []);
  assert.equal(c.dayAssessment?.status, "determined");
  assert.deepEqual(c.dayAssessment?.boundaryTermsInRange, []);
  assert.ok(c.dayAssessment?.currentTermAtDayStart);
  // 하루 안에서 현재 절기가 바뀌지 않는다
  const s = epochMsFromIsoUtc(n.effectiveDayRangeUtc.startUtc) as number;
  const e = epochMsFromIsoUtc(n.effectiveDayRangeUtc.endUtc) as number;
  assert.equal(lookup(s).currentTerm.termId, lookup(e - 1).currentTerm.termId);
});

test("[B] 시간 미상 Case B: 입춘이 있는 날 → uncertain + NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY (전/후를 고르지 않음)", () => {
  for (const y of [1990, 2000, 2026]) {
    const ip = TERMS.find((t) => t.termId === "ipchun" && utcYmd(t.epochMs).year === y)!;
    const date = kstDate(ip.epochMs); // 입춘 순간이 속한 한국 날짜 (정규화 효과일과 동일, 경도 보정 OFF)
    const c = resolveSolarTermContext(P, norm(date, null), 30);
    assert.ok(c.ok, date);
    if (!c.ok) continue;
    assert.equal(c.confidence, "uncertain", date);
    assert.equal(c.dayAssessment?.status, "ambiguous");
    assert.equal(c.dayAssessment?.currentTermAtDayStart, null);
    assert.deepEqual(c.warnings, [{ code: "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY", affects: ["year", "month"], termIds: ["ipchun"] }]);
    assert.deepEqual(c.dayAssessment?.boundaryTermsInRange.map((t) => t.termId), ["ipchun"]);
    assert.equal(c.lookup, null);
  }
});

test("[B] 시간 미상: 월 경계 후보(절) 날은 affects=[month], 중기(춘분) 날은 확정", () => {
  const gc = TERMS.find((t) => t.termId === "gyeongchip" && utcYmd(t.epochMs).year === 2026)!;
  const c1 = resolveSolarTermContext(P, norm(kstDate(gc.epochMs), null), 30);
  assert.ok(c1.ok && c1.confidence === "uncertain");
  if (c1.ok) assert.deepEqual(c1.warnings, [{ code: "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY", affects: ["month"], termIds: ["gyeongchip"] }]);
  const cb = TERMS.find((t) => t.termId === "chunbun" && utcYmd(t.epochMs).year === 2026)!;
  const c2 = resolveSolarTermContext(P, norm(kstDate(cb.epochMs), null), 30);
  assert.ok(c2.ok && c2.confidence === "confirmed");
  if (c2.ok) assert.deepEqual(c2.warnings, []);
});

test("[B] 시간 미상 전수 점검: 2020~2026 모든 날짜에서 uncertain 이면 정확히 절(節)이 하루 범위에 있다", () => {
  let uncertain = 0;
  let days = 0;
  for (let d = ms("2020-01-01T00:00:00Z"); d < ms("2027-01-01T00:00:00Z"); d += MS_PER_DAY) {
    const date = kstDate(d + 12 * 3_600_000);
    const n = norm(date, null);
    const c = resolveSolarTermContext(P, n, 30);
    assert.ok(c.ok, date);
    if (!c.ok) continue;
    days++;
    const s = epochMsFromIsoUtc(n.effectiveDayRangeUtc.startUtc) as number;
    const e = epochMsFromIsoUtc(n.effectiveDayRangeUtc.endUtc) as number;
    const jeolInDay = TERMS.filter((t) => t.epochMs >= s && t.epochMs < e && SOLAR_TERMS.find((x) => x.id === t.termId)!.monthBoundaryCandidate);
    assert.equal(c.confidence === "uncertain", jeolInDay.length > 0, date);
    if (c.confidence === "uncertain") uncertain++;
  }
  // 12절 × 7년 = 84일 (연말 경계 등으로 범위 밖 해는 TERMS 가 덮는 구간 내)
  assert.equal(uncertain, 12 * 7);
  assert.ok(days >= 2557);
});

test("[B] 시간 있음: 확정(confirmed)이며 경계 근처면 구조화 경고만 추가 (결과 차단 없음)", () => {
  const ip = TERMS.find((t) => t.termId === "ipchun" && utcYmd(t.epochMs).year === 2026)!;
  const kstMin = Math.floor((ip.epochMs + 9 * 3_600_000) / MS_PER_MINUTE);
  const mm = (min: number) => {
    const d = civilFromDays(Math.floor(min / 1440));
    const r = min - Math.floor(min / 1440) * 1440;
    return [`${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`, `${String(Math.floor(r / 60)).padStart(2, "0")}:${String(r % 60).padStart(2, "0")}`] as const;
  };
  const [d1, t1] = mm(kstMin - 10);
  const near = resolveSolarTermContext(P, norm(d1, t1), 30);
  assert.ok(near.ok);
  if (near.ok) {
    assert.equal(near.confidence, "confirmed");
    assert.deepEqual(near.warnings, [{ code: "SOLAR_TERM_BOUNDARY_NEAR", affects: ["year", "month"], termIds: ["ipchun"] }]);
    assert.equal(near.lookup?.currentTerm.termId, "daehan");
    assert.ok(near.localInstants.length === 3 && near.localInstants.every((x) => x.effectiveDate.length === 10));
  }
  const [d2, t2] = mm(kstMin - 24 * 60);
  const far = resolveSolarTermContext(P, norm(d2, t2), 30);
  assert.ok(far.ok && far.warnings.length === 0 && far.confidence === "confirmed");
});

test("[B] 제공자가 실패하면 unavailable (임의 값 없음)", () => {
  const n = norm("2026-05-15", "12:00");
  const bad: NormalizedBirthTime = { ...n, instantUtc: "2060-01-01T00:00:00Z" };
  const c = resolveSolarTermContext(P, bad, 30);
  assert.ok(!c.ok);
  if (!c.ok) {
    assert.equal(c.confidence, "unavailable");
    assert.equal(c.code, "SOLAR_TERM_OUT_OF_SUPPORTED_RANGE");
  }
  const worse = resolveSolarTermContext(P, { ...n, instantUtc: null }, 30);
  assert.ok(!worse.ok && worse.code === "INVALID_NORMALIZED_INPUT");
});

test("[B] 시간 미상 + 경도 보정 ON 이면 날짜 구간이 30분 이동한다 (구간 기반 판정은 정책을 따른다)", () => {
  const on = { ...ALPHA_POLICY, time: { ...ALPHA_POLICY.time, longitudeCorrection: true } };
  const r = N.normalize(inp("2026-05-15", null), on);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value.effectiveDayRangeUtc, { startUtc: "2026-05-14T15:30:00Z", endUtc: "2026-05-15T15:30:00Z" });
});
