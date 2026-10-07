import {mkdirSync,writeFileSync} from 'node:fs';
import {computeSaju} from '../src/lib/engine';
import {dailyReading} from '../src/lib/daily/reading';
import {dailyCopy} from '../web/src/dailyCopy';
import {dailySamples,comparisonPairs,moneyText,type DailySample} from '../tests/tools/daily-copy-samples';

const samples=dailySamples();
const pick=(s:DailySample)=>({birthDate:s.birthDate,birthTime:'14:20',date:s.date,
  chart:Object.fromEntries(Object.entries(s.chart.pillars).map(([k,v])=>[k,v?.pillar??null])),
  dayMaster:s.chart.dayMaster!.stem,ganji:s.r.ganji,stem:s.r.stemRelation,branch:s.r.branchRelation,
  contacts:s.r.contacts,adjustment:s.r.adjustment,score:s.r.areas[0]!.score,weights:s.r.areas[0]!.weights,
  money:moneyText(s),evidence:s.copy.areas[0]!.evidenceIds});
const counts=[0,1,2,3,4].map(i=>({area:samples[0]!.r.areas[i]!.key,
  old:new Set(samples.map(s=>s.r.stemRelation+':'+(s.r.areas[i]!.score<60?0:s.r.areas[i]!.score<75?1:2))).size,
  new:new Set(samples.map(s=>s.copy.areas[i]!.headline+' '+s.copy.areas[i]!.text)).size}));
const chart=computeSaju({birthDate:'1990-05-15',birthTime:'14:20',gender:'male',calendar:'solar',birthCountry:'KR'});
if(!chart.ok)throw Error('baseline invalid');
const r=dailyReading(chart.data,'2026-10-06')!;
const report={samples:samples.length,counts,
  baseline:pick({birthDate:'1990-05-15',date:r.date,chart:chart.data,r,copy:dailyCopy(r,chart.data.dayMaster!.stem)}),
  pairs:Object.fromEntries(Object.entries(comparisonPairs(samples)).map(([k,v])=>[k,v.map(pick)]))};
mkdirSync('e2e-artifacts/today-personalized',{recursive:true});
writeFileSync('e2e-artifacts/today-personalized/comparisons.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
