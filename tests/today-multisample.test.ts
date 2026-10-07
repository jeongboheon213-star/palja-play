import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computeBetaResult} from '../src/lib/engine';
import {dailyReading} from '../src/lib/daily/reading';
import {dailyCopy} from '../web/src/dailyCopy';

test('today multisample: ten day masters, six birth years, four times and unknown time',()=>{
  const stems=new Set<string>();
  let charts=0,unknownCharts=0,readings=0;
  const examples=new Map<string,unknown>();
  for(const year of [1963,1978,1985,1990,2000,2014])for(let month=1;month<=12;month++)
  for(const birthTime of ['00:01','06:20','14:20','23:59',null])for(const gender of ['male','female'] as const){
    const birthDate=`${year}-${String(month).padStart(2,'0')}-15`;
    const result=computeBetaResult({birthDate,birthTime,gender,calendar:'solar',birthCountry:'KR'});
    assert(result.ok,`${birthDate} ${birthTime}`);assert(result.saju.dayMaster);
    const natal=JSON.stringify(result);charts++;
    if(birthTime===null){unknownCharts++;assert.equal(result.saju.pillars.hour,null);}
    for(const date of ['2026-10-06','2026-10-07','2026-11-01']){
      const r=dailyReading(result.saju,date);assert(r);readings++;
      assert.equal(r.areas.length,5);
      assert(r.areas.every(a=>Number.isInteger(a.score)&&a.score>=0&&a.score<=100));
      assert.equal(r.score,Math.round(r.areas.reduce((sum,a)=>sum+a.score,0)/5));
      assert.equal(r.tier,r.score>=80?'A':r.score>=70?'B':r.score>=60?'C':'D');
      assert.deepEqual(r,dailyReading(result.saju,date));
      const copy=dailyCopy(r,result.saju.dayMaster.stem);
      assert.deepEqual(copy,dailyCopy(r,result.saju.dayMaster.stem));
      assert(copy.overview&&copy.quest&&copy.areas.length===5);
      for(const a of copy.areas){
        assert(a.headline&&a.text);
        assert(a.evidenceIds.includes('day-master:'+result.saju.dayMaster.stem));
        assert(a.evidenceIds.includes('stem:'+r.stemRelation));
        assert(a.evidenceIds.includes('branch:'+r.branchRelation));
        assert(a.evidenceIds.includes('score:'+a.score));
      }
      for(const contact of r.contacts){
        assert.equal(result.saju.pillars[contact.position]?.confidence,'confirmed');
        assert(copy.areas.every(a=>a.evidenceIds.includes('contact:'+contact.position+':'+contact.kind)));
      }
      if(birthTime===null)assert(!r.contacts.some(c=>c.position==='hour'));
      stems.add(result.saju.dayMaster.stem);
      if(!examples.has(result.saju.dayMaster.stem))examples.set(result.saju.dayMaster.stem,{birthDate,birthTime,gender,date,score:r.score,tier:r.tier,areas:r.areas.map(a=>a.score),money:copy.areas[0]!.text});
    }
    assert.equal(JSON.stringify(result),natal,'daily reading must not mutate natal/free/premium');
  }
  assert.equal(stems.size,10);assert.equal(charts,720);assert.equal(unknownCharts,144);assert.equal(readings,2160);
  console.log('TODAY_MULTISAMPLE_RESULT '+JSON.stringify({charts,unknownCharts,readings,stems:[...stems],errors:0,deterministicMismatch:0,evidenceMismatch:0,examples:Object.fromEntries(examples)}));
});
