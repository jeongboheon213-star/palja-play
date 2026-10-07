import type { SajuData } from '../saju/chart';
import { tenGodOf, mainHiddenStem } from '../saju/chart';
import { dayPillarForDate } from '../saju/pillars/dayPillar';
import type { TenGod } from '../saju/types';
import { findRelations } from '../saju/chart/relations';

// Product weights: emphasis of each relationship, not probability or natal tier cutoffs.
const WEIGHTS: Record<TenGod, readonly number[]> = {
  비견:[0,1,1,3,2], 겁재:[-2,1,1,2,0], 식신:[2,2,3,1,3], 상관:[1,0,3,-1,0],
  편재:[4,2,2,2,0], 정재:[4,1,3,1,2], 편관:[0,0,3,-1,-1], 정관:[1,2,4,2,1],
  편인:[0,1,1,0,2], 정인:[1,2,1,2,4],
};
const AREAS = [
  ['money','💰 재물운','소비와 자원 배분','계약이나 지출 전 조건과 예산을 한 번 더 확인하세요.'],
  ['love','❤️ 애정운','감정과 표현','상대 마음을 단정하지 말고 원하는 것을 짧게 이야기해 보세요.'],
  ['work','💼 직장·사업운','업무와 실행','할 일을 작은 단위로 나누고 우선순위 하나부터 실행하세요.'],
  ['people','🤝 인간관계운','협력과 소통','역할과 약속을 확인하고 서로의 말을 끝까지 들어보세요.'],
  ['condition','💪 컨디션운','휴식과 생활 리듬','잠깐 쉬고 평소의 수면·식사 리듬을 챙겨보세요. 건강 진단은 제공하지 않아요.'],
] as const;

// Editorial prompts based on the existing ten-god relationship, not predictions or scores.
const COPY: Readonly<Record<TenGod, readonly [string, string, string]>> = {
  비견: ['내 페이스 찾기', '남과 비교하기보다 내 기준을 돌아보는 테마예요.', '오늘 끝낼 일 하나를 내 기준으로 정해보기'],
  겁재: ['함께하되 경계 지키기', '협력과 나눔 속에서 내 몫과 상대의 몫을 살펴보는 테마예요.', '함께하는 일의 역할을 한 문장으로 확인하기'],
  식신: ['작은 완성의 즐거움', '꾸준한 표현과 일상의 만족을 돌아보는 테마예요.', '작은 작업 하나를 끝내고 잠깐 쉬기'],
  상관: ['생각을 표현하기', '새로운 표현과 익숙한 방식의 변화를 살펴보는 테마예요.', '새 아이디어 하나를 적고 상대가 이해할 말로 다듬기'],
  편재: ['가능성을 살펴보기', '자원과 새로운 선택지를 넓게 살펴보는 테마예요.', '관심 있는 선택지의 장점과 비용을 함께 적기'],
  정재: ['생활의 균형 잡기', '꾸준한 관리와 현실적인 자원 배분을 돌아보는 테마예요.', '오늘 쓸 시간이나 지출 계획 하나를 정리하기'],
  편관: ['부담을 나눠보기', '도전과 책임을 감당하는 방식을 살펴보는 테마예요.', '부담되는 일을 작은 단계로 나누고 도움 요청할 부분 찾기'],
  정관: ['약속을 정돈하기', '규칙과 약속, 맡은 역할을 돌아보는 테마예요.', '오늘의 약속 하나와 필요한 준비를 확인하기'],
  편인: ['다른 관점 만나기', '익숙한 문제를 다른 시선으로 바라보는 테마예요.', '궁금했던 주제를 찾아보고 내 생각과 다른 점 적기'],
  정인: ['배우고 돌보기', '배움과 지지, 회복을 돌아보는 테마예요.', '배운 것 하나를 기록하거나 고마운 사람에게 인사하기'],
};

/** Date is supplied by the UI in KST; no clock, RNG, birth-input storage or score mutation. */
export function dailyReading(saju: SajuData, date: string) {
  const day = dayPillarForDate(date);
  if (!day || !saju.dayMaster || saju.pillars.day.confidence !== 'confirmed') return null;
  const stemRelation = tenGodOf(saju.dayMaster.stem, day.stem);
  const branchRelation = tenGodOf(saju.dayMaster.stem, mainHiddenStem(day.branch));
  const [theme, line, mission] = COPY[stemRelation];
  const [background, backgroundLine] = COPY[branchRelation];
  const contacts = (['year','month','day','hour'] as const).flatMap(position => {
    const p=saju.pillars[position];
    if (!p || p.confidence!=='confirmed' || !p.pillar) return [];
    return findRelations([{position:'year',...p.pillar},{position:'day',...day}])
      .filter(r=>r.kind==='천간합'||r.kind==='지지육합'||r.kind==='천간충'||r.kind==='지지충')
      .map(r=>({position,kind:r.kind}));
  });
  const combines=contacts.filter(r=>r.kind.endsWith('합')).length;
  const clashes=contacts.filter(r=>r.kind.endsWith('충')).length;
  const adjustment=Math.max(-6,Math.min(6,combines*2-clashes*2));
  const areas=AREAS.map(([key,label,focus,action],i)=>{
    const score=Math.max(0,Math.min(100,60+WEIGHTS[stemRelation][i]!*4+WEIGHTS[branchRelation][i]!*2+adjustment));
    return {key,label,score,weights:[WEIGHTS[stemRelation][i]!,WEIGHTS[branchRelation][i]!] as const,text:`${focus}에서는 ‘${theme}’를 중심으로, ‘${background}’도 함께 살펴보는 날이에요. ${score>=75?'이 분야를 오늘의 작은 실천 주제로 삼아보세요.':score<60?'속도를 높이기보다 준비와 확인에 시간을 써보세요.':'평소의 리듬을 유지하며 한 가지씩 정리해 보세요.'} ${action}`};
  });
  const score=Math.round(areas.reduce((sum,a)=>sum+a.score,0)/areas.length);
  const tier=score>=80?'A':score>=70?'B':score>=60?'C':'D';
  return Object.freeze({ date, ganji: `${day.stem}${day.branch}`, stemRelation, branchRelation,
    theme, line, mission, background, backgroundLine, areas, score, tier, contacts, adjustment, version: 'daily-0.2.0',
    basis: '내 일간과 오늘 천간·지지 정기의 십성, 확정된 원국 기둥과 오늘의 합·충을 비교해요. 점수는 기본 60 + 천간 분야 가중치×4 + 지지 분야 가중치×2 + 합·충 보정(최대 ±6)이며 총점은 5개 분야 평균이에요. 오늘 TIER는 80 이상 A, 70 이상 B, 60 이상 C, 그 아래 D로 기존 팔자 TIER와 별개예요.',
    notice: '한국 시간 00시 기준입니다. 점수는 PLAY 관심·행동 지표이며 좋은 일이 생길 확률이나 건강 상태가 아니에요. 대운·용신을 반영한 종합 운세가 아니며, 실제 사건·금전·연애 결과를 예측하지 않아요. 계산·문구는 외부 전문가 검토 전인 Beta입니다.' });
}
