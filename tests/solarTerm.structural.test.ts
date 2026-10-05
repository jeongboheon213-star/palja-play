// [A] Structural tests: 구조·정의·결과 형태·결정론. 정확도를 주장하지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SOLAR_TERMS, SOLAR_TERM_COUNT, termAt, termIndexForLongitude } from "../src/lib/saju/solarTerms";
import { circularDifferenceDeg, normalizeDegrees } from "../src/lib/saju/angles";
import { createAlphaSolarTermProvider, ALPHA_ALGORITHM_VERSION, ALPHA_PROVIDER_VERSION } from "../src/lib/saju/alphaSolarTermProvider";
import { ALPHA_POLICY } from "../src/lib/saju/policies";
import { epochMsFromIsoUtc, formatLocalFromEpochMs, isoUtcFromEpochMs } from "../src/lib/saju/civil";
import { VERIFICATION_STATUS } from "../src/lib/saju/verification";
import { SOLAR_LONGITUDE_MODEL } from "../src/lib/saju/astronomy";

const P = createAlphaSolarTermProvider({ boundaryWarning: ALPHA_POLICY.solarTerm.boundaryWarning });
const ms = (s: string): number => epochMsFromIsoUtc(s) as number;

test("[A] 24절기: 개수·순서·이름·목표 황경", () => {
  assert.equal(SOLAR_TERMS.length, 24);
  assert.equal(SOLAR_TERM_COUNT, 24);
  const names = "입춘 우수 경칩 춘분 청명 곡우 입하 소만 망종 하지 소서 대서 입추 처서 백로 추분 한로 상강 입동 소설 대설 동지 소한 대한".split(" ");
  assert.deepEqual(SOLAR_TERMS.map((t) => t.nameKo), names);
  SOLAR_TERMS.forEach((t, i) => {
    assert.equal(t.order, i + 1);
    assert.equal(t.targetLongitude, (315 + 15 * i) % 360, t.nameKo);
  });
  assert.equal(new Set(SOLAR_TERMS.map((t) => t.id)).size, 24);
  assert.equal(new Set(SOLAR_TERMS.map((t) => t.targetLongitude)).size, 24);
  const byName = Object.fromEntries(SOLAR_TERMS.map((t) => [t.nameKo, t.targetLongitude]));
  assert.deepEqual(
    [byName["춘분"], byName["하지"], byName["추분"], byName["동지"], byName["입춘"], byName["소한"], byName["대한"]],
    [0, 90, 180, 270, 315, 285, 300],
  );
});

test("[A] 절(節) 12개 / 중기 12개, 월주 경계 후보 구분은 구조 정보일 뿐", () => {
  const jeol = SOLAR_TERMS.filter((t) => t.kind === "jeol");
  assert.equal(jeol.length, 12);
  for (const t of jeol) assert.equal(t.targetLongitude % 30, 15, t.nameKo);
  for (const t of SOLAR_TERMS.filter((x) => x.kind === "junggi")) assert.equal(t.targetLongitude % 30, 0, t.nameKo);
  assert.deepEqual(SOLAR_TERMS.filter((t) => t.monthBoundaryCandidate).map((t) => t.id), jeol.map((t) => t.id));
  assert.deepEqual(SOLAR_TERMS.filter((t) => t.yearBoundaryCandidate).map((t) => t.id), ["ipchun"]);
  assert.throws(() => { (SOLAR_TERMS[0] as { nameKo: string }).nameKo = "x"; });
});

test("[A] termAt 순환, termIndexForLongitude 경계", () => {
  assert.equal(termAt(0).id, "ipchun");
  assert.equal(termAt(24).id, "ipchun");
  assert.equal(termAt(-1).id, "daehan");
  assert.equal(termIndexForLongitude(315), 0);
  assert.equal(termIndexForLongitude(314.999), 23);
  assert.equal(termIndexForLongitude(0), 3);
  assert.equal(termIndexForLongitude(359.999), 2);
  assert.equal(termIndexForLongitude(14.999), 3);
  assert.equal(termIndexForLongitude(15), 4);
  assert.equal(termIndexForLongitude(-0.001), 2);
  assert.equal(termIndexForLongitude(360.001), 3);
});

test("[A] 각도 wraparound: 359.999° / 0° / 0.001° 를 359도 차이로 보지 않는다", () => {
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  close(circularDifferenceDeg(0, 359.999), 0.001);
  close(circularDifferenceDeg(359.999, 0), -0.001);
  close(circularDifferenceDeg(0.001, 359.999), 0.002);
  close(circularDifferenceDeg(359.999, 0.001), -0.002);
  close(circularDifferenceDeg(10, 350), 20);
  close(circularDifferenceDeg(350, 10), -20);
  close(circularDifferenceDeg(180, 0), -180);
  close(circularDifferenceDeg(0, 0), 0);
  close(circularDifferenceDeg(720.5, 0.5), 0);
  close(normalizeDegrees(-0.001), 359.999);
  close(normalizeDegrees(360), 0);
  close(normalizeDegrees(725), 5);
});

test("[A] 시간 표현 보조 함수: 밀리초 왕복·벽시계 변환", () => {
  const s = "2026-02-03T20:02:01.123Z";
  assert.equal(isoUtcFromEpochMs(ms(s)), s);
  assert.equal(isoUtcFromEpochMs(ms("2026-02-03T20:02:00Z")), "2026-02-03T20:02:00.000Z");
  assert.equal(ms("2026-02-03T20:02:01.5Z"), ms("2026-02-03T20:02:01.500Z"));
  assert.equal(epochMsFromIsoUtc("2026-02-30T00:00:00Z"), null);
  assert.equal(epochMsFromIsoUtc("2026-02-03T24:00:00Z"), null);
  assert.deepEqual(formatLocalFromEpochMs(ms(s), 540), { date: "2026-02-04", time: "05:02:01.123" });
  assert.deepEqual(formatLocalFromEpochMs(ms("1969-12-31T23:59:59.999Z"), 0), { date: "1969-12-31", time: "23:59:59.999" });
});

test("[A] 결과 구조와 provenance", () => {
  const r = P.locate(ms("2026-02-03T00:00:00Z"));
  assert.ok(r.ok);
  if (!r.ok) return;
  const v = r.value;
  assert.deepEqual(Object.keys(v).sort(), [
    "accuracy", "boundary", "currentTerm", "nextTerm", "precision", "previousTerm", "provider",
    "queryEpochMs", "queryInstantUtc", "sinceCurrentTermMs", "untilNextTermMs", "verificationStatus",
  ]);
  assert.equal(v.verificationStatus, "not-verified");
  assert.deepEqual(v.accuracy, { status: "not-verified", errorBoundSeconds: null });
  assert.deepEqual(v.precision, { unit: "millisecond" });
  assert.equal(v.provider.id, "alpha");
  assert.equal(v.provider.source, "internal-alpha");
  assert.equal(v.provider.version, ALPHA_PROVIDER_VERSION);
  assert.equal(v.provider.algorithmVersion, ALPHA_ALGORITHM_VERSION);
  for (const t of [v.currentTerm, v.previousTerm, v.nextTerm]) {
    assert.deepEqual(Object.keys(t).sort(), ["epochMs", "nameKo", "order", "targetLongitude", "termId", "termInstantUtc"]);
    assert.equal(t.termInstantUtc, isoUtcFromEpochMs(t.epochMs));
  }
  assert.equal(P.verificationStatus, "not-verified");
  assert.equal(SOLAR_LONGITUDE_MODEL.source, "internal-alpha");
});

test("[A] 수학적 경계(A)와 서비스 경고 경계(B)는 별도 필드, 경고 범위는 정책 provenance 를 가진다", () => {
  const b = ALPHA_POLICY.solarTerm.boundaryWarning;
  assert.deepEqual({ ...b }, { minutes: 30, reason: "alpha-provisional", meaning: "service-warning-window-not-an-accuracy-bound" });
  const r = P.locate(ms("2026-02-03T00:00:00Z"));
  assert.ok(r.ok);
  if (r.ok) {
    assert.ok("mathematical" in r.value.boundary && "serviceWarning" in r.value.boundary);
    assert.equal(r.value.boundary.serviceWarning.reason, "alpha-provisional");
    assert.equal(r.value.boundary.serviceWarning.windowMinutes, 30);
    assert.equal(typeof r.value.boundary.mathematical.signedDistanceMs, "number");
  }
});

test("[A] 검증 상태: 절기는 not-verified 로 기록되고 승격되지 않았다", () => {
  assert.equal(VERIFICATION_STATUS.solarTerms.level, "not-verified");
  assert.equal(VERIFICATION_STATUS.monthPillarSolarTerm.level, "not-verified");
});

test("[A] 결정론: 같은 입력 100회 동일, 질의 순서 무관(전역 상태 없음), Date 어댑터 일치", () => {
  const qs = [ms("2026-02-03T20:00:00Z"), ms("1987-06-01T00:00:00Z"), ms("2000-12-31T23:59:59.999Z")];
  const first = qs.map((q) => JSON.stringify(P.locate(q)));
  for (let i = 0; i < 100; i++) assert.deepEqual(qs.map((q) => JSON.stringify(P.locate(q))), first);
  assert.deepEqual([...qs].reverse().map((q) => JSON.stringify(P.locate(q))), [...first].reverse());
  for (const q of qs) assert.equal(JSON.stringify(P.getSolarTerm(new Date(q))), JSON.stringify(P.locate(q)));
  const a = JSON.stringify(P.termsInRange(ms("2026-01-01T00:00:00Z"), ms("2026-12-31T00:00:00Z")));
  for (let i = 0; i < 20; i++) assert.equal(JSON.stringify(P.termsInRange(ms("2026-01-01T00:00:00Z"), ms("2026-12-31T00:00:00Z"))), a);
});

test("[A] 제공자 객체는 동결되어 있다", () => {
  assert.throws(() => { (P as { locate: unknown }).locate = () => null; });
  assert.throws(() => { (P.info as { version: string }).version = "x"; });
});
