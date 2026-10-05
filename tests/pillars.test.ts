// Phase 3C 네 기둥 테스트.
// [내부] 표시: 구현 내부 일관성. 외부 기준(KASI 등)과의 일치를 뜻하지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateFourPillars, type FourPillarsResult, type PillarResult } from "../src/lib/saju/pillars";
import { dayCycleIndex, dayPillarForDate, julianDayNumber } from "../src/lib/saju/pillars/dayPillar";
import { hourPillarFor } from "../src/lib/saju/pillars/hourPillar";
import { monthPillarFor } from "../src/lib/saju/pillars/monthPillar";
import { yearPillarForSolarYear } from "../src/lib/saju/pillars/yearPillar";
import { cycleIndexOf, ganjiKo, pillarFromCycleIndex } from "../src/lib/saju/ganji";
import { createAlphaSolarTermProvider } from "../src/lib/saju/alphaSolarTermProvider";
import { createKrTimeNormalizer } from "../src/lib/saju/timeNormalizer";
import { KR_TIME_HISTORY } from "../src/data/saju/kr-time-history";
import { ALPHA_POLICY, withJasiPolicy, withLongitudeCorrection, type Policy } from "../src/lib/saju/policies";
import { MS_PER_DAY, MS_PER_MINUTE, epochMsFromIsoUtc, formatLocalFromEpochMs } from "../src/lib/saju/civil";
import { daysInMonth } from "../src/lib/saju/isoDate";
import { apparentSolarLongitudeDeg } from "../src/lib/saju/astronomy";
import type { SolarTermInstant } from "../src/lib/saju/providers";
import type { SajuInput } from "../src/lib/saju/types";

const P = createAlphaSolarTermProvider({ boundaryWarning: ALPHA_POLICY.solarTerm.boundaryWarning });
const N = createKrTimeNormalizer(KR_TIME_HISTORY);
const calc = (date: string, time: string | null, policy: Policy = ALPHA_POLICY, opts = {}): FourPillarsResult =>
  calculateFourPillars(
    { birthDate: date, birthTime: time, gender: "female", calendar: "solar", birthCountry: "KR" } as SajuInput,
    { normalizer: N, solarTermProvider: P, policy },
    opts,
  );
const ok = (r: FourPillarsResult) => {
  assert.ok(r.ok, r.ok ? "" : r.code);
  if (!r.ok) throw new Error("unreachable");
  return r;
};
const g = (p: PillarResult | null): string | null => (p && p.pillar ? ganjiKo(p.pillar) : null);
const pad = (n: number) => String(n).padStart(2, "0");

/** 1962-02 ~ 2030-12 의 모든 절기 (제공자 결과) */
function terms(): SolarTermInstant[] {
  const out: SolarTermInstant[] = [];
  let a = epochMsFromIsoUtc("1962-01-15T00:00:00Z")!;
  const end = epochMsFromIsoUtc("2030-12-01T00:00:00Z")!;
  while (a < end) {
    const b = Math.min(a + 300 * MS_PER_DAY, end);
    const r = P.termsInRange(a, b);
    assert.ok(r.ok);
    if (r.ok) out.push(...r.value);
    a = b;
  }
  return out;
}
const TERMS = terms();
const JEOL = TERMS.filter((t) => t.order % 2 === 1);
/** 절기 순간의 KST 벽시계(분 단위, 1987·1988 서머타임 기간은 KDT) */
function kstWall(epochMs: number): { date: string; time: string } {
  const dst = KR_TIME_HISTORY.segments.find((s, i, arr) => {
    const from = epochMsFromIsoUtc(s.fromUtc)!;
    const to = i + 1 < arr.length ? epochMsFromIsoUtc(arr[i + 1]!.fromUtc)! : Infinity;
    return epochMs >= from && epochMs < to;
  });
  const off = (dst?.stdOffsetMinutes ?? 540) + (dst?.dstSavingMinutes ?? 0);
  const f = formatLocalFromEpochMs(epochMs, off);
  return { date: f.date, time: f.time.slice(0, 5) };
}
function addMinutes(w: { date: string; time: string }, m: number): { date: string; time: string } {
  const base = epochMsFromIsoUtc(`${w.date}T${w.time}:00Z`)!;
  const f = formatLocalFromEpochMs(base + m * MS_PER_MINUTE, 0);
  return { date: f.date, time: f.time.slice(0, 5) };
}

// ── 60갑자 표 ────────────────────────────────────────────────

test("60갑자: 순번 ↔ 기둥 왕복, 음양 불일치 조합은 null", () => {
  for (let k = 0; k < 60; k++) assert.equal(cycleIndexOf(pillarFromCycleIndex(k)), k);
  assert.equal(ganjiKo(pillarFromCycleIndex(0)), "갑자");
  assert.equal(ganjiKo(pillarFromCycleIndex(59)), "계해");
  assert.equal(cycleIndexOf({ stem: "갑", branch: "축" }), null);
});

// ── 일주 ────────────────────────────────────────────────────

/**
 * 독립 공식 B: JDN·civil.ts 를 쓰지 않고, 1900-01-01(갑술, 순번 10)부터 달력을 한 달씩 세어 경과 일수를 구한다.
 * 기준점(1900-01-01 = 갑술)은 공식 A 와 같은 내부 기준이며 외부 대조가 아니다.
 */
function dayIndexIndependent(y: number, m: number, d: number): number {
  let days = 0;
  for (let yy = 1900; yy < y; yy++) days += (yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0 ? 366 : 365;
  for (let mm = 1; mm < m; mm++) days += daysInMonth(y, mm);
  days += d - 1;
  return (10 + days) % 60;
}

test("[내부] 일주: 1930-01-01~2026-10-04 전 구간(35,341일) 두 독립 공식 일치", () => {
  let n = 0;
  for (let y = 1930; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= daysInMonth(y, m); d++) {
        if (y === 2026 && (m > 10 || (m === 10 && d > 4))) continue;
        assert.equal(dayCycleIndex(y, m, d), dayIndexIndependent(y, m, d), `${y}-${m}-${d}`);
        n++;
      }
    }
  }
  assert.equal(n, 35341);
});

test("[내부] 일주: 하루에 정확히 1씩 진행, JDN 기준점", () => {
  assert.equal(julianDayNumber(2000, 1, 1), 2451545);
  assert.equal(ganjiKo(dayPillarForDate("2000-01-01")!), "무오");
  assert.equal(ganjiKo(dayPillarForDate("1900-01-01")!), "갑술");
  for (const [a, b] of [["1999-12-31", "2000-01-01"], ["2024-02-28", "2024-02-29"], ["2024-02-29", "2024-03-01"], ["1962-12-31", "1963-01-01"]] as const) {
    assert.equal((cycleIndexOf(dayPillarForDate(b)!)! - cycleIndexOf(dayPillarForDate(a)!)! + 60) % 60, 1, `${a}→${b}`);
  }
});

test("일주 검증 상태는 verified-internally 를 넘지 않는다", () => {
  const r = ok(calc("1995-06-15", "10:00"));
  assert.equal(r.pillars.day.verification.level, "verified-internally");
  assert.equal(r.pillars.year.verification.level, "not-verified");
  assert.equal(r.pillars.month.verification.level, "not-verified");
  assert.equal(r.pillars.hour!.verification.level, "not-verified");
});

test("일주: 자시 정책 midnight 은 00:00 경계, jasi 는 23:00 경계", () => {
  const d0 = g(ok(calc("2010-06-10", "12:00")).pillars.day);
  const d1 = g(ok(calc("2010-06-11", "12:00")).pillars.day);
  assert.equal(g(ok(calc("2010-06-10", "23:30")).pillars.day), d0);
  assert.equal(g(ok(calc("2010-06-10", "23:30", withJasiPolicy(ALPHA_POLICY, "jasi"))).pillars.day), d1);
  assert.equal(g(ok(calc("2010-06-10", "22:59", withJasiPolicy(ALPHA_POLICY, "jasi"))).pillars.day), d0);
});

test("일주: 시간 미상 + jasi 정책 / 경도 보정 → 날짜가 갈릴 수 있어 uncertain (고르지 않음)", () => {
  const j = ok(calc("2010-06-10", null, withJasiPolicy(ALPHA_POLICY, "jasi"))).pillars.day;
  assert.equal(j.confidence, "uncertain");
  assert.equal(j.pillar, null);
  assert.equal(j.candidates.length, 2);
  assert.equal(j.reason, "NEEDS_BIRTH_TIME_FOR_DAY_BOUNDARY");
  const l = ok(calc("2010-06-10", null, withLongitudeCorrection(ALPHA_POLICY, true))).pillars.day;
  assert.equal(l.confidence, "uncertain");
  assert.deepEqual(l.candidates.map(ganjiKo), [g(ok(calc("2010-06-09", "12:00")).pillars.day), g(ok(calc("2010-06-10", "12:00")).pillars.day)]);
});

// ── 연주 ────────────────────────────────────────────────────

test("연주: 절기 해 → 60갑자 (1984 갑자, 2024 갑진)", () => {
  assert.equal(ganjiKo(yearPillarForSolarYear(1984)), "갑자");
  assert.equal(ganjiKo(yearPillarForSolarYear(2024)), "갑진");
  assert.equal(ganjiKo(yearPillarForSolarYear(1962)), "임인");
});

test("[내부] 연주: 1963~2030 매년 제공자의 입춘 순간 1분 전/후로 바뀐다", () => {
  const ipchun = TERMS.filter((t) => t.termId === "ipchun");
  assert.ok(ipchun.length >= 68);
  for (const t of ipchun) {
    const y = Number(t.termInstantUtc.slice(0, 4));
    const w = kstWall(t.epochMs);
    const before = addMinutes(w, -1);
    const after = addMinutes(w, 1);
    assert.equal(g(ok(calc(before.date, before.time)).pillars.year), ganjiKo(yearPillarForSolarYear(y - 1)), `${y} before`);
    assert.equal(g(ok(calc(after.date, after.time)).pillars.year), ganjiKo(yearPillarForSolarYear(y)), `${y} after`);
  }
});

test("연주: 양력 1월 1일이 아니라 입춘이 경계다", () => {
  const r = ok(calc("2024-01-15", "12:00"));
  assert.equal(g(r.pillars.year), "계묘");
  assert.equal(r.pillars.year.evidence.method, "ipchun-boundary");
});

// ── 월주 ────────────────────────────────────────────────────

test("월주: 오호둔 (갑·기년 인월=병인 … 무·계년 인월=갑인), 월지 순서", () => {
  const firstMonth: Record<string, string> = { 갑: "병인", 기: "병인", 을: "무인", 경: "무인", 병: "경인", 신: "경인", 정: "임인", 임: "임인", 무: "갑인", 계: "갑인" };
  for (let y = 1984; y < 1994; y++) assert.equal(ganjiKo(monthPillarFor(y, 1)), firstMonth[yearPillarForSolarYear(y).stem], String(y));
  const branches = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map((o) => monthPillarFor(2024, o).branch).join("");
  assert.equal(branches, "인묘진사오미신유술해자축");
});

test("[내부] 월주: 60개월 주기가 끊김 없이 이어진다 (1962~2030)", () => {
  let prev: number | null = null;
  for (const t of JEOL) {
    const y = Number(t.termInstantUtc.slice(0, 4)) - (t.order >= 23 ? 1 : 0);
    const k = cycleIndexOf(monthPillarFor(y, t.order))!;
    if (prev !== null) assert.equal(k, (prev + 1) % 60, t.termInstantUtc);
    prev = k;
  }
});

test("[내부] 월주: 1962~2030 모든 절(節)에서 제공자의 절입 순간 1분 전/후로 바뀐다", () => {
  let checked = 0;
  for (const t of JEOL) {
    const w = kstWall(t.epochMs);
    const b = addMinutes(w, -1);
    const a = addMinutes(w, 1);
    const rb = calc(b.date, b.time);
    const ra = calc(a.date, a.time);
    // 서머타임 gap/overlap 에 걸리는 시각은 이 검사에서 제외 (다른 테스트에서 다룸)
    if (!rb.ok || !ra.ok) continue;
    const mb = cycleIndexOf(rb.pillars.month.pillar!)!;
    const ma = cycleIndexOf(ra.pillars.month.pillar!)!;
    assert.equal(ma, (mb + 1) % 60, t.termInstantUtc);
    assert.equal(rb.pillars.month.boundaryRisk, true);
    assert.equal(ra.pillars.month.boundaryRisk, true);
    checked++;
  }
  assert.ok(checked >= JEOL.length - 2, `${checked}/${JEOL.length}`);
});

test("월주 코드에 절입 시각이 하드코딩되어 있지 않다 (제공자를 바꾸면 결과가 따라 바뀐다)", () => {
  // 황경을 일정량 밀어낸 가짜 제공자: 절입이 늦어지면 같은 출생 시각의 월주가 이전 달로 남아야 한다.
  const shifted = createAlphaSolarTermProvider({
    boundaryWarning: ALPHA_POLICY.solarTerm.boundaryWarning,
    // 원래 모델을 하루 늦춘 것과 같은 효과
    longitudeFn: (ms) => apparentSolarLongitudeDeg(ms - MS_PER_DAY),
  });
  const t = JEOL.find((x) => x.termInstantUtc.startsWith("2015"))!;
  const w = kstWall(t.epochMs + 2 * 3_600_000);
  const normal = ok(calc(w.date, w.time));
  const moved = ok(calculateFourPillars({ birthDate: w.date, birthTime: w.time, gender: "male", calendar: "solar", birthCountry: "KR" }, { normalizer: N, solarTermProvider: shifted, policy: ALPHA_POLICY }));
  assert.equal((cycleIndexOf(normal.pillars.month.pillar!)! - cycleIndexOf(moved.pillars.month.pillar!)! + 60) % 60, 1);
});

// ── 시간 미상 + 절입 ─────────────────────────────────────────

test("시간 미상 + 입춘 당일: 연주·월주 uncertain (후보 2개, 고르지 않음), 일주 confirmed, 시주 null", () => {
  const t = TERMS.find((x) => x.termId === "ipchun" && x.termInstantUtc.startsWith("2010"))!;
  const r = ok(calc(kstWall(t.epochMs).date, null));
  assert.equal(r.pillars.year.confidence, "uncertain");
  assert.equal(r.pillars.year.pillar, null);
  assert.deepEqual(r.pillars.year.candidates.map(ganjiKo), ["기축", "경인"]);
  assert.equal(r.pillars.month.confidence, "uncertain");
  assert.deepEqual(r.pillars.month.candidates.map(ganjiKo), ["정축", "무인"]);
  assert.equal(r.pillars.day.confidence, "confirmed");
  assert.equal(r.pillars.hour, null);
  assert.equal(r.confidence.hour, "unavailable");
  assert.equal(r.pillars.month.reason, "NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY");
});

test("시간 미상 + 입춘 외 절입 당일: 월주만 uncertain, 연주 confirmed", () => {
  for (const t of JEOL.filter((x) => x.termId !== "ipchun" && x.termInstantUtc.startsWith("2011"))) {
    const r = ok(calc(kstWall(t.epochMs).date, null));
    assert.equal(r.pillars.year.confidence, "confirmed", t.termId);
    assert.equal(r.pillars.month.confidence, "uncertain", t.termId);
    const [a, b] = r.pillars.month.candidates.map((p) => cycleIndexOf(p)!);
    assert.equal(b, (a! + 1) % 60, t.termId);
  }
});

test("시간 미상 + 절입 없는 날: 연·월·일 confirmed, 시주 null", () => {
  const r = ok(calc("2011-07-20", null));
  assert.deepEqual(r.confidence, { year: "confirmed", month: "confirmed", day: "confirmed", hour: "unavailable" });
  assert.equal(r.pillars.hour, null);
  assert.equal(r.boundaryRisk, false);
});

test("시간 미상 + 중기(中氣) 당일은 월주를 바꾸지 않으므로 confirmed", () => {
  const t = TERMS.find((x) => x.termId === "haji" && x.termInstantUtc.startsWith("2012"))!;
  const r = ok(calc(kstWall(t.epochMs).date, null));
  assert.equal(r.pillars.month.confidence, "confirmed");
});

// ── boundaryRisk ───────────────────────────────────────────

test("boundaryRisk: 경고 범위(30분) 안이면 confirmed + boundaryRisk, 밖이면 false", () => {
  const t = TERMS.find((x) => x.termId === "gyeongchip" && x.termInstantUtc.startsWith("2016"))!;
  const w = kstWall(t.epochMs);
  const near = ok(calc(addMinutes(w, 20).date, addMinutes(w, 20).time));
  assert.equal(near.pillars.month.confidence, "confirmed");
  assert.equal(near.pillars.month.boundaryRisk, true);
  assert.equal(near.pillars.year.boundaryRisk, false, "경칩은 연주 경계가 아니다");
  assert.equal(near.boundaryRisk, true);
  const far = ok(calc(addMinutes(w, 120).date, addMinutes(w, 120).time));
  assert.equal(far.pillars.month.boundaryRisk, false);
});

test("boundaryRisk: 입춘 근처는 연주·월주 모두", () => {
  const t = TERMS.find((x) => x.termId === "ipchun" && x.termInstantUtc.startsWith("2020"))!;
  const w = addMinutes(kstWall(t.epochMs), -10);
  const r = ok(calc(w.date, w.time));
  assert.equal(r.pillars.year.boundaryRisk, true);
  assert.equal(r.pillars.month.boundaryRisk, true);
  assert.equal(r.pillars.year.confidence, "confirmed");
});

test("boundaryRisk: 시간 미상이지만 절입이 자정 직전/직후(30분 이내)면 경계 위험 표시", () => {
  // 절입이 KST 자정 근처인 사례를 제공자 결과에서 찾는다
  const t = JEOL.find((x) => {
    const tm = kstWall(x.epochMs).time;
    return tm >= "23:35" || tm <= "00:25";
  });
  assert.ok(t, "자정 근처 절입 사례가 있어야 한다");
  const w = kstWall(t!.epochMs);
  // 절입이 들어 있지 않은 이웃 날짜
  const other = w.time >= "23:35" ? addMinutes({ date: w.date, time: "12:00" }, 24 * 60).date : addMinutes({ date: w.date, time: "12:00" }, -24 * 60).date;
  const r = ok(calc(other, null));
  assert.equal(r.pillars.month.confidence, "confirmed");
  assert.equal(r.pillars.month.boundaryRisk, true);
});

// ── 시주 ────────────────────────────────────────────────────

test("시주: 시지 경계와 오서둔", () => {
  assert.equal(ganjiKo(hourPillarFor("갑", 0)), "갑자");
  assert.equal(ganjiKo(hourPillarFor("갑", 1)), "을축");
  assert.equal(ganjiKo(hourPillarFor("을", 0)), "병자");
  assert.equal(ganjiKo(hourPillarFor("병", 0)), "무자");
  assert.equal(ganjiKo(hourPillarFor("정", 0)), "경자");
  assert.equal(ganjiKo(hourPillarFor("무", 0)), "임자");
  assert.equal(ganjiKo(hourPillarFor("기", 22)), "을해");
  const br = (h: number, m: number) => g(ok(calc("2013-08-08", `${pad(h)}:${pad(m)}`)).pillars.hour)!.slice(1);
  assert.equal(br(0, 59), "자");
  assert.equal(br(1, 0), "축");
  assert.equal(br(22, 59), "해");
  assert.equal(br(23, 0), "자");
});

test("[내부] 시주: midnight 정책에서 2시간마다 60갑자가 끊김 없이 이어진다 (자정을 넘어)", () => {
  let prev: number | null = null;
  for (const date of ["2013-08-08", "2013-08-09", "2013-08-10"]) {
    for (let h = 1; h < 24; h += 2) {
      const k = cycleIndexOf(ok(calc(date, `${pad(h)}:30`)).pillars.hour!.pillar!)!;
      if (prev !== null) assert.equal(k, (prev + 1) % 60, `${date} ${h}`);
      prev = k;
    }
  }
});

test("시주: 23시대 - midnight 은 일주 당일 + 다음 날 일간 기준 자시, jasi 는 일주도 다음 날", () => {
  const m = ok(calc("2013-08-08", "23:30"));
  const next = ok(calc("2013-08-09", "00:30"));
  assert.equal(g(m.pillars.hour), g(next.pillars.hour));
  assert.notEqual(g(m.pillars.day), g(next.pillars.day));
  assert.equal(m.pillars.hour!.evidence.lateZiHour, true);
  const j = ok(calc("2013-08-08", "23:30", withJasiPolicy(ALPHA_POLICY, "jasi")));
  assert.equal(g(j.pillars.day), g(next.pillars.day));
  assert.equal(g(j.pillars.hour), g(next.pillars.hour));
});

test("시주: 시간 미상이면 null (임의 시각 금지)", () => {
  const r = ok(calc("2013-08-08", null));
  assert.equal(r.pillars.hour, null);
  assert.equal(r.normalized.instantUtc, null);
});

// ── DST ─────────────────────────────────────────────────────

test("DST: 1987 서머타임 중 23:30 은 표준시 22:30 → 해시, 날짜 유지", () => {
  const r = ok(calc("1987-07-01", "23:30"));
  assert.equal(r.normalized.effective.time, "22:30");
  assert.equal(g(r.pillars.hour)!.slice(1), "해");
  assert.equal(g(r.pillars.day), ganjiKo(dayPillarForDate("1987-07-01")!));
});

test("DST: 서머타임 중 00:30 은 표준시 전날 23:30 → 일주는 전날", () => {
  const r = ok(calc("1987-07-02", "00:30"));
  assert.equal(r.normalized.effective.date, "1987-07-01");
  assert.equal(g(r.pillars.day), ganjiKo(dayPillarForDate("1987-07-01")!));
});

test("DST gap 은 오류, overlap 은 선택 없으면 오류 + 후보, 선택하면 계산", () => {
  const gap = calc("1987-05-10", "02:30");
  assert.equal(gap.ok, false);
  if (!gap.ok) assert.equal(gap.code, "NONEXISTENT_LOCAL_TIME");
  const ov = calc("1987-10-11", "02:30");
  assert.equal(ov.ok, false);
  if (!ov.ok) {
    assert.equal(ov.code, "AMBIGUOUS_LOCAL_TIME");
    assert.equal(ov.candidates?.length, 2);
  }
  assert.ok(calc("1987-10-11", "02:30", ALPHA_POLICY, { overlapChoice: "earlier" }).ok);
});

// ── provenance / 결정론 ─────────────────────────────────────

test("provenance: 엔진·정책·절기 제공자(not-verified)·시간 자료 버전 기록", () => {
  const r = ok(calc("1999-09-09", "09:09"));
  assert.equal(r.provenance.engineVersion, "0.2.0-beta");
  assert.equal(r.provenance.policyVersion, "alpha-0.1");
  assert.equal(r.provenance.solarTermProvider.verificationStatus, "not-verified");
  assert.equal(r.pillars.month.evidence.solarTermVerification, "not-verified");
  assert.ok(String(r.pillars.month.evidence.solarTermProvider).startsWith("AlphaSolarTermProvider@"));
  assert.ok(r.pillars.year.policyDependencies.includes("solarTerm.provider"));
  assert.ok(r.pillars.day.policyDependencies.includes("time.jasiPolicy"));
});

test("결정론: 같은 입력은 항상 같은 결과", () => {
  const a = JSON.stringify(calc("1977-03-03", "03:03"));
  for (let i = 0; i < 20; i++) assert.equal(JSON.stringify(calc("1977-03-03", "03:03")), a);
});

test("결과는 동결되어 있다", () => {
  const r = ok(calc("1977-03-03", "03:03"));
  assert.throws(() => { (r.pillars.day as { confidence: string }).confidence = "uncertain"; });
});

test("[내부] 샘플 스윕: 1962~2026 매 37일 × (시간 3종 + 미상) 에서 오류 없이 계산되고 confirmed 기둥은 값이 있다", () => {
  let n = 0;
  const start = epochMsFromIsoUtc("1962-01-02T00:00:00Z")!;
  const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
  for (let ms = start; ms < end; ms += 37 * MS_PER_DAY) {
    const date = formatLocalFromEpochMs(ms, 0).date;
    for (const time of ["06:10", "13:45", "21:20", null]) {
      const r = calc(date, time);
      if (!r.ok) continue; // DST gap 등
      for (const p of [r.pillars.year, r.pillars.month, r.pillars.day, r.pillars.hour]) {
        if (!p) continue;
        assert.notEqual(p.confidence, "unavailable", `${date} ${time} ${p.position}`);
        if (p.confidence === "confirmed") assert.ok(p.pillar && p.ganji);
        else assert.equal(p.pillar, null);
      }
      n++;
    }
  }
  assert.ok(n > 2000);
});
