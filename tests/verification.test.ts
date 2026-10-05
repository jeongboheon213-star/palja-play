import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VERIFICATION_STATUS,
  hasExternalVerification,
  canClaimVerified,
  type VerificationItemId,
} from "../src/lib/saju/verification";

const ids = Object.keys(VERIFICATION_STATUS) as VerificationItemId[];

test("외부 검증/전문가 검토 완료 항목은 없다 (과장 금지)", () => {
  assert.equal(hasExternalVerification(), false);
  for (const id of ids) assert.equal(canClaimVerified(id), false, id);
});

test("내부 일치 확인된 것은 일주 하나뿐", () => {
  const internal = ids.filter((i) => VERIFICATION_STATUS[i].level === "verified-internally");
  assert.deepEqual(internal, ["dayPillar"]);
});

test("절입·월주·연주·시주·정책·12운성은 not-verified", () => {
  for (const id of ["monthPillarSolarTerm", "yearPillar", "hourPillar", "historicalTimeOffsets", "longitudeCorrection", "jasiPolicy", "twelveStages"] as const) {
    assert.equal(VERIFICATION_STATUS[id].level, "not-verified", id);
  }
});

test("모든 항목에 설명이 있고, 상태표는 동결되어 있다", () => {
  for (const id of ids) assert.ok(VERIFICATION_STATUS[id].note.length > 0);
  assert.throws(() => { (VERIFICATION_STATUS.dayPillar as { level: string }).level = "expert-reviewed"; });
});
