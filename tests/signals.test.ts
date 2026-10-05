// Phase 4 Signals + Score 테스트.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSaju } from "../src/lib/engine";
import { deriveSignals, scoreSignals, SCORE_VERSION, SCORE_RULE, STAT_KEYS, DOMAINS, type SignalSet } from "../src/lib/interpretation";
import { ALPHA_POLICY, withJasiPolicy } from "../src/lib/saju/policies";
import { MS_PER_DAY, epochMsFromIsoUtc, formatLocalFromEpochMs } from "../src/lib/saju/civil";
import type { SajuData } from "../src/lib/saju/chart";
import type { Gender, SajuInput } from "../src/lib/saju/types";

const data = (d: string, t: string | null, gender: Gender = "male", policy = ALPHA_POLICY): SajuData => {
  const r = computeSaju({ birthDate: d, birthTime: t, gender, calendar: "solar", birthCountry: "KR" } as SajuInput, {}, policy);
  assert.ok(r.ok);
  if (!r.ok) throw new Error("unreachable");
  return r.data;
};
const sig = (d: SajuData): SignalSet => {
  const s = deriveSignals(d);
  assert.ok(s);
  return s!;
};

function sweep(step: number, fn: (d: SajuData) => void): number {
  let n = 0;
  const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
  for (let ms = epochMsFromIsoUtc("1962-01-03T00:00:00Z")!; ms < end; ms += step * MS_PER_DAY) {
    const date = formatLocalFromEpochMs(ms, 0).date;
    for (const [t, g] of [["09:30", "male"], ["21:10", "female"], [null, "female"]] as const) {
      const r = computeSaju({ birthDate: date, birthTime: t, gender: g, calendar: "solar", birthCountry: "KR" });
      if (!r.ok) continue;
      fn(r.data);
      n++;
    }
  }
  return n;
}

test("Signal 필수 필드: id, domain, polarity, strength(1~3), evidence(1개 이상)", () => {
  const s = sig(data("1990-05-15", "14:20"));
  assert.ok(s.signals.length >= 10);
  for (const x of s.signals) {
    assert.ok(x.id.length > 0);
    assert.ok((DOMAINS as readonly string[]).includes(x.domain));
    assert.ok(["positive", "negative", "neutral"].includes(x.polarity));
    assert.ok([1, 2, 3].includes(x.strength));
    assert.ok(x.evidence.length >= 1, x.id);
    for (const e of x.evidence) assert.ok(e.detail.length > 0);
  }
  assert.equal(new Set(s.signals.map((x) => x.id)).size, s.signals.length, "id 중복 없음");
});

test("7개 점수: 기존 UI 이름 유지, 근거 Signal id 가 있고 실제로 존재한다", () => {
  const s = sig(data("1990-05-15", "14:20"));
  const sc = scoreSignals(s);
  assert.deepEqual(sc.scores.map((x) => x.label), ["재물력", "연애력", "사업력", "직업력", "인간관계", "실행력", "운의 흐름"]);
  assert.equal(sc.scoreVersion, SCORE_VERSION);
  assert.equal(sc.kind, "service-indicator");
  const ids = new Set(s.signals.map((x) => x.id));
  for (const x of sc.scores) {
    assert.ok(x.signalIds.length >= 1, x.stat);
    for (const id of x.signalIds) assert.ok(ids.has(id), id);
    assert.ok(Number.isInteger(x.value));
  }
});

test("[스윕] 모든 표본에서 7개 점수 모두 근거 Signal 보유, 범위 안, 결정론", () => {
  const lo = SCORE_RULE.mid - SCORE_RULE.amp;
  const hi = SCORE_RULE.mid + SCORE_RULE.amp;
  const values: Record<string, Set<number>> = {};
  const n = sweep(23, (d) => {
    const s = sig(d);
    const sc = scoreSignals(s);
    for (const x of sc.scores) {
      assert.ok(x.signalIds.length >= 1, `${d.input.birthDate} ${x.stat}`);
      assert.ok(x.value > lo && x.value < hi, `${x.stat} ${x.value}`);
      (values[x.stat] ??= new Set()).add(x.value);
    }
    assert.equal(JSON.stringify(scoreSignals(sig(d))), JSON.stringify(sc));
  });
  assert.ok(n > 2500);
  for (const k of STAT_KEYS) assert.ok(values[k]!.size >= 5, `${k} 값이 너무 단조롭다`);
});

test("[스윕] 점수 분포가 한쪽으로 쏠리지 않는다 (평균 50~75)", () => {
  const sum: Record<string, number> = {};
  let n = 0;
  sweep(11, (d) => {
    for (const x of scoreSignals(sig(d)).scores) sum[x.stat] = (sum[x.stat] ?? 0) + x.value;
    n++;
  });
  for (const k of STAT_KEYS) {
    const m = sum[k]! / n;
    assert.ok(m > 50 && m < 75, `${k} 평균 ${m}`);
  }
});

test("같은 SajuData → 같은 Signals/Score (100회)", () => {
  const d = data("1979-12-12", "12:12");
  const a = JSON.stringify([deriveSignals(d), scoreSignals(sig(d))]);
  for (let i = 0; i < 100; i++) assert.equal(JSON.stringify([deriveSignals(d), scoreSignals(sig(d))]), a);
});

test("연애 배우자 별: 남성은 재성, 여성은 관성 기준 (근거에 기록)", () => {
  const m = sig(data("1990-05-15", "14:20", "male")).signals.find((x) => x.id.startsWith("love.star."))!;
  const f = sig(data("1990-05-15", "14:20", "female")).signals.find((x) => x.id.startsWith("love.star."))!;
  assert.match(m.evidence[0]!.detail, /재성/);
  assert.match(f.evidence[0]!.detail, /관성/);
});

test("uncertain 기둥·시간 미상 시주는 Signal 근거 위치에 나오지 않는다", () => {
  const d = data("2010-02-04", null); // 입춘 당일 시간 미상
  const s = sig(d);
  assert.deepEqual(s.coverage.excludedPositions, ["year", "month", "hour"]);
  for (const x of s.signals) for (const e of x.evidence) for (const p of e.positions) assert.ok(!["year", "month", "hour"].includes(p), `${x.id} ${p}`);
});

test("일주가 uncertain 이면 Signal 을 만들지 않는다 (임의 선택 금지)", () => {
  const d = data("2010-06-10", null, "male", withJasiPolicy(ALPHA_POLICY, "jasi"));
  assert.equal(d.dayMaster, null);
  assert.equal(deriveSignals(d), null);
});

test("Signal 근거의 검증 상태: 일간만 verified-internally, 십성·오행·관계 기반은 not-verified", () => {
  const s = sig(data("1990-05-15", "14:20"));
  const dm = s.signals.find((x) => x.id.startsWith("personality.daymaster."))!;
  assert.equal(dm.sourceVerification, "verified-internally");
  for (const x of s.signals.filter((y) => !y.id.startsWith("personality.daymaster."))) assert.equal(x.sourceVerification, "not-verified", x.id);
});

test("12운성 값을 바꿔도 Signals 는 같다 (해석 비연결)", () => {
  const d = data("1990-05-15", "14:20");
  const fake = { ...d, twelveStages: { rule: "unverified" as const, inReadings: false, byPosition: { year: "장생" as const, month: "장생" as const, day: "장생" as const, hour: "장생" as const } } };
  assert.equal(JSON.stringify(deriveSignals(fake)), JSON.stringify(deriveSignals(d)));
});
