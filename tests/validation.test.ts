import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSajuInput } from "../src/lib/validation";
import { kstDateFromEpochMs } from "../src/lib/validation/kst";

const base = { birthDate: "1990-05-15", birthTime: "07:30", gender: "female", calendar: "solar", birthCountry: "KR" };
const codes = (o: unknown, opt = {}) => {
  const r = validateSajuInput(o, opt);
  return r.ok ? [] : r.errors.map((e) => `${e.field}:${e.code}`);
};

test("정상 입력", () => {
  const r = validateSajuInput(base);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.birthTime, "07:30");
    assert.equal(r.value.gender, "female");
  }
});

test("시간 미상 = null 허용, 필드 누락은 오류", () => {
  const r = validateSajuInput({ ...base, birthTime: null });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.birthTime, null);
  const { birthTime: _omit, ...noTime } = base;
  assert.deepEqual(codes(noTime), ["birthTime:TIME_FIELD_MISSING"]);
});

test("빈 문자열/모름 문자열은 추측하지 않고 오류", () => {
  assert.deepEqual(codes({ ...base, birthTime: "" }), ["birthTime:TIME_FORMAT"]);
  assert.deepEqual(codes({ ...base, birthTime: "모름" }), ["birthTime:TIME_FORMAT"]);
});

test("시간 유효성", () => {
  for (const t of ["7:05", "0705", "07:5"]) assert.deepEqual(codes({ ...base, birthTime: t }), ["birthTime:TIME_FORMAT"]);
  for (const t of ["24:00", "23:60", "99:99"]) assert.deepEqual(codes({ ...base, birthTime: t }), ["birthTime:TIME_OUT_OF_RANGE"]);
  for (const t of ["00:00", "23:59", "12:00"]) assert.ok(validateSajuInput({ ...base, birthTime: t }).ok);
  assert.deepEqual(codes({ ...base, birthTime: 730 }), ["birthTime:TIME_FORMAT"]);
});

test("날짜 유효성", () => {
  assert.deepEqual(codes({ ...base, birthDate: "1990-02-30" }), ["birthDate:DATE_NOT_EXIST"]);
  assert.deepEqual(codes({ ...base, birthDate: "1990-13-01" }), ["birthDate:DATE_NOT_EXIST"]);
  assert.deepEqual(codes({ ...base, birthDate: "1991-02-29" }), ["birthDate:DATE_NOT_EXIST"]);
  assert.ok(validateSajuInput({ ...base, birthDate: "1996-02-29" }).ok);
  assert.deepEqual(codes({ ...base, birthDate: "1900-02-29" }), ["birthDate:DATE_NOT_EXIST"]);
  assert.deepEqual(codes({ ...base, birthDate: "1990/05/15" }), ["birthDate:DATE_FORMAT"]);
  assert.deepEqual(codes({ ...base, birthDate: "90-5-15" }), ["birthDate:DATE_FORMAT"]);
  assert.deepEqual(codes({ ...base, birthDate: "" }), ["birthDate:DATE_REQUIRED"]);
  assert.deepEqual(codes({ ...base, birthDate: 19900515 }), ["birthDate:DATE_FORMAT"]);
});

test("지원 시작일 경계 (1962-01-01)", () => {
  assert.ok(validateSajuInput({ ...base, birthDate: "1962-01-01" }).ok);
  assert.deepEqual(codes({ ...base, birthDate: "1961-12-31" }), ["birthDate:DATE_BEFORE_SUPPORTED"]);
});

test("미래 날짜: todayKst 주입 시에만 검사", () => {
  assert.ok(validateSajuInput({ ...base, birthDate: "2999-01-01" }).ok);
  assert.deepEqual(codes({ ...base, birthDate: "2026-10-06" }, { todayKst: "2026-10-05" }), ["birthDate:DATE_IN_FUTURE"]);
  assert.ok(validateSajuInput({ ...base, birthDate: "2026-10-05" }, { todayKst: "2026-10-05" }).ok);
});

test("성별", () => {
  for (const g of ["", "M", "남", undefined, null, 1]) assert.deepEqual(codes({ ...base, gender: g }), ["gender:GENDER_INVALID"]);
  assert.ok(validateSajuInput({ ...base, gender: "male" }).ok);
});

test("음력/해외는 변환 없이 거부", () => {
  assert.deepEqual(codes({ ...base, calendar: "lunar" }), ["calendar:CALENDAR_UNSUPPORTED"]);
  assert.deepEqual(codes({ ...base, calendar: undefined }), ["calendar:CALENDAR_UNSUPPORTED"]);
  assert.deepEqual(codes({ ...base, birthCountry: "US" }), ["birthCountry:COUNTRY_UNSUPPORTED"]);
});

test("객체가 아닌 입력", () => {
  for (const x of [null, undefined, "x", 1, []]) assert.deepEqual(codes(x), ["input:INPUT_NOT_OBJECT"]);
});

test("여러 오류를 한 번에 반환", () => {
  assert.equal(codes({}).length, 5);
});

test("결과 객체는 동결되고 입력 객체는 변경되지 않는다", () => {
  const input = { ...base };
  const snap = JSON.stringify(input);
  const r = validateSajuInput(input);
  assert.equal(JSON.stringify(input), snap);
  if (r.ok) assert.throws(() => { (r.value as { gender: string }).gender = "male"; });
});

test("결정론: 같은 입력 100회 동일 결과", () => {
  const first = JSON.stringify(validateSajuInput(base));
  for (let i = 0; i < 100; i++) assert.equal(JSON.stringify(validateSajuInput(base)), first);
  const bad = JSON.stringify(validateSajuInput({ ...base, birthDate: "1990-02-30" }));
  for (let i = 0; i < 100; i++) assert.equal(JSON.stringify(validateSajuInput({ ...base, birthDate: "1990-02-30" })), bad);
});

test("KST 날짜 변환 (UTC 15:00 = 다음날 00:00 KST)", () => {
  assert.equal(kstDateFromEpochMs(Date.UTC(2026, 9, 4, 14, 59, 59)), "2026-10-04");
  assert.equal(kstDateFromEpochMs(Date.UTC(2026, 9, 4, 15, 0, 0)), "2026-10-05");
  assert.equal(kstDateFromEpochMs(Date.UTC(2025, 11, 31, 15, 0, 0)), "2026-01-01");
});
