import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createKrTimeNormalizer } from "../src/lib/saju/timeNormalizer";
import { validateTimeHistory, type TimeHistory } from "../src/lib/saju/timeHistory";
import { ALPHA_POLICY, withLongitudeCorrection, type Policy } from "../src/lib/saju/policies";
import { KR_TIME_HISTORY } from "../src/data/saju/kr-time-history";
import { civilFromDays, daysFromCivil, isoUtcFromMinutes, minutesFromIsoUtc, partsFromMinutes } from "../src/lib/saju/civil";
import type { SajuInput } from "../src/lib/saju/types";

const N = createKrTimeNormalizer(KR_TIME_HISTORY);
const inp = (birthDate: string, birthTime: string | null): SajuInput => ({ birthDate, birthTime, gender: "male", calendar: "solar", birthCountry: "KR" });
const run = (d: string, t: string | null, p: Policy = ALPHA_POLICY, o = {}) => N.normalize(inp(d, t), p, o);
const val = (d: string, t: string | null, p: Policy = ALPHA_POLICY, o = {}) => {
  const r = run(d, t, p, o);
  assert.ok(r.ok, `${d} ${t}: ${r.ok ? "" : r.code}`);
  if (!r.ok) throw new Error("unreachable");
  return r.value;
};
const code = (d: string, t: string | null, p: Policy = ALPHA_POLICY, o = {}) => {
  const r = run(d, t, p, o);
  return r.ok ? "OK" : r.code;
};
const OFF: Policy = { ...ALPHA_POLICY, time: { ...ALPHA_POLICY.time, historicalOffsets: false } };

test("civil: Date.UTC와 일치 (1900~2100 전 일수)", () => {
  const start = daysFromCivil(1900, 1, 1);
  const end = daysFromCivil(2100, 12, 31);
  for (let d = start; d <= end; d++) {
    const c = civilFromDays(d);
    assert.equal(Date.UTC(c.year, c.month - 1, c.day) / 86400000, d);
    assert.equal(daysFromCivil(c.year, c.month, c.day), d);
  }
});

test("civil: 분 ↔ ISO 변환", () => {
  assert.equal(isoUtcFromMinutes(0), "1970-01-01T00:00:00Z");
  assert.equal(minutesFromIsoUtc("1987-05-09T17:00:00Z"), minutesFromIsoUtc("1987-05-09T17:00:00Z"));
  assert.equal(isoUtcFromMinutes(minutesFromIsoUtc("1961-08-09T15:30:00Z") as number), "1961-08-09T15:30:00Z");
  assert.equal(minutesFromIsoUtc("1987-02-30T00:00:00Z"), null);
  assert.equal(minutesFromIsoUtc("1987-02-03T24:00:00Z"), null);
  assert.equal(minutesFromIsoUtc("garbage"), null);
  assert.equal(partsFromMinutes(-1).time, "23:59");
});

test("시간 이력 데이터 형식 검증", () => {
  assert.deepEqual(validateTimeHistory(KR_TIME_HISTORY), []);
  const bad = { ...KR_TIME_HISTORY, segments: [...KR_TIME_HISTORY.segments].reverse() } as TimeHistory;
  assert.ok(validateTimeHistory(bad).length > 0);
  assert.throws(() => createKrTimeNormalizer(bad));
  for (const s of KR_TIME_HISTORY.segments) assert.equal(s.verification, "not-verified");
});

test("일반 날짜: 서머타임 없음, 순간/유효시각", () => {
  const v = val("1990-05-15", "07:30");
  assert.equal(v.instantUtc, "1990-05-14T22:30:00Z");
  assert.deepEqual(v.effective, { date: "1990-05-15", time: "07:30" });
  assert.deepEqual(v.notes, []);
  assert.equal(v.segment?.abbrev, "KST");
  assert.equal(v.timeKnown, true);
  assert.equal(v.provenance.dataVersion, "kr-time-history-0.1");
  assert.equal(v.provenance.verification, "not-verified");
});

test("DST gap: 1987-05-10 02:00~02:59 는 존재하지 않음 (보정하지 않음)", () => {
  assert.equal(code("1987-05-10", "01:59"), "OK");
  for (const t of ["02:00", "02:30", "02:59"]) assert.equal(code("1987-05-10", t), "NONEXISTENT_LOCAL_TIME", t);
  const v = val("1987-05-10", "03:00");
  assert.equal(v.instantUtc, "1987-05-09T17:00:00Z");
  assert.deepEqual(v.effective, { date: "1987-05-10", time: "02:00" });
  assert.deepEqual(v.notes, ["DST_REMOVED"]);
  assert.equal(code("1988-05-08", "02:30"), "NONEXISTENT_LOCAL_TIME");
  assert.equal(code("1988-05-08", "03:00"), "OK");
});

test("DST overlap: 1987-10-11 02:00~02:59 는 두 번 존재 → 선택 없으면 오류+후보", () => {
  assert.equal(code("1987-10-11", "01:59"), "OK");
  assert.equal(code("1987-10-11", "03:00"), "OK");
  const r = run("1987-10-11", "02:30");
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.equal(r.code, "AMBIGUOUS_LOCAL_TIME");
    assert.deepEqual(r.candidates?.map((c) => [c.instantUtc, c.abbrev]), [
      ["1987-10-10T16:30:00Z", "KDT"],
      ["1987-10-10T17:30:00Z", "KST"],
    ]);
  }
  const e = val("1987-10-11", "02:30", ALPHA_POLICY, { overlapChoice: "earlier" });
  assert.equal(e.instantUtc, "1987-10-10T16:30:00Z");
  assert.deepEqual(e.effective, { date: "1987-10-11", time: "01:30" });
  assert.ok(e.notes.includes("OVERLAP_RESOLVED_BY_CHOICE"));
  const l = val("1987-10-11", "02:30", ALPHA_POLICY, { overlapChoice: "later" });
  assert.equal(l.instantUtc, "1987-10-10T17:30:00Z");
  assert.deepEqual(l.effective, { date: "1987-10-11", time: "02:30" });
  assert.equal(code("1988-10-09", "02:00"), "AMBIGUOUS_LOCAL_TIME");
  assert.equal(code("1988-10-09", "02:59"), "AMBIGUOUS_LOCAL_TIME");
});

test("서머타임 중 자정 직후: 서머타임 제거로 날짜가 전날로 이동", () => {
  const v = val("1987-06-01", "00:30");
  assert.deepEqual(v.effective, { date: "1987-05-31", time: "23:30" });
  assert.ok(v.notes.includes("DATE_SHIFTED_BY_NORMALIZATION"));
  assert.ok(v.notes.includes("DST_REMOVED"));
  assert.deepEqual(val("1987-06-01", "01:00").effective, { date: "1987-06-01", time: "00:00" });
});

test("시간 미상: 시각을 만들지 않고 날짜의 UTC 구간만 제공", () => {
  const v = val("1990-05-15", null);
  assert.equal(v.timeKnown, false);
  assert.equal(v.instantUtc, null);
  assert.equal(v.segment, null);
  assert.deepEqual(v.effective, { date: "1990-05-15", time: null });
  assert.deepEqual(v.effectiveDayRangeUtc, { startUtc: "1990-05-14T15:00:00Z", endUtc: "1990-05-15T15:00:00Z" });
  assert.deepEqual(v.notes, ["TIME_UNKNOWN"]);
  // 서머타임 날짜도 표준시 기준
  assert.deepEqual(val("1987-06-01", null).effectiveDayRangeUtc, { startUtc: "1987-05-31T15:00:00Z", endUtc: "1987-06-01T15:00:00Z" });
  // 전환일도 오류 없이 처리 (시각이 없으므로 gap/overlap 없음)
  assert.equal(code("1987-10-11", null), "OK");
  assert.equal(code("1987-05-10", null), "OK");
});

test("known 시각의 effectiveDayRangeUtc 는 effective 날짜 하루", () => {
  const v = val("1990-05-15", "07:30");
  assert.deepEqual(v.effectiveDayRangeUtc, { startUtc: "1990-05-14T15:00:00Z", endUtc: "1990-05-15T15:00:00Z" });
  const s = val("1987-06-01", "00:30"); // effective 05-31
  assert.deepEqual(s.effectiveDayRangeUtc, { startUtc: "1987-05-30T15:00:00Z", endUtc: "1987-05-31T15:00:00Z" });
});

test("경도 보정 ON (정책 옵션): 표준자오선 135° 대비 127.5° → -30분", () => {
  const on = withLongitudeCorrection(ALPHA_POLICY, true);
  const v = val("1990-05-15", "07:30", on);
  assert.deepEqual(v.effective, { date: "1990-05-15", time: "07:00" });
  assert.equal(v.adjustments.longitudeMinutes, -30);
  assert.ok(v.notes.includes("LONGITUDE_APPLIED"));
  assert.deepEqual(val("1990-05-15", "00:10", on).effective, { date: "1990-05-14", time: "23:40" });
  assert.deepEqual(val("1987-06-01", "03:30", on).effective, { date: "1987-06-01", time: "02:00" });
  // 기본 정책은 OFF
  assert.equal(val("1990-05-15", "07:30").adjustments.longitudeMinutes, 0);
  const u = val("1990-05-15", null, on);
  assert.deepEqual(u.effectiveDayRangeUtc, { startUtc: "1990-05-14T15:30:00Z", endUtc: "1990-05-15T15:30:00Z" });
});

test("historicalOffsets OFF: 고정 UTC+9, gap/overlap 없음", () => {
  const a = val("1987-05-10", "02:30", OFF);
  assert.equal(a.instantUtc, "1987-05-09T17:30:00Z");
  assert.deepEqual(a.effective, { date: "1987-05-10", time: "02:30" });
  assert.ok(a.notes.includes("HISTORICAL_OFFSETS_OFF"));
  assert.equal(code("1987-10-11", "02:30", OFF), "OK");
  assert.equal(val("1987-06-01", "00:30", OFF).effective.date, "1987-06-01");
});

test("지원 시작 이전은 OUT_OF_COVERAGE (입력 검증 범위와 별개)", () => {
  assert.equal(code("1961-08-10", "00:29"), "OUT_OF_COVERAGE");
  // 첫 날은 effective 날짜 하루 전체가 데이터 범위 안에 없으므로 보수적으로 범위 밖으로 처리한다
  assert.equal(code("1961-08-10", "00:30"), "OUT_OF_COVERAGE");
  assert.equal(code("1961-08-10", null), "OUT_OF_COVERAGE");
  assert.equal(code("1961-08-11", "00:00"), "OK");
  assert.equal(code("1950-01-01", "12:00"), "OUT_OF_COVERAGE");
  assert.equal(code("1950-01-01", null), "OUT_OF_COVERAGE");
  assert.equal(code("1962-01-01", "00:00"), "OK");
});

test("시간 경계 22:59~01:00: 정규화는 시각을 바꾸지 않는다 (자시 처리는 일주 단계)", () => {
  const times = ["22:59", "23:00", "23:59", "00:00", "00:01", "00:59", "01:00"];
  let prev = "";
  for (const t of times) {
    const v = val("2000-03-10", t);
    assert.deepEqual(v.effective, { date: "2000-03-10", time: t });
    assert.ok(v.instantUtc !== null);
  }
  // 정책을 바꿔도 정규화 결과 불변 (자시 정책은 이 계층의 입력이 아님)
  for (const j of ["midnight", "jasi", "splitJasi"] as const) {
    const p: Policy = { ...ALPHA_POLICY, time: { ...ALPHA_POLICY.time, jasiPolicy: j } };
    assert.equal(JSON.stringify(val("2000-03-10", "23:30", p)), JSON.stringify(val("2000-03-10", "23:30")));
  }
  void prev;
});

interface Row extends Array<unknown> { 0: string; 1: "ok" | "gap" | "ambiguous"; 2: string[] }
const FIRST_FULL_DAY = "1961-08-11T00:00";
const fixture = JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/kr-time-zoneinfo-crosscheck.json`, "utf8")) as { rows: Row[] };

test("tzdata(빌드 시점 대조 자료)와 전수 일치: gap/overlap/순간", () => {
  assert.ok(fixture.rows.length > 5000);
  const counts = { ok: 0, gap: 0, ambiguous: 0 };
  for (const [w, status, utcs] of fixture.rows) {
    if (w < FIRST_FULL_DAY) continue;
    const [d, t] = w.split("T") as [string, string];
    const r = run(d, t);
    counts[status]++;
    if (status === "ok") {
      assert.ok(r.ok, w);
      if (r.ok) assert.equal(r.value.instantUtc, `${utcs[0]!.slice(0, 16)}:00Z`, w);
    } else if (status === "gap") {
      assert.ok(!r.ok && r.code === "NONEXISTENT_LOCAL_TIME", w);
    } else {
      assert.ok(!r.ok && r.code === "AMBIGUOUS_LOCAL_TIME", w);
      if (!r.ok) assert.deepEqual(r.candidates?.map((c) => c.instantUtc.slice(0, 16)), utcs.map((u) => u.slice(0, 16)), w);
      for (const [choice, i] of [["earlier", 0], ["later", 1]] as const) {
        const c = run(d, t, ALPHA_POLICY, { overlapChoice: choice });
        assert.ok(c.ok && c.value.instantUtc === `${utcs[i]!.slice(0, 16)}:00Z`, `${w} ${choice}`);
      }
    }
  }
  assert.ok(counts.gap > 100 && counts.ambiguous > 100 && counts.ok > 5000, JSON.stringify(counts));
});

test("effective = instant + effectiveOffset 항등 (known, 정책 3종)", () => {
  const pols = [ALPHA_POLICY, withLongitudeCorrection(ALPHA_POLICY, true), OFF];
  for (const p of pols) {
    for (const [w, status] of fixture.rows) {
      if (status !== "ok" || w < FIRST_FULL_DAY) continue;
      const [d, t] = w.split("T") as [string, string];
      const v = val(d, t, p);
      const inst = minutesFromIsoUtc(v.instantUtc as string) as number;
      const eff = partsFromMinutes(inst + v.adjustments.effectiveOffsetMinutes);
      assert.deepEqual(v.effective, { date: eff.date, time: eff.time }, `${w}`);
    }
  }
});

test("결정론: 같은 입력 100회 동일", () => {
  for (const [d, t] of [["1990-05-15", "07:30"], ["1987-06-01", "00:30"], ["1987-05-10", "02:30"], ["1987-10-11", "02:30"], ["2000-01-01", null]] as const) {
    const first = JSON.stringify(run(d, t));
    for (let i = 0; i < 100; i++) assert.equal(JSON.stringify(run(d, t)), first);
  }
});

test("입력/정책/데이터는 변경되지 않는다", () => {
  const input = inp("1987-06-01", "00:30");
  const a = JSON.stringify([input, ALPHA_POLICY, KR_TIME_HISTORY]);
  N.normalize(input, ALPHA_POLICY);
  assert.equal(JSON.stringify([input, ALPHA_POLICY, KR_TIME_HISTORY]), a);
});
