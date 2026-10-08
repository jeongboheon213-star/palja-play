// 오늘운세 V2: "왜 이런 결과인가" 설명 계층.
//
// dailyReading()이 이미 계산한 값(오늘 천간·지지 정기의 십성, 확정된 원국 기둥과 오늘의 천간합·지지육합·천간충·지지충,
// 분야별 가중치와 보정)만 사용한다. 새로운 명리 요소(용신·격국·신강약·12운성·대운·형·파·해 등)를 추가하지 않는다.
// 점수·TIER·기존 문구(dailyCopy)를 바꾸지 않으며, 같은 명식·같은 날짜는 항상 같은 설명을 만든다.
//
// 화면 원칙 (V2 UX 보정):
//  - 기본 화면은 쉽게: 십신 칩 + 합/충 개수 칩 + 십신 한 줄 설명. 분야 카드는 "십신이 이 분야 점수를 어떻게 움직였나" 한 문장 + PLAY.
//  - 상세(접힘)는 정확하게: 오늘 천간/지지 → 십신, 기둥별 합·충, 비교 제외 이유, 분야별 점수 계산표.
//  - 합·충 보정은 엔진에서 5개 분야에 똑같이 더해진다. 따라서 합·충을 특정 분야의 원인으로 설명하지 않는다
//    (분야 카드의 기본 문장·PLAY 에는 합·충을 쓰지 않고, 계산표의 한 줄로만 보여 준다).

import type { SajuData } from '../saju/chart';
import type { PillarPosition, TenGod } from '../saju/types';
import { dayPillarForDate } from '../saju/pillars/dayPillar';
import { mainHiddenStem } from '../saju/chart';
import type { dailyReading } from './reading';

type Reading = NonNullable<ReturnType<typeof dailyReading>>;
type AreaKey = 'money' | 'love' | 'work' | 'people' | 'condition';
const AREA_KEYS: readonly AreaKey[] = ['money', 'love', 'work', 'people', 'condition'];
const AREA_NAME: Readonly<Record<AreaKey, string>> = { money: '재물운', love: '애정운', work: '직장·사업운', people: '인간관계운', condition: '컨디션' };

export const EXPLAIN_VERSION = 'daily-explain-0.2.0';

/** 십신 한 줄 뜻 (사주 초보용). 정의 대신 "무엇과 연결해서 볼 수 있는지"를 쉬운 말로. 좋고 나쁨을 단정하지 않는다. */
export const TEN_GOD_PLAIN: Readonly<Record<TenGod, string>> = {
  비견: '비견은 내 기준과 내 페이스를 지키는 흐름과 연결해서 볼 수 있어요.',
  겁재: '겁재는 함께하면서도 내 몫을 챙기게 되는 흐름과 연결해서 볼 수 있어요.',
  식신: '식신은 꾸준히 하고 즐기는 일, 작은 완성의 흐름과 연결해서 볼 수 있어요.',
  상관: '상관은 생각을 말이나 새로운 방식으로 드러내는 흐름과 연결해서 볼 수 있어요.',
  편재: '편재는 새로운 돈·기회·사람 같은 바깥 선택지에 관심이 가는 흐름과 연결해서 볼 수 있어요.',
  정재: '정재는 안정적인 돈 관리, 현실적인 선택처럼 꾸준히 챙기는 흐름과 연결해서 볼 수 있어요.',
  편관: '편관은 갑자기 맡는 일이나 부담을 감당하는 흐름과 연결해서 볼 수 있어요.',
  정관: '정관은 약속·규칙·맡은 역할을 챙기는 흐름과 연결해서 볼 수 있어요.',
  편인: '편인은 익숙한 일을 다른 관점에서 다시 보는 흐름과 연결해서 볼 수 있어요.',
  정인: '정인은 배우고, 도움받고, 쉬며 채우는 흐름과 연결해서 볼 수 있어요.',
};

/** 합·충 기본 화면 한 줄 (분야와 연결하지 않는다) */
export const CONTACT_PLAIN = {
  combine: '합은 오늘 기운과 내 원래 사주가 자연스럽게 맞물리는 부분이 있다는 뜻이에요.',
  clash: '충은 오늘 기운과 내 원래 사주가 부딪히는 부분이 있어 변화나 엇갈림이 나타날 수 있다는 뜻이에요. 나쁜 일을 뜻하지는 않아요.',
  none: '오늘은 내 사주 기둥과 합·충을 이루는 관계가 없어요.',
} as const;

/** 점수 기여 크기 → 표현. 엔진이 준 가중치(r.areas[].weights)만으로 정한다. */
export function effectPhrase(weight: number): string {
  if (weight >= 3) return '크게 올렸어요';
  if (weight === 2) return '올렸어요';
  if (weight === 1) return '조금 올렸어요';
  if (weight === 0) return '움직이지 않았어요';
  if (weight === -1) return '조금 낮췄어요';
  return '낮췄어요';
}

/**
 * 십신 × 분야 의미 (점수 상세 "왜 N점인가요?" 안에서 보여 준다). 가능성 표현만, 사건 예언 없음.
 * 점수를 올렸는지/낮췄는지는 effectPhrase 가 가중치로 정하므로 여기에는 쓰지 않는다.
 */
export const AREA_MEANING: Readonly<Record<TenGod, readonly [string, string, string, string, string]>> = {
  비견: [
    '돈 문제에서 남보다 내 기준이 앞서기 쉬운 흐름이에요.',
    '내 마음을 지키며 다가가려는 흐름이에요.',
    '내 방식대로 밀고 나가려는 흐름이에요.',
    '비슷한 사람들과 어울리기 쉬운 흐름이에요.',
    '내 리듬을 지키려는 흐름이에요.',
  ],
  겁재: [
    '함께 쓰거나 나누는 돈이 생기기 쉬운 흐름이에요.',
    '가까워지고 싶은 마음과 내 공간이 함께 필요해지기 쉬운 흐름이에요.',
    '여럿이 하는 일에서 내 몫을 챙기려는 흐름이에요.',
    '어울리는 자리가 늘기 쉬운 흐름이에요.',
    '사람들 사이에서 에너지를 쓰기 쉬운 흐름이에요.',
  ],
  식신: [
    '작은 즐거움을 누리는 여유와 연결되는 흐름이에요.',
    '편안하게 마음을 표현하기 쉬운 흐름이에요.',
    '손에 잡히는 일을 꾸준히 해내기 쉬운 흐름이에요.',
    '부드러운 분위기를 만들기 쉬운 흐름이에요.',
    '먹고 쉬는 일상의 즐거움과 연결되는 흐름이에요.',
  ],
  상관: [
    '새로운 아이디어로 돈을 바라보기 쉬운 흐름이에요.',
    '솔직한 표현이 앞서기 쉬운 흐름이에요.',
    '생각을 드러내고 방식을 바꿔 보기 쉬운 흐름이에요.',
    '말이 앞서 오해가 생기기 쉬운 흐름이에요.',
    '생각이 많아지기 쉬운 흐름이에요.',
  ],
  편재: [
    '새로운 돈·기회에 눈이 가기 쉬운 흐름이에요.',
    '새로운 만남이나 활동에 관심이 향하기 쉬운 흐름이에요.',
    '바깥 기회를 넓게 살피기 쉬운 흐름이에요.',
    '사람과 기회를 연결하기 쉬운 흐름이에요.',
    '바깥일에 신경이 쏠리기 쉬운 흐름이에요.',
  ],
  정재: [
    '이미 쓰고 있는 돈, 고정지출, 예산처럼 안정적인 돈의 흐름을 살피는 쪽에 관심이 가기 쉬워요.',
    '안정적인 관계를 챙기려는 흐름이에요.',
    '정해진 일을 차근차근 처리하기 쉬운 흐름이에요.',
    '약속을 지키는 성실함이 드러나기 쉬운 흐름이에요.',
    '생활 리듬을 정돈하기 쉬운 흐름이에요.',
  ],
  편관: [
    '돈보다 해야 할 일에 신경이 쏠리기 쉬운 흐름이에요.',
    '마음의 여유가 줄기 쉬운 흐름이에요.',
    '도전과 책임을 감당하려는 흐름이에요.',
    '부담이 말투에 묻어나기 쉬운 흐름이에요.',
    '긴장이 쌓이기 쉬운 흐름이에요.',
  ],
  정관: [
    '정해진 규칙 안에서 돈을 다루려는 흐름이에요.',
    '서로의 약속을 소중히 여기는 흐름이에요.',
    '맡은 역할과 책임을 챙기기 쉬운 흐름이에요.',
    '예의와 신뢰를 지키려는 흐름이에요.',
    '규칙적인 생활을 챙기려는 흐름이에요.',
  ],
  편인: [
    '돈보다 생각과 관심사에 마음이 가기 쉬운 흐름이에요.',
    '혼자만의 생각이 많아지기 쉬운 흐름이에요.',
    '다른 관점으로 일을 보기 쉬운 흐름이에요.',
    '내 생각에 집중하기 쉬운 흐름이에요.',
    '혼자 쉬며 생각을 정리하기 쉬운 흐름이에요.',
  ],
  정인: [
    '알아보고 배우는 쪽으로 돈을 다루기 쉬운 흐름이에요.',
    '돌봄과 배려를 주고받기 쉬운 흐름이에요.',
    '배운 것을 일에 쓰기 쉬운 흐름이에요.',
    '도움을 주고받기 쉬운 흐름이에요.',
    '쉬고 회복하는 쪽으로 마음이 가기 쉬운 흐름이에요.',
  ],
};

/** 분야별 오늘의 PLAY 행동 (십신 × 분야). 단정·의료·투자·법률 조언 없음, 지출을 부추기지 않음. */
export const AREA_ACTION: Readonly<Record<TenGod, readonly [string, string, string, string, string]>> = {
  비견: ['남 따라 사는 물건 대신 내게 필요한 것 하나만 고르기', '참아 둔 마음 한 가지를 부드럽게 말해 보기', '내 방식으로 끝낼 일 하나 정하기', '생각이 다른 사람의 이유를 한 번 물어보기', '오늘 잠드는 시간을 평소대로 지키기'],
  겁재: ['함께 쓰는 돈은 먼저 금액부터 정하기', '함께하는 시간과 혼자만의 시간을 하나씩 정하기', '함께하는 일에서 내 역할을 한 문장으로 적기', '버거운 부탁 하나는 가능한 만큼만 답하기', '약속 사이에 30분 쉬는 시간 남겨 두기'],
  식신: ['작은 즐거움은 정해 둔 금액 안에서 누리기', '함께 먹거나 걷는 편안한 약속 제안하기', '미뤄 둔 작은 일 하나 끝내기', '고마운 사람에게 가벼운 인사 건네기', '좋아하는 음식으로 한 끼 챙겨 먹기'],
  상관: ['돈 버는 새 아이디어 하나를 메모해 두기', '솔직한 말은 상대가 듣기 편한 말로 한 번 다듬기', '바꾸고 싶은 업무 방식 하나를 제안해 보기', '말하기 전에 상대 이야기를 끝까지 듣기', '생각이 많으면 종이에 적고 잠깐 내려놓기'],
  편재: ['끌리는 결제는 가격을 한 번 더 비교하기', '새로운 모임이나 활동 하나 알아보기', '새 기회의 장점과 비용을 함께 적어 보기', '오랜만인 사람에게 안부 메시지 보내기', '바깥 일정 사이에 쉬는 틈 만들기'],
  정재: ['이번 주 고정 지출 하나 점검하기', '함께할 다음 약속 날짜 정하기', '오늘 할 일 순서를 정하고 하나씩 처리하기', '미뤄 둔 연락이나 약속 하나 지키기', '식사 시간을 평소대로 지키기'],
  편관: ['급하지 않은 결제는 내일로 미루기', '피곤하면 오늘은 짧게 연락하고 쉬기', '부담되는 일을 두 단계로 나누기', '날카로운 말이 나오기 전에 한 박자 쉬기', '일하는 사이사이 스트레칭 한 번 하기'],
  정관: ['정해 둔 예산 안에서만 쓰기', '서로 한 약속 하나를 다시 챙기기', '맡은 일의 마감과 준비물 확인하기', '먼저 예의 있게 인사 건네기', '정해진 시간에 자고 일어나기'],
  편인: ['사고 싶은 것은 후기부터 찾아보기', '혼자 짐작한 마음은 가볍게 물어보기', '막힌 일을 다른 방법으로 한 번 시도하기', '혼자 하던 고민을 믿는 사람에게 말해 보기', '조용히 혼자 쉬는 시간 20분 갖기'],
  정인: ['필요한 정보를 먼저 알아보고 쓰기', '상대에게 고마운 점 하나 말하기', '배운 것을 업무에 하나 적용해 보기', '도움이 필요한 일은 먼저 물어보기', '오늘은 평소보다 일찍 쉬기'],
};

const PILLAR_NAME: Readonly<Record<PillarPosition, string>> = { year: '연주', month: '월주', day: '일주', hour: '시주' };
type ContactKind = '천간합' | '지지육합' | '천간충' | '지지충';
const CONTACT_PART: Readonly<Record<ContactKind, 'stem' | 'branch'>> = { 천간합: 'stem', 지지육합: 'branch', 천간충: 'stem', 지지충: 'branch' };

export interface TenGodSignal {
  readonly kind: 'tenGod';
  readonly sources: readonly ('stem' | 'branch')[];
  readonly tenGod: TenGod;
  readonly chars: readonly string[];
}
export interface ContactSignal {
  readonly kind: 'contact';
  readonly relation: ContactKind;
  readonly type: 'combine' | 'clash';
  readonly position: PillarPosition;
  readonly todayChar: string;
  readonly natalChar: string;
}
export type DailySignal = TenGodSignal | ContactSignal;

export interface Chip { readonly label: string; readonly tone: 'god' | 'combine' | 'clash' | 'none' }

export interface AreaExplain {
  readonly key: AreaKey;
  readonly name: string;
  readonly score: number;
  /** 이 분야 점수를 더 크게 움직인 십신 (|천간 가중치×4| ≥ |지지 가중치×2| 이면 천간) */
  readonly driver: { readonly tenGod: TenGod; readonly source: 'stem' | 'branch'; readonly weight: number };
  /** 기본 화면 한 문장: 십신이 이 분야 점수를 어떻게 움직였나 (합·충 언급 없음) */
  readonly basis: string;
  readonly action: string;
  /** 점수 상세 안에서만 보여 주는 십신×분야 의미 */
  readonly meaning: string;
  /** 점수 상세 계산표 (엔진 값: 가중치·보정). 합계 = score (0~100 제한 시 clamped) */
  readonly breakdown: readonly { readonly label: string; readonly value: number }[];
  readonly clamped: boolean;
}

export interface DailyExplain {
  readonly version: string;
  readonly today: { readonly stem: string; readonly branch: string; readonly branchMainStem: string };
  /** 실제 신호 (오늘 십신, 원국 기둥별 합·충) */
  readonly signals: readonly DailySignal[];
  /** 기본 화면 */
  readonly summary: {
    readonly chips: readonly Chip[];
    readonly tenGodLines: readonly string[];
    readonly contactLines: readonly string[];
  };
  /** 펼친 상세 (정확한 관계) */
  readonly relationLines: readonly string[];
  readonly compared: readonly PillarPosition[];
  readonly excluded: readonly { readonly position: PillarPosition; readonly reason: string }[];
  readonly scoringNote: string;
  readonly areas: readonly AreaExplain[];
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
export const formatSigned = signed;

/** 같은 명식·날짜 → 같은 결과. 입력(r, saju)을 바꾸지 않는다. */
export function dailyExplain(r: Reading, saju: SajuData): DailyExplain | null {
  const day = dayPillarForDate(r.date);
  if (!day) return null;

  // ① 오늘 십신 (천간·지지 정기가 같은 십신이면 하나로)
  const tenGods: TenGodSignal[] = r.stemRelation === r.branchRelation
    ? [{ kind: 'tenGod', sources: ['stem', 'branch'], tenGod: r.stemRelation, chars: [day.stem, day.branch] }]
    : [
      { kind: 'tenGod', sources: ['stem'], tenGod: r.stemRelation, chars: [day.stem] },
      { kind: 'tenGod', sources: ['branch'], tenGod: r.branchRelation, chars: [day.branch] },
    ];

  // ② 원국 기둥과 오늘의 합·충 (reading.ts 가 실제로 찾은 것만, 순서 그대로)
  const contacts: ContactSignal[] = r.contacts.map((c) => {
    const relation = c.kind as ContactKind;
    const natal = saju.pillars[c.position]?.pillar;
    const part = CONTACT_PART[relation];
    return { kind: 'contact', relation, type: relation.endsWith('충') ? 'clash' : 'combine', position: c.position,
      todayChar: part === 'stem' ? day.stem : day.branch, natalChar: natal ? (part === 'stem' ? natal.stem : natal.branch) : '' };
  });
  const combines = contacts.filter((c) => c.type === 'combine').length;
  const clashes = contacts.filter((c) => c.type === 'clash').length;

  // ③ 기본 화면 요약
  const chips: Chip[] = [
    ...tenGods.map((g) => ({ label: g.tenGod, tone: 'god' as const })),
    ...(combines ? [{ label: `합 🤝 ${combines}`, tone: 'combine' as const }] : []),
    ...(clashes ? [{ label: `충 ⚡ ${clashes}`, tone: 'clash' as const }] : []),
    ...(contacts.length ? [] : [{ label: '합·충 없음', tone: 'none' as const }]),
  ];
  const contactLines = [
    ...(combines ? [CONTACT_PLAIN.combine] : []),
    ...(clashes ? [CONTACT_PLAIN.clash] : []),
    ...(contacts.length ? [] : [CONTACT_PLAIN.none]),
  ];

  // ④ 비교한/제외한 기둥 (reading.ts 와 같은 기준: confirmed 이고 기둥이 있는 것만)
  const compared: PillarPosition[] = [];
  const excluded: { position: PillarPosition; reason: string }[] = [];
  for (const pos of ['year', 'month', 'day', 'hour'] as const) {
    const p = saju.pillars[pos];
    if (p && p.confidence === 'confirmed' && p.pillar) compared.push(pos);
    else excluded.push({ position: pos, reason: pos === 'hour' && !p ? '출생시간을 몰라 시주는 비교하지 않았어요.' : `${PILLAR_NAME[pos]}는 절기 경계 등으로 확정되지 않아 비교하지 않았어요.` });
  }

  // ⑤ 펼친 상세: 오늘 글자 → 십신, 기둥별 관계 (없는 관계는 만들지 않는다)
  const relationLines = [
    `오늘 천간 ${day.stem} → ${r.stemRelation}`,
    `오늘 지지 ${day.branch} → ${r.branchRelation}`,
    ...contacts.map((c) => `오늘 ${c.todayChar} ↔ 내 ${PILLAR_NAME[c.position]} ${c.natalChar} → ${c.relation}`),
    ...(contacts.length ? [] : ['오늘 일진과 합·충을 이루는 내 기둥은 없어요.']),
  ];
  const scoringNote = '합은 1곳당 +2점, 충은 1곳당 −2점(합계 최대 ±6점)으로 다섯 분야 점수에 똑같이 더해져요. 그래서 합·충을 특정 분야만의 원인으로 보지 않아요.';

  // ⑥ 분야별: 점수에 더 크게 작용한 십신(엔진 가중치 × 배수의 절댓값)을 근거로
  const areas: AreaExplain[] = r.areas.map((a, i) => {
    const key = AREA_KEYS[i]!;
    const stemPart = a.weights[0] * 4;
    const branchPart = a.weights[1] * 2;
    const driver = Math.abs(stemPart) >= Math.abs(branchPart)
      ? { tenGod: r.stemRelation, source: 'stem' as const, weight: a.weights[0] }
      : { tenGod: r.branchRelation, source: 'branch' as const, weight: a.weights[1] };
    const basis = stemPart === 0 && branchPart === 0
      ? `오늘의 십신 흐름은 ${AREA_NAME[key].replace(/운$/, '')} 점수를 거의 움직이지 않았어요.`
      : `오늘은 ${driver.tenGod}의 흐름이 ${AREA_NAME[key].replace(/운$/, '')} 점수를 ${effectPhrase(driver.weight)}.`;
    const breakdown = [
      { label: '기본 점수', value: 60 },
      { label: `천간 ${r.stemRelation}`, value: stemPart },
      { label: `지지 ${r.branchRelation}`, value: branchPart },
      ...(r.contacts.length ? [{ label: '오늘 합·충', value: r.adjustment }] : []),
    ];
    const raw = breakdown.reduce((s, b) => s + b.value, 0);
    return { key, name: AREA_NAME[key], score: a.score, driver, basis, action: AREA_ACTION[driver.tenGod][i]!,
      meaning: `${driver.tenGod}: ${AREA_MEANING[driver.tenGod][i]}`, breakdown, clamped: raw !== a.score };
  });

  return {
    version: EXPLAIN_VERSION,
    today: { stem: day.stem, branch: day.branch, branchMainStem: mainHiddenStem(day.branch) },
    signals: [...tenGods, ...contacts],
    summary: { chips, tenGodLines: tenGods.map((g) => TEN_GOD_PLAIN[g.tenGod]), contactLines },
    relationLines,
    compared,
    excluded,
    scoringNote,
    areas,
  };
}
