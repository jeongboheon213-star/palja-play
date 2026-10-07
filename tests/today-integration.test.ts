import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeSaju} from '../src/lib/engine';
import {dailyReading} from '../src/lib/daily/reading';
import {dailyCopy} from '../web/src/dailyCopy';

const input={birthDate:'1990-05-15',birthTime:'14:20',gender:'male',calendar:'solar',birthCountry:'KR'} as const;
test('today integration: approved score and six narratives are preserved',()=>{
  const chart=computeSaju(input);assert(chart.ok);
  const r=dailyReading(chart.data,'2026-10-06')!;
  assert.equal(r.score,64);assert.equal(r.tier,'C');
  assert.deepEqual(r.areas.map(a=>a.score),[64,62,72,58,66]);
  const copy=dailyCopy(r,chart.data.dayMaster!.stem);
  assert.deepEqual([copy.overview,...copy.areas.map(a=>a.text)],[
    '새로운 생각이 떠오르면서 익숙한 경험에서도 힌트를 얻기 쉬운 날이에요. 오래 고민하기보다 해볼 만한 일 하나를 가볍게 시작해보세요.',
    '눈길 가는 물건이 있어도 꼭 필요한지 함께 생각하게 되는 날이에요. 계획에 없던 구매라면 마음이 가라앉은 뒤 다시 골라보세요.',
    '마음을 솔직하게 전하면서 상대의 생각도 알고 싶어질 수 있어요. 혼자 짐작했던 부분은 가볍게 물어보세요.',
    '그동안 익혀온 것에서 새로운 아이디어가 떠오를 수 있어요. 익숙한 일에 내 생각을 조금 더해보는 편이 좋아요.',
    '내 의도와 다르게 말이 전해질 수 있는 날이에요. 바로 답하기보다 상대가 어떻게 받아들였는지 들어보세요.',
    '계속 일을 붙잡기보다 쉬어가고 싶은 마음이 드는 날이에요. 잠깐 숨을 돌린 뒤 남은 일을 이어가는 편이 좋아요.',
  ]);
});
test('today integration: existing KST conversion covers 00:01/23:59 and day rollover',()=>{
  const runtime=readFileSync(new URL('../web/src/runtime.ts',import.meta.url),'utf8');
  assert(runtime.includes('new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)'));
  const date=(utc:string)=>new Date(Date.parse(utc)+9*3_600_000).toISOString().slice(0,10);
  assert.equal(date('2026-10-05T15:01:00Z'),'2026-10-06');
  assert.equal(date('2026-10-06T14:59:00Z'),'2026-10-06');
  assert.equal(date('2026-10-06T15:00:00Z'),'2026-10-07');
  const chart=computeSaju(input);assert(chart.ok);
  assert.notEqual(dailyReading(chart.data,date('2026-10-06T14:59:00Z'))!.ganji,dailyReading(chart.data,date('2026-10-06T15:00:00Z'))!.ganji);
});
test('today integration: unknown birth time never adds hour contacts',()=>{
  const chart=computeSaju({...input,birthTime:null});assert(chart.ok);
  assert.equal(chart.data.pillars.hour,null);
  const r=dailyReading(chart.data,'2026-10-06')!;
  assert(!r.contacts.some(c=>c.position==='hour'));
  assert.deepEqual(r,dailyReading(chart.data,'2026-10-06'));
});
