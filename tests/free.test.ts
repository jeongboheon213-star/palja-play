// Phase 5 FREE 결과 테스트.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSaju } from "../src/lib/engine";
import { buildFreeReading, CHARACTERS, SIGNAL_COPY, FREE_LIMITS, NOTICE_TEXT, BETA_DISCLAIMER, type FreeReading } from "../src/lib/interpretation";
import { ALPHA_POLICY, withJasiPolicy } from "../src/lib/saju/policies";
import { MS_PER_DAY, epochMsFromIsoUtc, formatLocalFromEpochMs } from "../src/lib/saju/civil";
import { STEMS, type Gender } from "../src/lib/saju/types";
import type { SignalSet } from "../src/lib/interpretation";

const free = (d: string, t: string | null, g: Gender = "female", policy = ALPHA_POLICY) => {
  const r = computeSaju({ birthDate: d, birthTime: t, gender: g, calendar: "solar", birthCountry: "KR" }, {}, policy);
  assert.ok(r.ok);
  if (!r.ok) throw new Error("unreachable");
  return buildFreeReading(r.data);
};
const ok = (x: ReturnType<typeof free>): { reading: FreeReading; signals: SignalSet } => {
  assert.ok(x.ok);
  if (!x.ok) throw new Error("unreachable");
  return x;
};

function allItems(r: FreeReading) {
  return [
    ...r.coreTraits,
    ...r.strengths,
    ...r.cautions,
    ...r.keywords,
    ...r.fiveElements.summary,
    ...r.reversals,
    ...r.sections.flatMap((s) => s.items),
    { text: r.character.name, signalIds: r.character.signalIds },
  ];
}

function sweep(step: number, fn: (x: { reading: FreeReading; signals: SignalSet }) => void): number {
  let n = 0;
  const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
  for (let ms = epochMsFromIsoUtc("1962-01-04T00:00:00Z")!; ms < end; ms += step * MS_PER_DAY) {
    const date = formatLocalFromEpochMs(ms, 0).date;
    for (const [t, g] of [["07:45", "male"], ["19:05", "female"], [null, "male"]] as const) {
      const r = computeSaju({ birthDate: date, birthTime: t, gender: g, calendar: "solar", birthCountry: "KR" });
      if (!r.ok) continue;
      fn(ok(buildFreeReading(r.data)));
      n++;
    }
  }
  return n;
}

test("FREE 구성: 캐릭터·성향 5~7·강점 5+·주의점 3+·오행·7개 능력치·5개 영역·키워드", () => {
  const { reading: r } = ok(free("1990-05-15", "14:20"));
  assert.equal(r.tier, "free");
  assert.equal(r.axis, "what");
  assert.ok(r.character.name && r.character.tagline && r.character.emoji);
  assert.ok(r.coreTraits.length >= 5 && r.coreTraits.length <= 7);
  assert.ok(r.strengths.length >= 5);
  assert.ok(r.cautions.length >= 3);
  assert.equal(r.scores.length, 7);
  assert.deepEqual(r.sections.map((s) => s.domain), ["wealth", "love", "career", "business", "relationship"]);
  for (const s of r.sections) assert.ok(s.items.length >= 2, s.domain);
  assert.ok(r.keywords.length >= 3);
  assert.ok(r.fiveElements.summary.length >= 1);
  assert.equal(r.pillars.length, 4);
});

test("[스윕] 최소 개수는 모든 표본(시간 미상 포함)에서 지켜진다", () => {
  const n = sweep(13, ({ reading: r }) => {
    assert.ok(r.coreTraits.length >= FREE_LIMITS.traits[0] && r.coreTraits.length <= FREE_LIMITS.traits[1]);
    assert.ok(r.strengths.length >= FREE_LIMITS.strengths[0]);
    assert.ok(r.cautions.length >= FREE_LIMITS.cautions[0]);
    assert.ok(r.keywords.length >= FREE_LIMITS.keywords[0]);
    for (const s of r.sections) assert.ok(s.items.length >= 1);
  });
  assert.ok(n > 5000);
});

test("최소 개수: 입춘 당일 시간 미상(확정 기둥 1개)에서도 지켜진다", () => {
  const { reading: r } = ok(free("2010-02-04", null, "male"));
  assert.ok(r.coreTraits.length >= 5);
  assert.ok(r.strengths.length >= 5);
  assert.ok(r.cautions.length >= 3);
  assert.deepEqual(r.notices.map((x) => x.code), ["TIME_UNKNOWN", "PILLAR_UNCERTAIN", "PARTIAL_DATA"]);
  assert.deepEqual(r.notices[1]!.positions, ["year", "month"]);
  const month = r.pillars.find((p) => p.position === "month")!;
  assert.equal(month.ganji, null);
  assert.equal(month.candidates.length, 2);
});

test("[스윕] 모든 문장에 근거 Signal id 가 있고, 실제 Signal 목록에 존재한다", () => {
  sweep(17, ({ reading: r, signals }) => {
    const ids = new Set(signals.signals.map((s) => s.id));
    for (const it of allItems(r)) {
      assert.ok(it.signalIds.length >= 1, it.text);
      for (const id of it.signalIds) assert.ok(ids.has(id), `${id} (${it.text})`);
    }
    for (const sc of r.scores) for (const id of sc.signalIds) assert.ok(ids.has(id));
  });
});

test("[스윕] 반전 포인트는 같은 영역에 반대 polarity Signal 이 실제로 있을 때만, 있으면 반드시 만든다", () => {
  let withRev = 0;
  let n = 0;
  sweep(7, ({ reading: r, signals }) => {
    n++;
    if (r.reversals.length) withRev++;
    const byId = new Map(signals.signals.map((s) => [s.id, s]));
    for (const rv of r.reversals) {
      assert.equal(rv.signalIds.length, 2);
      const [a, b] = rv.signalIds.map((id) => byId.get(id)!);
      assert.equal(a!.domain, rv.domain);
      assert.equal(b!.domain, rv.domain);
      assert.equal(a!.polarity, "positive");
      assert.equal(b!.polarity, "negative");
    }
    for (const domain of ["wealth", "love", "career", "business", "relationship", "execution", "flow"] as const) {
      const inD = signals.signals.filter((s) => s.domain === domain);
      const canPos = inD.some((s) => s.polarity === "positive" && SIGNAL_COPY[s.id]?.revPos);
      const canNeg = inD.some((s) => s.polarity === "negative" && SIGNAL_COPY[s.id]?.revNeg);
      assert.equal(r.reversals.some((x) => x.domain === domain), canPos && canNeg, domain);
    }
  });
  assert.ok(withRev > 0 && withRev < n, "반전이 항상/전혀 없지는 않다");
});

test("[스윕] 생성되는 모든 Signal 에 문구 정의가 있다 (일간 캐릭터 제외)", () => {
  const missing = new Set<string>();
  sweep(9, ({ signals }) => {
    for (const s of signals.signals) if (!s.id.startsWith("personality.daymaster.") && !(s.id in SIGNAL_COPY)) missing.add(s.id);
  });
  assert.deepEqual([...missing], []);
});

test("반전 문장 형식: positive 는 '~지만,' 으로 끝나고 negative 는 완결 문장", () => {
  for (const [id, c] of Object.entries(SIGNAL_COPY)) {
    if (c.revPos) assert.match(c.revPos, /지만,$/, id);
    if (c.revNeg) assert.match(c.revNeg, /[요다]\.$/, id);
  }
});

test("10개 일간 캐릭터: 필수 문구 개수", () => {
  const ids = new Set<string>();
  for (const s of STEMS) {
    const c = CHARACTERS[s];
    assert.ok(c.name && c.tagline && c.emoji);
    assert.equal(c.traits.length, 3);
    assert.equal(c.strengths.length, 3);
    assert.equal(c.cautions.length, 2);
    assert.equal(c.keywords.length, 3);
    assert.equal(c.moreTraits.length, 2);
    assert.equal(c.moreStrengths.length, 2);
    assert.ok(c.moreCautions.length >= 1);
    for (const k of ["wealth", "love", "career", "business", "relationship"] as const) assert.ok(c.lines[k].length > 0);
    ids.add(c.id);
  }
  assert.equal(ids.size, 10);
});

test("문구에 단정·예언·과장·조언 금지 표현이 없다", () => {
  const banned = [/반드시/, /무조건/, /100%/, /정확한/, /확실히/, /틀림없/, /운명이다/, /투자하세요/, /사세요/, /병에 걸/, /이혼/, /사망/, /검증된/];
  const texts = [
    ...Object.values(SIGNAL_COPY).flatMap((c) => Object.values(c)),
    ...STEMS.flatMap((s) => {
      const c = CHARACTERS[s];
      return [c.name, c.tagline, ...c.traits, ...c.strengths, ...c.cautions, ...c.keywords, ...c.moreTraits, ...c.moreStrengths, ...c.moreCautions, ...Object.values(c.lines)];
    }),
    ...Object.values(NOTICE_TEXT),
    BETA_DISCLAIMER,
  ];
  for (const t of texts) for (const re of banned) assert.ok(!re.test(t), `${re} in "${t}"`);
});

test("안내: 경계 위험 / 시간 미상", () => {
  const near = ok(free("2020-02-04", "17:50")).reading; // 2020 입춘 근처 (Alpha 제공자 기준)
  const far = ok(free("2020-06-10", "12:00")).reading;
  assert.equal(far.boundaryRisk, false);
  assert.ok(!far.notices.some((n) => n.code === "BOUNDARY_RISK"));
  if (near.boundaryRisk) assert.equal(near.notices[0]!.text, NOTICE_TEXT.BOUNDARY_RISK);
  assert.ok(ok(free("2020-06-10", null)).reading.notices.some((n) => n.code === "TIME_UNKNOWN"));
});

test("경계 위험이 있어도 결과를 막지 않는다", () => {
  // 연·월주가 confirmed + boundaryRisk 인 사례를 찾아 FREE 결과가 정상 생성되는지 본다
  let found = false;
  for (let m = 0; m < 120 && !found; m += 5) {
    const t = `17:${String(m % 60).padStart(2, "0")}`;
    const r = computeSaju({ birthDate: "2020-02-04", birthTime: m < 60 ? t : `18:${String(m - 60).padStart(2, "0")}`, gender: "male", calendar: "solar", birthCountry: "KR" });
    if (r.ok && r.data.boundaryRisk) {
      found = true;
      const f = ok(buildFreeReading(r.data)).reading;
      assert.ok(f.notices.some((n) => n.code === "BOUNDARY_RISK"));
      assert.ok(f.coreTraits.length >= 5);
    }
  }
  assert.ok(found, "2020 입춘 근처에서 경계 위험 사례가 있어야 한다");
});

test("버전 정보: 엔진·스키마·해석·점수·절기 제공자·정책", () => {
  const v = ok(free("1990-05-15", "14:20")).reading.versions;
  assert.deepEqual(Object.keys(v).sort(), ["engineVersion", "interpretationVersion", "policyVersion", "schemaVersion", "scoreVersion", "solarTermProviderVersion"]);
  assert.equal(v.interpretationVersion, "0.2.0-beta");
  assert.equal(v.scoreVersion, "score-0.1.0");
});

test("결과에 생년월일·성별 원본이 들어 있지 않다 (공유·피드백용 데이터 분리)", () => {
  const r = ok(free("1990-05-15", "14:20")).reading;
  const json = JSON.stringify(r);
  assert.ok(!json.includes("1990-05-15"));
  assert.ok(!json.includes("14:20"));
  assert.ok(!/"gender"/.test(json));
});

test("결정론 + 동결", () => {
  const a = JSON.stringify(free("1985-11-30", "04:44"));
  for (let i = 0; i < 20; i++) assert.equal(JSON.stringify(free("1985-11-30", "04:44")), a);
  const r = ok(free("1985-11-30", "04:44")).reading;
  assert.throws(() => { (r.coreTraits as unknown as unknown[]).push("x"); });
});

test("일주 uncertain 이면 FREE 결과를 만들지 않는다 (임의 선택 금지)", () => {
  const x = free("2010-06-10", null, "male", withJasiPolicy(ALPHA_POLICY, "jasi"));
  assert.equal(x.ok, false);
  if (!x.ok) assert.equal(x.code, "DAY_MASTER_UNAVAILABLE");
});
