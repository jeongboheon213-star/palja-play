import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tiersForScores } from '../src/lib/tier';
import { resultCardModel, resultCardUrl, isResultCardVisit } from '../src/lib/share/resultCard';

test('result card preserves existing tiers, percentiles and scores across diverse results without mutation', () => {
  for (const scores of [[0,0,0,0,0,0,0], [100,100,100,100,100,100,100], [91,22,88,40,57,63,30], [50,50,50,50,50,50,50]]) {
    const existing = tiersForScores(scores); const before = JSON.stringify(existing);
    const card = resultCardModel(existing);
    assert.equal(card.tier, existing.total.tier); assert.equal(card.topPercent, existing.total.topPercent); assert.equal(card.percentile, existing.total.percentile);
    for (const stat of card.stats) { const source = existing.stats.find(s => s.stat === stat.key)!; assert.equal(stat.tier, source.tier); assert.equal(stat.score, source.score); assert.equal(stat.topPercent, source.topPercent); }
    assert.equal(JSON.stringify(existing), before); assert.deepEqual(resultCardModel(existing), card);
    assert.match(card.rankLabel, /^PLAY 기준 상위 /); assert(!/대한민국|한국인|전 국민/.test(JSON.stringify(card)));
  }
});
test('share card whitelist excludes private data even if supplied by the caller', () => {
  const source = { ...tiersForScores([90,20,70,50,60,80,40]), birthDate:'1990-05-15', rawInput:{gender:'male'}, purchaseCode:'private' };
  const json = JSON.stringify(resultCardModel(source));
  assert(!/birthDate|rawInput|gender|purchaseCode|1990-05-15|private/.test(json));
});
test('result link has only fixed anonymous attribution; incoming attribution recognizes only exact allowed values', () => {
  const url = new URL(resultCardUrl()); assert.equal(url.origin, 'https://www.paljaplay.com'); assert.equal(url.pathname, '/');
  assert.deepEqual([...url.searchParams.keys()], ['utm_source','utm_medium']); assert.equal(url.hash, '');
  assert(isResultCardVisit(url.search)); assert(!isResultCardVisit('?utm_source=share&utm_medium=payment')); assert(!isResultCardVisit(''));
});
