import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailySamples} from './tools/daily-copy-samples';

test('daily cards avoid calculation jargon, repeated openings/advice and fivefold contact warnings',()=>{
  for(const s of dailySamples()){
    const cards=s.copy.areas;
    const visible=s.copy.overview+' '+cards.map(a=>a.headline+' '+a.text).join(' ');
    assert(!/마찰·변화|조율해요|살피며|챙겨요|관계를 참고해|맞물리는 관계|연결과 마찰|상관|정인|편재|정관|일간|지지|합·충/.test(visible));
    assert(cards.filter(a=>a.meaning.contactFocus).length<=1);
    const openings=cards.map(a=>a.text.split('. ')[0]!.split(' ').slice(0,3).join(' '));
    const advice=cards.map(a=>a.text.split('. ').at(-1));
    assert.equal(new Set(openings).size,5,s.birthDate+' '+s.date+' openings');
    assert.equal(new Set(advice).size,5,s.birthDate+' '+s.date+' advice');
    assert((visible.match(/확인하세요/g)??[]).length<=1);
  }
});
