import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyCopy} from '../web/src/dailyCopy';
import {dailySamples,comparisonPairs,moneyText} from './tools/daily-copy-samples';

const samples=dailySamples();
const {A,B,C}=comparisonPairs(samples);
test('A: real different charts, same date and money score, different interpretation',()=>{
  assert.notEqual(A[0]!.birthDate,A[1]!.birthDate);
  assert.equal(A[0]!.date,A[1]!.date);
  assert.equal(A[0]!.r.areas[0]!.score,A[1]!.r.areas[0]!.score);
  assert.notEqual(moneyText(A[0]!),moneyText(A[1]!));
});
test('B: same chart, different dates and branch relation, same score, different text',()=>{
  assert.equal(B[0]!.birthDate,B[1]!.birthDate);
  assert.notEqual(B[0]!.date,B[1]!.date);
  assert.equal(B[0]!.r.stemRelation,B[1]!.r.stemRelation);
  assert.notEqual(B[0]!.r.branchRelation,B[1]!.r.branchRelation);
  assert.equal(B[0]!.r.areas[0]!.score,B[1]!.r.areas[0]!.score);
  assert.notEqual(moneyText(B[0]!),moneyText(B[1]!));
});
test('C: same relations and old score band, actual contact versus no contact differs',()=>{
  const [without,withContact]=C;
  assert.equal(without!.r.contacts.length,0);assert(withContact!.r.contacts.length>0);
  assert.equal(without!.r.stemRelation,withContact!.r.stemRelation);
  assert.equal(without!.r.branchRelation,withContact!.r.branchRelation);
  const band=(n:number)=>n<60?0:n<75?1:2;
  assert.equal(band(without!.r.areas[0]!.score),band(withContact!.r.areas[0]!.score));
  assert.notEqual(moneyText(without!),moneyText(withContact!));
});
test('D: deterministic copy preserves every engine score, tier and contact, with traceable evidence',()=>{
  for(const s of samples){
    const before=JSON.stringify(s.r);
    assert.deepEqual(dailyCopy(s.r,s.chart.dayMaster!.stem),s.copy);
    assert.equal(JSON.stringify(s.r),before);
    assert.deepEqual(s.copy.areas.map(a=>a.score),s.r.areas.map(a=>a.score));
    assert.equal(s.copy.evidence.labels.length,s.r.contacts.length);
    for(const a of s.copy.areas){
      assert(a.evidenceIds.includes('stem:'+s.r.stemRelation));
      assert(a.evidenceIds.includes('branch:'+s.r.branchRelation));
      assert(a.evidenceIds.includes('day-master:'+s.chart.dayMaster!.stem));
      for(const c of s.r.contacts)assert(a.evidenceIds.includes('contact:'+c.position+':'+c.kind));
      assert(!/반드시|사고|이별|자녀 문제|질병|수익 보장/.test(a.headline+a.text));
    }
    assert.equal(new Set(s.copy.areas.map(a=>a.headline)).size,5);
  }
});
test('score adjusts tone inside the old 60–74 band without replacing relationship meaning',()=>{
  const s=samples[0]!;
  const withScore=(score:number)=>dailyCopy({...s.r,areas:s.r.areas.map((a,i)=>i===0?{...a,score}:a)},s.chart.dayMaster!.stem).areas[0]!;
  assert.equal(withScore(64).headline,withScore(74).headline);
  assert.notEqual(withScore(64).text,withScore(74).text);
});
