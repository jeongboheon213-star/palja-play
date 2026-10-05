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

test("기둥 계산기/사주 계산기 파일은 아직 없다 (Phase 3C 이전)", () => {
  for (const f of files) assert.ok(!/pillars|calculator\.ts/i.test(f), f);
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
