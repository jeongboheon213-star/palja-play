import type { TenGod, Stem } from '../../src/lib/saju/types';
import type { dailyReading } from '../../src/lib/daily/reading';
import {NARRATIVES,BLENDS,CONTACT_NARRATIVES} from './dailyNarratives';

// User-facing editorial copy only. Does not calculate or modify any score.
const THEMES:Record<TenGod,readonly [string,string,string]>={
  비견:['오늘은 내 페이스로 가보세요','주변의 속도보다 내 페이스가 또렷하게 느껴지는 날이에요. 남과 비교하기보다 하던 일 하나를 내 방식으로 마무리해보세요.','오늘 끝낼 일 하나 고르기'],
  겁재:['함께하되 내 몫도 챙기세요','함께하는 일 속에서 내 몫도 중요하게 느껴질 수 있어요. 부탁을 모두 받아주기보다 가능한 만큼만 이야기해보세요.','함께하는 일의 역할 확인하기'],
  식신:['작은 일 하나, 끝내는 맛을 느껴보세요','작은 일을 끝내는 즐거움이 하루에 힘을 더해줄 수 있어요. 거창한 계획보다 손에 잡히는 일부터 해보세요.','미뤄둔 작은 일 하나 끝내기'],
  상관:['생각만 하지 말고 말로 꺼내보세요','머릿속에 있던 생각을 밖으로 꺼내고 싶어지는 날이에요. 솔직하게 말하되 상대가 듣기 편한 표현으로 시작해보세요.','아이디어 하나를 한 문장으로 적기'],
  편재:['새로운 선택지, 조건부터 살펴보세요','평소보다 새로운 선택에 마음이 향할 수 있어요. 끌리는 점과 필요한 비용을 함께 생각하며 천천히 결정해보세요.','관심 있는 선택지의 비용 확인하기'],
  정재:['오늘은 새는 시간과 돈을 챙겨보세요','익숙한 일상에서 정리할 부분이 눈에 들어오기 쉬운 날이에요. 미뤄둔 일정이나 지출 하나부터 가볍게 정리해보세요.','오늘의 지출이나 일정 하나 정리하기'],
  편관:['부담되는 일은 쪼개서 해보세요','해야 할 일이 평소보다 크게 느껴질 수 있어요. 한 번에 풀려 하기보다 먼저 할 일과 도움받을 일을 나눠보세요.','부담되는 일을 두 단계로 나누기'],
  정관:['약속 하나만 정리해도 한결 가벼워요','이미 정해둔 약속과 맡은 일이 마음에 남는 날이에요. 가까운 약속부터 차분히 준비하는 편이 좋아요.','약속 하나와 준비물 확인하기'],
  편인:['막혔다면 다른 방법을 찾아보세요','익숙한 일에서도 다른 길이 눈에 들어올 수 있어요. 막힌 부분이 있다면 잠깐 멈춰 주변의 경험도 들어보세요.','막힌 일의 다른 방법 하나 찾아보기'],
  정인:['혼자 끙끙대지 말고 도움을 받아보세요','혼자 애쓸 때보다 도움을 받을 때 마음이 편해질 수 있어요. 모르는 일은 물어보고 지친다면 잠깐 쉬어가세요.','도움받을 일 하나 질문하기'],
};

// Resolve an editorial meaning first. Calculation results remain untouched.
const FAMILY:Record<TenGod,string>={비견:'self',겁재:'self',식신:'expression',상관:'expression',편재:'resource',정재:'resource',편관:'duty',정관:'duty',편인:'support',정인:'support'};
const POSITION={year:'연주',month:'월주',day:'일주',hour:'시주'} as const;
function tone(score:number){return score<60?0:score<65?1:score<70?2:score<75?3:4;}
type Reading=NonNullable<ReturnType<typeof dailyReading>>;
function blendFor(r:Reading){
  const families=new Set([FAMILY[r.stemRelation],FAMILY[r.branchRelation]]);
  if(families.has('expression')&&families.has('support'))return 'expressionSupport';
  if(families.has('expression')&&families.has('duty'))return 'expressionDuty';
  if(families.has('resource')&&families.has('support'))return 'resourceSupport';
  return null;
}
export function dailyCopy(r:Reading,dayMaster:Stem,options:{commonContactsOnly?:boolean}={}) {
  const [headline,,quest]=THEMES[r.stemRelation];
  const combines=r.contacts.filter(c=>c.kind.endsWith('합')).length;
  const clashes=r.contacts.filter(c=>c.kind.endsWith('충')).length;
  const labels=r.contacts.map(c=>POSITION[c.position]+' '+c.kind);
  const contactKind=combines&&clashes?'mixed':clashes?'clash':combines?'combine':null;
  // The largest need for a pause (or strongest existing emphasis for a combine) wins.
  // No pillar is assigned to a life event or domain.
  const focus=contactKind?r.areas.reduce((best,a,i)=>
    (contactKind==='combine'?a.score>r.areas[best]!.score:a.score<r.areas[best]!.score)?i:best,0):-1;
  const blend=blendFor(r);
  const areas=r.areas.map((a,i)=>{
    const actionRelation=a.weights[1]*2>a.weights[0]*4?r.branchRelation:r.stemRelation;
    const pace=tone(a.score);
    // Both relationships participate in meaning selection. Pace only changes emphasis.
    const secondary=actionRelation===r.stemRelation?r.branchRelation:r.stemRelation;
    const focusRelation=pace<=1?secondary:actionRelation;
    const narrative=blend?BLENDS[blend]![i]!:NARRATIVES[actionRelation][i]!;
    const body=blend&&pace===2?NARRATIVES[focusRelation][i]![1]:blend?narrative[1]:NARRATIVES[focusRelation][i]![1];
    // /today V2 presents contacts as a common adjustment, never as one area's cause.
    const contactFocus=!options.commonContactsOnly&&i===focus;
    const text=contactFocus?CONTACT_NARRATIVES[contactKind!]![i]!:body;
    const evidenceIds=['day-master:'+dayMaster,'stem:'+r.stemRelation,'branch:'+r.branchRelation,
      ...r.contacts.map(c=>'contact:'+c.position+':'+c.kind),'score:'+a.score,'action:'+actionRelation];
    return {...a,headline:narrative[0],text,evidenceIds,actionRelation,tone:pace,
      meaning:{primary:actionRelation,secondary,blend,focusRelation,contactKind,contactFocus}};
  });
  const overview=blend==='expressionSupport'
    ?'새로운 생각이 떠오르면서 익숙한 경험에서도 힌트를 얻기 쉬운 날이에요. 오래 고민하기보다 해볼 만한 일 하나를 가볍게 시작해보세요.'
    :blend==='expressionDuty'
    ?'새로운 시도를 하고 싶으면서도 맡은 일이 마음에 남을 수 있어요. 해야 할 일을 매듭지은 뒤 작은 변화를 더해보세요.'
    :blend==='resourceSupport'
    ?'낯선 선택보다 알아둔 정보와 경험에서 마음이 놓이는 날이에요. 준비해온 것을 믿고 지금 할 수 있는 일부터 이어가보세요.'
    :THEMES[areas[2]!.meaning.focusRelation][1];
  return {headline,overview,quest,
    evidence:{dayMaster,ganji:r.ganji,stemRelation:r.stemRelation,branchRelation:r.branchRelation,labels,combines,clashes,adjustment:r.adjustment},areas};
}
