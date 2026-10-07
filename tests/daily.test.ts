import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSaju } from '../src/lib/engine';
import { dailyReading } from '../src/lib/daily/reading';

const result = computeSaju({birthDate:'1990-05-15', birthTime:'14:20', gender:'male', calendar:'solar', birthCountry:'KR'});
if (!result.ok) throw Error('fixture failed');
const saju = result.data;
test('daily: repeatable, date-dependent and does not change natal data', () => {
  const before=JSON.stringify(saju);
  const today=dailyReading(saju,'2026-10-06')!;
  assert.deepEqual(today,dailyReading(saju,'2026-10-06'));
  assert.notEqual(today.ganji,dailyReading(saju,'2026-10-07')!.ganji);
  assert.equal(JSON.stringify(saju),before);
  assert(!/1990|birthDate|birthTime|gender/.test(JSON.stringify(today)));
});
test('daily: invalid dates and uncertain natal day never produce a reading', () => {
  assert.equal(dailyReading(saju,'2026-02-30'),null);
  assert.equal(dailyReading({...saju,dayMaster:null},'2026-10-06'),null);
  assert.equal(dailyReading({...saju,pillars:{...saju.pillars,day:{...saju.pillars.day,confidence:'uncertain'}}},'2026-10-06'),null);
});
test('daily: known calendar anchor and all ten relations have editorial content', () => {
  assert.equal(dailyReading(saju,'2000-01-07')!.ganji,'갑자');
  const relations=new Set<string>();
  for(let d=1;d<=20;d++) {
    const r=dailyReading(saju,`2026-10-${String(d).padStart(2,'0')}`)!;
    relations.add(r.stemRelation);assert(r.theme && r.mission && r.basis && r.notice);
  }
  assert.equal(relations.size,10);
});
test('daily: scores have bounded rule evidence and natal pillars influence the reading',()=>{
  const r=dailyReading(saju,'2026-10-06')!;
  assert.equal(r.areas.length,5);assert(r.areas.every(a=>a.score>=0&&a.score<=100));
  assert.equal(r.score,Math.round(r.areas.reduce((s,a)=>s+a.score,0)/5));
  const changed={...saju,pillars:{...saju.pillars,year:{...saju.pillars.year,pillar:{stem:'무' as const,branch:'자' as const}}}};
  assert.notDeepEqual(dailyReading(changed,'2026-10-06')!.contacts,r.contacts);
  const missing=dailyReading({...saju,pillars:{...saju.pillars,hour:null}},'2026-10-06')!;
  assert(!missing.contacts.some(x=>x.position==='hour'));
});
