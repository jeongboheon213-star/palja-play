// [C] External comparison tests: 외부 기준(KASI·검증된 만세력 등)과의 대조.
// 기준 데이터가 없으면 NOT RUN 이다. A/B 통과는 C 통과를 뜻하지 않는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAlphaSolarTermProvider } from "../src/lib/saju/alphaSolarTermProvider";
import { ALPHA_POLICY } from "../src/lib/saju/policies";
import { epochMsFromIsoUtc, isoUtcFromEpochMs } from "../src/lib/saju/civil";
import { compareAgainstReferences, type SolarTermReferenceCase } from "./solarTermReference";

const P = createAlphaSolarTermProvider({ boundaryWarning: ALPHA_POLICY.solarTerm.boundaryWarning });
const fixture = JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/solar-term-reference.json`, "utf8")) as { cases: SolarTermReferenceCase[] };

test("[C] 외부 기준 대조 (KASI/검증된 만세력)", () => {
  const res = compareAgainstReferences(P, fixture.cases);
  console.log(`[C] External comparison status: ${res.status} (reference cases: ${fixture.cases.length})`);
  if (fixture.cases.length === 0) {
    assert.equal(res.status, "NOT RUN");
    return;
  }
  // 기준 데이터가 들어오면 이 테스트가 실제 비교 결과를 강제한다.
  assert.equal(res.status, "PASS", JSON.stringify(res.outcomes.filter((o) => !o.pass)));
});

test("[C] harness 자체 점검 (합성 사례, 기준 데이터가 아니다)", () => {
  const r = P.locate(epochMsFromIsoUtc("2026-02-04T00:00:00Z") as number);
  assert.ok(r.ok);
  if (!r.ok) return;
  const t = r.value.currentTerm;
  const mk = (offsetSec: number, tol: number): SolarTermReferenceCase => ({
    source: "SYNTHETIC-HARNESS-TEST (NOT A REFERENCE)",
    term: t.termId,
    expectedUtc: isoUtcFromEpochMs(t.epochMs + offsetSec * 1000).replace(/\.\d{3}Z$/, "Z"),
    toleranceSeconds: tol,
  });
  assert.equal(compareAgainstReferences(P, []).status, "NOT RUN");
  assert.equal(compareAgainstReferences(P, [mk(0, 1)]).status, "PASS");
  assert.equal(compareAgainstReferences(P, [mk(30, 1)]).status, "FAIL");
  assert.equal(compareAgainstReferences(P, [mk(30, 60)]).status, "PASS");
  assert.equal(compareAgainstReferences(P, [{ ...mk(0, 1), term: "nope" }]).status, "FAIL");
});
