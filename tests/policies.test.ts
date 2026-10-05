import { test } from "node:test";
import assert from "node:assert/strict";
import { ALPHA_POLICY, withJasiPolicy, withLongitudeCorrection } from "../src/lib/saju/policies";
import { SCHEMA_VERSION, ENGINE_VERSION } from "../src/lib/saju/version";
import { INTERPRETATION_VERSION } from "../src/lib/interpretation/version";
import { PRODUCTS, getProduct } from "../src/data/products";
import { compareIsoDate, daysInMonth, isLeapYear, parseHm, parseIsoDate } from "../src/lib/saju/isoDate";

test("Alpha 정책 값", () => {
  assert.equal(ALPHA_POLICY.calendar.minSupportedDate, "1962-01-01");
  assert.equal(ALPHA_POLICY.calendar.lunarInput, false);
  assert.equal(ALPHA_POLICY.time.historicalOffsets, true);
  assert.equal(ALPHA_POLICY.time.offsetDataSource, "code-fixed");
  assert.equal(ALPHA_POLICY.time.longitudeCorrection, false);
  assert.equal(ALPHA_POLICY.time.referenceLongitude, 127.5);
  assert.equal(ALPHA_POLICY.time.jasiPolicy, "midnight");
  assert.equal(ALPHA_POLICY.solarTerm.provider, "alpha");
  assert.equal(ALPHA_POLICY.twelveStageRule, "unverified");
  assert.equal(ALPHA_POLICY.twelveStagesInReadings, false);
});

test("정책은 동결되어 있다", () => {
  assert.throws(() => { (ALPHA_POLICY.time as { jasiPolicy: string }).jasiPolicy = "jasi"; });
  assert.throws(() => { (ALPHA_POLICY as { label: string }).label = "x"; });
});

test("자시 정책 교체: 원본 불변, 새 정책만 변경", () => {
  for (const j of ["midnight", "jasi", "splitJasi"] as const) {
    const p = withJasiPolicy(ALPHA_POLICY, j);
    assert.equal(p.time.jasiPolicy, j);
    assert.equal(p.time.longitudeCorrection, false);
  }
  assert.equal(ALPHA_POLICY.time.jasiPolicy, "midnight");
});

test("경도 보정 교체", () => {
  assert.equal(withLongitudeCorrection(ALPHA_POLICY, true).time.longitudeCorrection, true);
  assert.equal(ALPHA_POLICY.time.longitudeCorrection, false);
});

test("버전 상수", () => {
  assert.equal(SCHEMA_VERSION, "0.2.0");
  assert.equal(ENGINE_VERSION, "0.2.0-beta");
  assert.equal(INTERPRETATION_VERSION, "0.2.0-beta");
});

// Phase 6: 단일 premium_report(모의 결제) → Beta 3종 리포트(결제 없음, Beta 테스트 가격)로 교체 (docs/WORKLOG.md).
test("PRODUCTS", () => {
  assert.equal(getProduct("free_result").priceKrw, 0);
  assert.equal(getProduct("free_result").paymentEnabled, false);
  assert.deepEqual([...PRODUCTS.free_result.axes], ["what"]);
  for (const id of ["premium_money", "premium_love", "premium_career"] as const) {
    const p = PRODUCTS[id];
    assert.equal(p.priceKrw, 4900, id);
    assert.equal(p.betaTestPrice, true, id);
    assert.equal(p.paymentEnabled, false, id);
    assert.deepEqual([...p.axes], ["why", "how", "when"], id);
  }
  assert.equal(PRODUCTS.premium_money.name, "재물 심층 리포트");
  assert.equal(PRODUCTS.premium_love.name, "연애 심층 리포트");
  assert.equal(PRODUCTS.premium_career.name, "직업·사업 심층 리포트");
  assert.throws(() => { (PRODUCTS.premium_money as { priceKrw: number }).priceKrw = 1; });
});

test("isoDate 유틸", () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2024), true);
  assert.equal(daysInMonth(2023, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2024, 4), 30);
  assert.equal(parseIsoDate("2024-02-29")?.day, 29);
  assert.equal(parseIsoDate("2023-02-29"), null);
  assert.equal(parseIsoDate("0000-01-01"), null);
  assert.equal(compareIsoDate("1962-01-01", "1962-01-02"), -1);
  assert.equal(compareIsoDate("1962-01-01", "1962-01-01"), 0);
  assert.equal(compareIsoDate("2000-01-01", "1999-12-31"), 1);
  assert.deepEqual(parseHm("23:59"), { hour: 23, minute: 59 });
  assert.equal(parseHm("24:00"), null);
});
