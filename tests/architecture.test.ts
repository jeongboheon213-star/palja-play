import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const root = `${process.cwd()}/src`;
// Windows 에서는 경로 구분자가 \ 이므로 / 로 통일한다 (통일하지 않으면 startsWith("lib/saju") 검사가 아무 파일도 고르지 않는다).
const files = readdirSync(root, { recursive: true, encoding: "utf8" })
  .map((f) => f.replace(/\\/g, "/"))
  .filter((f) => f.endsWith(".ts"));
const src = files.map((f) => ({ f, text: readFileSync(`${root}/${f}`, "utf8") }));

test("소스 파일이 존재한다", () => assert.ok(files.length >= 10));

test("비결정 요소 금지: 난수, 현재 시각, OS 시간대, 환경 변수", () => {
  const banned = [/Math\.random/, /Date\.now/, /new Date\(\s*\)/, /Intl\.DateTimeFormat/, /getTimezoneOffset/, /toLocale/, /process\.env/, /performance\.now/];
  for (const { f, text } of src) for (const re of banned) assert.ok(!re.test(text), `${f}: ${re}`);
});

test("과장 표현 금지", () => {
  const banned = [/정확한 만세력/, /100% 정확/, /검증 완료/];
  for (const { f, text } of src) for (const re of banned) assert.ok(!re.test(text), `${f}: ${re}`);
});

test("계층 의존 방향: saju는 validation/interpretation/data를 import하지 않는다", () => {
  for (const { f, text } of src.filter((s) => s.f.startsWith("lib/saju"))) {
    assert.ok(!/from "\.\.\/(validation|interpretation)|from "\.\.\/\.\.\/data/.test(text), f);
  }
});

test("계층 의존 방향: interpretation은 saju 타입만 의존, validation을 import하지 않는다", () => {
  for (const { f, text } of src.filter((s) => s.f.startsWith("lib/interpretation"))) {
    assert.ok(!/validation/.test(text), f);
  }
});

// Phase 3C 에서 "기둥 계산기 파일은 아직 없다" 관문 테스트를 아래 규칙으로 교체했다 (docs/WORKLOG.md).
test("기둥 계산은 lib/saju/pillars 에만 있고, 네 기둥은 각각 독립 함수다", () => {
  const pillarFiles = files.filter((f) => /pillar/i.test(f));
  assert.ok(pillarFiles.length > 0);
  for (const f of pillarFiles) assert.ok(f.startsWith("lib/saju/pillars/"), f);
  for (const name of ["Year", "Month", "Day", "Hour"]) {
    const owners = src.filter((s) => new RegExp(`export function calculate${name}Pillar\\(`).test(s.text));
    assert.equal(owners.length, 1, name);
    assert.equal(owners[0]!.f, `lib/saju/pillars/${name.toLowerCase()}Pillar.ts`);
  }
});

test("기둥 계산은 절기를 다시 계산하지 않는다: 천문 모델·절기 탐색을 쓰지 않고 절입 시각을 적지 않는다", () => {
  for (const { f, text } of src.filter((s) => s.f.startsWith("lib/saju/pillars/"))) {
    assert.ok(!/astronomy|apparentSolarLongitude|alphaSolarTermProvider|\.locate\(|termsInRange\(/.test(text), f);
    assert.ok(!/"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text), `${f}: 절입 시각 리터럴`);
  }
});

test("절기 계층은 연주/월주/일주/시주 계산을 하지 않는다", () => {
  for (const { f, text } of src.filter((s) => /solarTerm|astronomy|angles/i.test(s.f))) {
    assert.ok(!/calculate(Year|Month|Day|Hour)Pillar|\bganji\b|60갑자/i.test(text), f);
  }
});

test("절기 관련 과장 표현 금지", () => {
  const banned = [/정확한 절기/, /검증된 절입/, /KASI 기준과 동일/, /verified solar terms/i, /accurate solar terms/i];
  for (const { f, text } of src) for (const re of banned) assert.ok(!re.test(text), `${f}: ${re}`);
});

test("계산 계층(lib/saju)은 Date 객체 생성·시계 호출을 하지 않는다", () => {
  for (const { f, text } of src.filter((s) => s.f.startsWith("lib/saju"))) {
    assert.ok(!/new Date|Date\.(now|parse|UTC)/.test(text), f);
  }
});

test("계산 계층은 데이터 파일을 직접 import하지 않고 주입받는다", () => {
  for (const { f, text } of src.filter((s) => s.f.startsWith("lib/saju"))) {
    assert.ok(!/from "[./]*\/data\//.test(text) && !/from "\.\.\/\.\.\/data/.test(text), f);
  }
});
