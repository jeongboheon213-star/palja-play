import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tierFor, tiersForScores, TIER_BANDS, TIER_REFERENCE_VERSION, TIER_VERSION } from "../src/lib/tier";
import { REFERENCE_HISTOGRAMS, REFERENCE_SAMPLE_SIZE } from "../src/lib/tier/reference";
import { computeBetaResult } from "../src/lib/engine";
import { battleCardFrom, compareBattle } from "../src/lib/battle/battle";
import { createBattleShare, battleFromLocation } from "../src/lib/battle/share";
test("reference matches actual analysis and conservatively includes all ties", () => {
  const report = JSON.parse(readFileSync("docs/tier-distribution.json", "utf8").replace(/^\uFEFF/, ""));
  assert.equal(report.accepted, REFERENCE_SAMPLE_SIZE);
  for (const field of Object.keys(REFERENCE_HISTOGRAMS) as (keyof typeof REFERENCE_HISTOGRAMS)[]) {
    const histogram = REFERENCE_HISTOGRAMS[field];
    assert.deepEqual(histogram, report.report[field].histogram);
    assert.equal(histogram.reduce((a: number, b: number) => a + b, 0), REFERENCE_SAMPLE_SIZE);
    assert.equal(report.methodology.stepDays, 1);
    assert.equal(report.methodology.times.length, 12);
    let previous = 100;
    for (let score = 0; score <= 100; score++) {
      const actual = tierFor(score, field);
      const top = histogram.slice(score).reduce((a: number, b: number) => a + b, 0) * 100 / REFERENCE_SAMPLE_SIZE;
      assert.equal(actual.topPercent, Math.ceil(top * 10) / 10);
      assert.equal(actual.tier, TIER_BANDS.find((b) => top <= b.maxTopPercent)!.tier);
      assert.ok(actual.topPercent <= previous);
      assert.ok(!/대한민국|한국인|실제 인구/.test(actual.label));
      previous = actual.topPercent;
    }
  }
});
test("tier deterministic, versioned, and validates malformed scores", () => {
  const scores = [80, 65, 79, 75, 86, 67, 68];
  assert.deepEqual(tiersForScores(scores), tiersForScores(scores));
  assert.equal(tiersForScores(scores).total.referenceVersion, TIER_REFERENCE_VERSION);
  assert.equal(tiersForScores(scores).total.tierVersion, TIER_VERSION);
  assert.equal(tiersForScores(scores).total.score, Math.round(scores.reduce((a, b) => a + b) / 7));
  for (const v of [-1, 101, 1.5, NaN]) assert.throws(() => tierFor(v));
  assert.throws(() => tiersForScores([50]));
});
test("engine score and battle remain unchanged through tier display and share roundtrip", () => {
  const r = computeBetaResult({ birthDate: "1990-05-15", birthTime: "14:20", gender: "female", calendar: "solar", birthCountry: "KR" });
  assert.ok(r.ok); if (!r.ok) return;
  const me = battleCardFrom(r.free, null);
  const friend = { ...me, scores: [35, 85, 34, 80, 91, 35, 87] };
  const before = compareBattle(me, friend);
  tiersForScores(me.scores); tiersForScores(friend.scores);
  assert.deepEqual(compareBattle(me, friend), before);
  const share = createBattleShare(me, "https://example.com");
  const url = new URL(share.url);
  const decoded = battleFromLocation(url.search, url.hash);
  assert.equal(decoded.kind, "valid");
  if (decoded.kind === "valid") assert.deepEqual(tiersForScores(decoded.card.scores), tiersForScores(me.scores));
});
