import {computeSaju} from '../../src/lib/engine';
import {dailyReading} from '../../src/lib/daily/reading';
import {dailyCopy} from '../../web/src/dailyCopy';

// Real engine outputs, fixed dates, no random or substituted pillars.
export function dailySamples(){
  const out=[];
  for(let year=1970;year<=1999;year++) for(const month of ['01','04','07','10']){
    const birthDate=`${year}-${month}-15`;
    const chart=computeSaju({birthDate,birthTime:'14:20',gender:'male',calendar:'solar',birthCountry:'KR'});
    if(!chart.ok||!chart.data.dayMaster)throw Error('fixture invalid');
    for(const monthDay of ['10','11'])for(let d=1;d<=30;d++){
      const date=`2026-${monthDay}-${String(d).padStart(2,'0')}`;
      const r=dailyReading(chart.data,date)!;
      const copy=dailyCopy(r,chart.data.dayMaster.stem);
      out.push({birthDate,date,chart:chart.data,r,copy});
    }
  }
  return out;
}
export type DailySample=ReturnType<typeof dailySamples>[number];
export const moneyText=(s:DailySample)=>s.copy.areas[0]!.headline+' '+s.copy.areas[0]!.text;
export function comparisonPairs(samples:DailySample[]){
  const a=new Map<string,DailySample>(),b=new Map<string,DailySample>(),c=new Map<string,DailySample>();
  let A:DailySample[]|undefined,B:DailySample[]|undefined,C:DailySample[]|undefined;
  for(const s of samples){
    const score=s.r.areas[0]!.score;
    const ak=s.date+':'+score;
    const ap=a.get(ak);
    if(!A&&ap&&ap.birthDate!==s.birthDate&&moneyText(ap)!==moneyText(s))A=[ap,s];
    a.set(ak,s);
    const bk=s.birthDate+':'+score+':'+s.r.stemRelation;
    const bp=b.get(bk);
    if(!B&&bp&&bp.date!==s.date&&bp.r.branchRelation!==s.r.branchRelation&&moneyText(bp)!==moneyText(s))B=[bp,s];
    b.set(bk,s);
    const ck=s.date+':'+s.r.stemRelation+':'+s.r.branchRelation+':'+(score<60?0:score<75?1:2);
    const cp=c.get(ck);
    if(!C&&cp&&Boolean(cp.r.contacts.length)!==Boolean(s.r.contacts.length)&&moneyText(cp)!==moneyText(s))C=cp.r.contacts.length?[s,cp]:[cp,s];
    // Prefer retaining a no-contact example to isolate contact presence.
    if(!cp||!s.r.contacts.length)c.set(ck,s);
  }
  if(!A||!B||!C)throw Error('real comparison pair missing');
  return {A,B,C};
}
