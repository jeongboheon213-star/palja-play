// Phase 3D 기본 사주 데이터 테스트. 표준 표와의 내부 일관성 확인이며 외부 검증이 아니다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSaju } from "../src/lib/engine";
import { findRelations, mainHiddenStem, tenGodOf, twelveStageOf, TEN_GOD_GROUP, HIDDEN_STEMS } from "../src/lib/saju/chart";
import { BRANCH_ELEMENT, STEM_ELEMENT, branchIndex } from "../src/lib/saju/ganji";
import { BRANCHES, STEMS, TEN_GODS, TWELVE_STAGES, type Branch, type SajuInput, type Stem } from "../src/lib/saju/types";
import { VERIFICATION_STATUS } from "../src/lib/saju/verification";
import { SCHEMA_VERSION, ENGINE_VERSION } from "../src/lib/saju/version";
import type { SajuData } from "../src/lib/saju/chart";

const input = (birthDate: string, birthTime: string | null): SajuInput => ({ birthDate, birthTime, gender: "male", calendar: "solar", birthCountry: "KR" });
const saju = (d: string, t: string | null): SajuData => {
  const r = computeSaju(input(d, t));
  assert.ok(r.ok);
  if (!r.ok) throw new Error("unreachable");
  return r.data;
};

test("십성: 갑·을 일간 전체 표", () => {
  assert.deepEqual(STEMS.map((s) => tenGodOf("갑", s)), ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]);
  assert.deepEqual(STEMS.map((s) => tenGodOf("을", s)), ["겁재", "비견", "상관", "식신", "정재", "편재", "정관", "편관", "정인", "편인"]);
  assert.deepEqual(STEMS.map((s) => tenGodOf("경", s)), ["편재", "정재", "편관", "정관", "편인", "정인", "비견", "겁재", "식신", "상관"]);
});

test("십성: 모든 일간에서 10개 십성이 정확히 한 번씩, 그룹 5개 × 2", () => {
  for (const d of STEMS) {
    const got = STEMS.map((s) => tenGodOf(d, s));
    assert.deepEqual([...got].sort(), [...TEN_GODS].sort(), d);
  }
  const groups = Object.values(TEN_GOD_GROUP);
  for (const g of new Set(groups)) assert.equal(groups.filter((x) => x === g).length, 2);
});

test("지장간: 정기의 오행 = 지지 오행 (두 표의 일관성)", () => {
  for (const b of BRANCHES) assert.equal(STEM_ELEMENT[mainHiddenStem(b)], BRANCH_ELEMENT[branchIndex(b)], b);
  assert.deepEqual([...HIDDEN_STEMS["인"]!], ["무", "병", "갑"]);
  assert.deepEqual([...HIDDEN_STEMS["유"]!], ["경", "신"]);
});

test("12운성: 장생·건록·제왕 위치", () => {
  const cases: [Stem, Branch, string][] = [
    ["갑", "해", "장생"], ["갑", "인", "건록"], ["갑", "묘", "제왕"], ["갑", "오", "사"], ["갑", "미", "묘"],
    ["을", "오", "장생"], ["을", "묘", "건록"], ["을", "인", "제왕"],
    ["병", "인", "장생"], ["병", "사", "건록"], ["병", "오", "제왕"],
    ["경", "사", "장생"], ["경", "신", "건록"], ["경", "유", "제왕"],
    ["신", "자", "장생"], ["신", "유", "건록"], ["신", "신", "제왕"],
    ["임", "신", "장생"], ["임", "해", "건록"], ["임", "자", "제왕"],
    ["계", "묘", "장생"], ["계", "자", "건록"], ["계", "해", "제왕"],
  ];
  for (const [s, b, st] of cases) assert.equal(twelveStageOf(s, b), st, `${s} ${b}`);
  for (const s of STEMS) assert.deepEqual(BRANCHES.map((b) => twelveStageOf(s, b)).sort(), [...TWELVE_STAGES].sort());
});

test("관계: 천간합·충, 육합·충·해·파·형, 삼합·반합·방합", () => {
  const kinds = (ps: [string, Stem, Branch][]) =>
    findRelations(ps.map(([position, stem, branch]) => ({ position: position as "year", stem, branch }))).map((r) => `${r.kind}:${r.members.join("")}`);
  assert.deepEqual(kinds([["year", "갑", "자"], ["day", "기", "축"]]), ["천간합:갑기", "지지육합:자축"]);
  assert.deepEqual(kinds([["year", "갑", "자"], ["day", "경", "오"]]), ["천간충:갑경", "지지충:자오"]);
  assert.deepEqual(kinds([["year", "무", "자"], ["day", "갑", "미"]]), ["지지해:자미"]);
  assert.deepEqual(kinds([["year", "무", "자"], ["day", "기", "유"]]), ["지지파:자유"]);
  assert.deepEqual(kinds([["year", "무", "자"], ["day", "기", "묘"]]), ["지지형:자묘"]);
  assert.deepEqual(kinds([["year", "무", "진"], ["day", "무", "진"]]), ["지지형:진진"]);
  assert.ok(kinds([["year", "무", "신"], ["month", "무", "자"], ["day", "무", "진"]]).includes("삼합:신자진"));
  assert.ok(kinds([["year", "무", "신"], ["day", "무", "자"]]).includes("반합:신자"));
  assert.ok(!kinds([["year", "무", "신"], ["day", "무", "진"]]).some((k) => k.startsWith("반합")), "왕지 없는 두 글자는 반합 아님");
  assert.ok(kinds([["year", "무", "인"], ["month", "무", "묘"], ["day", "무", "진"]]).includes("방합:인묘진"));
  assert.ok(kinds([["year", "무", "인"], ["day", "무", "사"]]).includes("지지형:인사"));
  assert.deepEqual(kinds([["year", "무", "자"], ["day", "기", "축"]]).filter((k) => k.startsWith("천간")), [], "무기는 합·충 아님");
});

test("SajuData: 시간 있음 - 8글자 모두 오행·십성·12운성 포함", () => {
  const d = saju("1990-05-15", "14:20");
  assert.equal(d.schemaVersion, SCHEMA_VERSION);
  assert.equal(d.engineVersion, ENGINE_VERSION);
  assert.deepEqual(d.dayMaster, { stem: "경", element: "금", yinYang: "yang" });
  assert.equal(d.fiveElements.total, 8);
  assert.deepEqual(d.fiveElements.excludedPositions, []);
  assert.equal(d.tenGods.day!.stem, null);
  assert.equal(d.tenGods.hour!.stem, "상관");
  assert.deepEqual(Object.keys(d.twelveStages!.byPosition).sort(), ["day", "hour", "month", "year"]);
});

test("SajuData: 시간 미상 - 시주는 오행·십성·관계에서 빠지고 제외 목록에 남는다", () => {
  const d = saju("1990-05-15", null);
  assert.equal(d.pillars.hour, null);
  assert.equal(d.fiveElements.total, 6);
  assert.deepEqual(d.fiveElements.excludedPositions, ["hour"]);
  assert.equal(d.tenGods.hour, undefined);
  assert.ok(d.relations.every((r) => !r.positions.includes("hour")));
});

test("SajuData: 입춘 당일 시간 미상 - 연·월 uncertain 이면 계산에서 제외 (후보를 고르지 않음)", () => {
  // 2010 입춘 당일
  const d = saju("2010-02-04", null);
  assert.equal(d.confidence.year, "uncertain");
  assert.equal(d.confidence.month, "uncertain");
  assert.deepEqual(d.fiveElements.excludedPositions, ["year", "month", "hour"]);
  assert.equal(d.fiveElements.total, 2);
  assert.equal(d.tenGods.year, undefined);
  assert.ok(d.dayMaster);
});

test("SajuData: 12운성은 unverified + 해석 비연결", () => {
  const d = saju("1990-05-15", "14:20");
  assert.equal(d.twelveStages!.rule, "unverified");
  assert.equal(d.twelveStages!.inReadings, false);
  assert.equal(VERIFICATION_STATUS.twelveStages.level, "not-verified");
});

test("SajuData: 3D 항목 검증 상태는 not-verified (일주만 verified-internally)", () => {
  for (const id of ["hiddenStems", "fiveElements", "tenGods", "relations"] as const) assert.equal(VERIFICATION_STATUS[id].level, "not-verified", id);
});

test("SajuData: 결정론 + 동결 + 호출자 입력은 동결하지 않음", () => {
  const a = JSON.stringify(saju("1988-08-08", "08:08"));
  assert.equal(JSON.stringify(saju("1988-08-08", "08:08")), a);
  const inp = input("1988-08-08", "08:08");
  const r = computeSaju(inp);
  assert.ok(r.ok);
  if (r.ok) assert.throws(() => { (r.data.fiveElements.counts as Record<string, number>)["목"] = 99; });
  assert.equal(Object.isFrozen(inp), false);
});

test("SajuData: 넓은 범위에서 오행 합계 = 2 × 포함 기둥 수", () => {
  for (let y = 1962; y <= 2026; y += 3) {
    for (const t of ["03:00", "15:30", null]) {
      const d = saju(`${y}-0${(y % 9) + 1}-1${y % 10}`, t);
      assert.equal(d.fiveElements.total, 2 * d.fiveElements.includedPositions.length);
    }
  }
});
