import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computeSaju} from '../src/lib/engine';
import {dailyReading} from '../src/lib/daily/reading';
import {dailyCopy} from '../web/src/dailyCopy';
test('daily UI copy covers every relation, preserves calculation, and supplies useful short cards',()=>{
  const chart=computeSaju({birthDate:'1990-05-15',birthTime:'14:20',gender:'female',calendar:'solar',birthCountry:'KR'});
  assert(chart.ok);if(!chart.ok)return;
  const seen=new Set<string>();
  for(let d=1;d<=20;d++){
    const r:NonNullable<ReturnType<typeof dailyReading>>=dailyReading(chart.data,`2026-10-${String(d).padStart(2,'0')}`)!;
    const original:string=JSON.stringify(r);const copy=dailyCopy(r,chart.data.dayMaster!.stem);seen.add(r.stemRelation);
    assert.equal(JSON.stringify(r),original);assert.equal(copy.areas.length,5);
    assert(copy.headline&&copy.overview.split('. ').length>=2&&copy.quest);
    assert(copy.areas.every((a,i)=>a.score===r.areas[i]!.score&&a.headline.length>10&&a.text.length>35&&a.text.length<=110&&a.text.split('. ').length===2));
    assert.deepEqual(copy,dailyCopy(r,chart.data.dayMaster!.stem));
    assert(!/PLAY 지표|기운|십성|배움과 지지|소비자 정보 비판|테마예요/.test(copy.overview+copy.areas.map(a=>a.headline+a.text).join('')));
  }
  assert.equal(seen.size,10);
});
