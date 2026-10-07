// 오늘운세 V2: "왜 이런 결과인가" 설명 계층.
//
// dailyReading()이 이미 계산한 값(오늘 천간·지지 정기의 십성, 확정된 원국 기둥과 오늘의 천간합·지지육합·천간충·지지충,
// 분야별 가중치와 보정)만 사용한다. 새로운 명리 요소(용신·격국·신강약·12운성·대운·형·파·해 등)를 추가하지 않는다.
// 점수·TIER·기존 문구(dailyCopy)를 바꾸지 않으며, 같은 명식·같은 날짜는 항상 같은 설명을 만든다.

import type { SajuData } from '../saju/chart';
import type { PillarPosition, TenGod } from '../saju/types';
import { dayPillarForDate } from '../saju/pillars/dayPillar';
import { mainHiddenStem } from '../saju/chart';
import type { dailyReading } from './reading';

type Reading = NonNullable<ReturnType<typeof dailyReading>>;
type AreaKey = 'money' | 'love' | 'work' | 'people' | 'condition';
const AREA_KEYS: readonly AreaKey[] = ['money', 'love', 'work', 'people', 'condition'];

export const EXPLAIN_VERSION = 'daily-explain-0.1.0';

/** 십성 한 줄 뜻 (사주 초보용). "좋다/나쁘다"를 단정하지 않는다. */
export const TEN_GOD_PLAIN: Readonly<Record<TenGod, string>> = {
  비견: '나와 닮은 기운이에요. 내 기준과 내 페이스가 또렷해지기 쉬운 흐름이에요.',
  겁재: '나와 닮았지만 겨루는 기운이에요. 함께하면서도 내 몫이 신경 쓰이기 쉬운 흐름이에요.',
  식신: '내가 만들어 내는 기운이에요. 꾸준히 하고 즐기는 일에 손이 가기 쉬운 흐름이에요.',
  상관: '내가 드러내는 기운이에요. 생각을 말이나 새로운 방식으로 표현하고 싶어지기 쉬운 흐름이에요.',
  편재: '내가 다루는 바깥 재물의 기운이에요. 새로운 돈·기회·사람 같은 외부 선택지에 관심이 향하기 쉬운 흐름이에요.',
  정재: '내가 다루는 익숙한 재물의 기운이에요. 생활비·일정처럼 꾸준한 살림을 챙기는 데 눈이 가기 쉬운 흐름이에요.',
  편관: '나를 몰아붙이는 기운이에요. 갑자기 맡는 일이나 부담이 평소보다 크게 느껴지기 쉬운 흐름이에요.',
  정관: '나를 바로 세우는 기운이에요. 약속·규칙·맡은 역할을 의식하기 쉬운 흐름이에요.',
  편인: '나를 돕는 색다른 기운이에요. 익숙한 일을 다른 관점에서 보게 되기 쉬운 흐름이에요.',
  정인: '나를 돕고 채워 주는 기운이에요. 배우고, 도움받고, 쉬는 쪽으로 마음이 가기 쉬운 흐름이에요.',
};

/**
 * 분야별 "이 십성이 이 분야 점수에 이렇게 작용했다" 한 줄. WEIGHTS(reading.ts)의 부호와 맞춘다:
 * 가중치가 0 이하인 칸은 "더 조심/덜 두드러짐" 쪽으로 쓴다. 사건을 예언하지 않는다.
 */
export const AREA_WHY: Readonly<Record<TenGod, readonly [string, string, string, string, string]>> = {
  비견: [
    '돈 문제에서 남보다 내 기준이 앞서기 쉬워요. 재물 점수에는 더하지 않았어요.',
    '내 마음을 지키며 다가가려는 힘이 애정에 조금 더해졌어요.',
    '내 방식대로 밀고 나가는 힘이 업무에 조금 더해졌어요.',
    '비슷한 사람들과 어울리는 힘이 인간관계 점수를 크게 올렸어요.',
    '내 리듬을 지키려는 힘이 컨디션 점수를 올렸어요.',
  ],
  겁재: [
    '함께 쓰거나 나누는 돈이 생기기 쉬워 재물 점수는 조금 낮게 잡혔어요.',
    '가까워지고 싶은 마음이 애정에 조금 더해졌어요. 내 공간도 함께 필요해지기 쉬워요.',
    '여럿이 하는 일에서 내 몫을 챙기려는 힘이 업무에 조금 더해졌어요.',
    '어울리는 자리가 늘기 쉬워 인간관계 점수를 올렸어요.',
    '사람들 사이에서 에너지를 쓰기 쉬워 컨디션 점수에는 더하지 않았어요.',
  ],
  식신: [
    '작은 즐거움을 누리는 여유가 재물 점수를 올렸어요.',
    '편안하게 마음을 표현하는 힘이 애정 점수를 올렸어요.',
    '손에 잡히는 일을 꾸준히 해내는 힘이 업무 점수를 크게 올렸어요.',
    '부드러운 분위기를 만드는 힘이 인간관계에 조금 더해졌어요.',
    '먹고 쉬는 일상의 즐거움이 컨디션 점수를 크게 올렸어요.',
  ],
  상관: [
    '새로운 아이디어로 돈을 보는 눈이 재물에 조금 더해졌어요.',
    '솔직한 표현이 앞서기 쉬워 애정 점수에는 더하지 않았어요.',
    '생각을 드러내고 바꿔 보는 힘이 업무 점수를 크게 올렸어요.',
    '말이 앞서면 오해가 생기기 쉬워 인간관계 점수는 조금 낮게 잡혔어요.',
    '생각이 많아지기 쉬워 컨디션 점수에는 더하지 않았어요.',
  ],
  편재: [
    '새로운 돈·기회에 눈이 가기 쉬워 재물 점수를 크게 올렸어요.',
    '새로운 만남이나 활동에 관심이 향하기 쉬워 애정 점수를 올렸어요.',
    '바깥 기회를 넓게 보는 힘이 업무 점수를 올렸어요.',
    '사람과 기회를 연결하는 힘이 인간관계 점수를 올렸어요.',
    '바깥일에 신경이 쏠리기 쉬워 컨디션 점수에는 더하지 않았어요.',
  ],
  정재: [
    '꾸준한 살림과 지출 관리에 눈이 가기 쉬워 재물 점수를 크게 올렸어요.',
    '안정적인 관계를 챙기려는 마음이 애정에 조금 더해졌어요.',
    '정해진 일을 차근차근 처리하는 힘이 업무 점수를 크게 올렸어요.',
    '약속을 지키는 성실함이 인간관계에 조금 더해졌어요.',
    '생활 리듬을 정돈하는 힘이 컨디션 점수를 올렸어요.',
  ],
  편관: [
    '돈보다 해야 할 일에 신경이 쏠리기 쉬워 재물 점수에는 더하지 않았어요.',
    '마음의 여유가 줄기 쉬워 애정 점수에는 더하지 않았어요.',
    '도전과 책임을 감당하는 힘이 업무 점수를 크게 올렸어요.',
    '부담이 말투에 묻어나기 쉬워 인간관계 점수는 조금 낮게 잡혔어요.',
    '긴장이 쌓이기 쉬워 컨디션 점수는 조금 낮게 잡혔어요.',
  ],
  정관: [
    '정해진 규칙 안에서 돈을 다루려는 마음이 재물에 조금 더해졌어요.',
    '서로의 약속을 소중히 여기는 마음이 애정 점수를 올렸어요.',
    '맡은 역할과 책임을 챙기는 힘이 업무 점수를 크게 올렸어요.',
    '예의와 신뢰를 지키는 힘이 인간관계 점수를 올렸어요.',
    '규칙적인 생활을 챙기려는 마음이 컨디션에 조금 더해졌어요.',
  ],
  편인: [
    '돈보다 생각과 관심사에 마음이 가기 쉬워 재물 점수에는 더하지 않았어요.',
    '혼자만의 생각이 많아지기 쉬워 애정에는 조금만 더해졌어요.',
    '다른 관점으로 보는 힘이 업무에 조금 더해졌어요.',
    '내 생각에 집중하기 쉬워 인간관계 점수에는 더하지 않았어요.',
    '혼자 쉬며 생각을 정리하는 힘이 컨디션 점수를 올렸어요.',
  ],
  정인: [
    '알아보고 배우는 쪽으로 돈을 다루기 쉬워 재물에 조금 더해졌어요.',
    '돌봄과 배려를 주고받는 힘이 애정 점수를 올렸어요.',
    '배운 것을 일에 쓰는 힘이 업무에 조금 더해졌어요.',
    '도움을 주고받는 힘이 인간관계 점수를 올렸어요.',
    '쉬고 회복하는 쪽으로 마음이 가기 쉬워 컨디션 점수를 크게 올렸어요.',
  ],
};

/** 분야별 오늘의 PLAY 행동 (십성 × 분야). 단정·의학적 조언 없음. */
export const AREA_ACTION: Readonly<Record<TenGod, readonly [string, string, string, string, string]>> = {
  비견: ['남 따라 사는 물건 대신 내게 필요한 것 하나만 고르기', '참아 둔 마음 한 가지를 부드럽게 말해 보기', '내 방식으로 끝낼 일 하나 정하기', '생각이 다른 사람의 이유를 한 번 물어보기', '오늘 잠드는 시간을 평소대로 지키기'],
  겁재: ['함께 쓰는 돈은 먼저 금액부터 정하기', '함께하는 시간과 혼자만의 시간을 하나씩 정하기', '함께하는 일에서 내 역할을 한 문장으로 적기', '버거운 부탁 하나는 가능한 만큼만 답하기', '약속 사이에 30분 쉬는 시간 남겨 두기'],
  식신: ['나를 기분 좋게 하는 작은 소비 하나만 허락하기', '함께 먹거나 걷는 편안한 약속 제안하기', '미뤄 둔 작은 일 하나 끝내기', '고마운 사람에게 가벼운 인사 건네기', '좋아하는 음식으로 한 끼 챙겨 먹기'],
  상관: ['돈 버는 새 아이디어 하나를 메모해 두기', '솔직한 말은 상대가 듣기 편한 말로 한 번 다듬기', '바꾸고 싶은 업무 방식 하나를 제안해 보기', '말하기 전에 상대 이야기를 끝까지 듣기', '생각이 많으면 종이에 적고 잠깐 내려놓기'],
  편재: ['끌리는 결제는 가격을 한 번 더 비교하기', '새로운 모임이나 활동 하나 알아보기', '새 기회의 장점과 비용을 함께 적어 보기', '오랜만인 사람에게 안부 메시지 보내기', '바깥 일정 사이에 쉬는 틈 만들기'],
  정재: ['이번 주 고정 지출 하나 점검하기', '함께할 다음 약속 날짜 정하기', '오늘 할 일 순서를 정하고 하나씩 처리하기', '미뤄 둔 연락이나 약속 하나 지키기', '식사 시간을 평소대로 지키기'],
  편관: ['급하지 않은 결제는 내일로 미루기', '피곤하면 오늘은 짧게 연락하고 쉬기', '부담되는 일을 두 단계로 나누기', '날카로운 말이 나오기 전에 한 박자 쉬기', '일하는 사이사이 스트레칭 한 번 하기'],
  정관: ['정해 둔 예산 안에서만 쓰기', '서로 한 약속 하나를 다시 챙기기', '맡은 일의 마감과 준비물 확인하기', '먼저 예의 있게 인사 건네기', '정해진 시간에 자고 일어나기'],
  편인: ['사고 싶은 것은 후기부터 찾아보기', '혼자 짐작한 마음은 가볍게 물어보기', '막힌 일을 다른 방법으로 한 번 시도하기', '혼자 하던 고민을 믿는 사람에게 말해 보기', '조용히 혼자 쉬는 시간 20분 갖기'],
  정인: ['필요한 정보를 먼저 알아보고 쓰기', '상대에게 고마운 점 하나 말하기', '배운 것을 업무에 하나 적용해 보기', '도움이 필요한 일은 먼저 물어보기', '오늘은 평소보다 일찍 쉬기'],
};

const PILLAR_NAME: Readonly<Record<PillarPosition, string>> = { year: '연주', month: '월주', day: '일주', hour: '시주' };
const PILLAR_PLAIN: Readonly<Record<PillarPosition, string>> = { year: '태어난 해의 기둥', month: '태어난 달의 기둥', day: '태어난 날의 기둥', hour: '태어난 시간의 기둥' };

type ContactKind = '천간합' | '지지육합' | '천간충' | '지지충';
const CONTACT_INFO: Readonly<Record<ContactKind, { type: 'combine' | 'clash'; part: 'stem' | 'branch'; chip: string; plain: string }>> = {
  천간합: { type: 'combine', part: 'stem', chip: '합 🤝', plain: '겉으로 드러나는 기운끼리 서로 끌어당기는 관계예요. 맞춰 가거나 함께 어울리기 쉬운 흐름이에요.' },
  지지육합: { type: 'combine', part: 'branch', chip: '합 🤝', plain: '바탕에 깔린 기운끼리 맞물리는 관계예요. 일이나 관계가 자연스럽게 이어지기 쉬운 흐름이에요.' },
  천간충: { type: 'clash', part: 'stem', chip: '충 ⚡', plain: '겉으로 드러나는 기운이 서로 부딪히는 관계예요. 생각이나 계획이 엇갈리기 쉬운 흐름이에요. 나쁜 일이 생긴다는 뜻은 아니에요.' },
  지지충: { type: 'clash', part: 'branch', chip: '충 ⚡', plain: '바탕에 깔린 기운이 서로 부딪히는 관계예요. 변화나 일정의 흔들림이 생기기 쉬운 흐름이에요. 나쁜 일이 생긴다는 뜻은 아니에요.' },
};

export interface TenGodSignal {
  readonly kind: 'tenGod';
  readonly sources: readonly ('stem' | 'branch')[];
  readonly tenGod: TenGod;
  /** 오늘 글자 (천간 또는 지지) */
  readonly chars: readonly string[];
  readonly chip: string;
  readonly title: string;
  readonly plain: string;
}
export interface ContactSignal {
  readonly kind: 'contact';
  readonly relation: ContactKind;
  readonly type: 'combine' | 'clash';
  readonly position: PillarPosition;
  readonly todayChar: string;
  readonly natalChar: string;
  readonly chip: string;
  readonly title: string;
  readonly plain: string;
}
export interface NoContactSignal {
  readonly kind: 'noContact';
  readonly chip: string;
  readonly title: string;
  readonly plain: string;
}
export type DailySignal = TenGodSignal | ContactSignal | NoContactSignal;

export interface AreaExplain {
  readonly key: AreaKey;
  readonly score: number;
  /** 이 분야 점수에 더 크게 작용한 십성과 그 위치 */
  readonly driver: { readonly tenGod: TenGod; readonly source: 'stem' | 'branch' };
  readonly chips: readonly string[];
  readonly why: string;
  readonly action: string;
  /** 점수 계산식 그대로: 기본 60 + 천간 가중치×4 + 지지 가중치×2 + 합·충 보정 (0~100 제한) */
  readonly breakdown: readonly { readonly label: string; readonly value: number }[];
  readonly clamped: boolean;
}

export interface SignalDetail {
  readonly kind: DailySignal['kind'];
  readonly type: 'combine' | 'clash' | null;
  readonly chip: string;
  readonly title: string;
  readonly plain: string;
}

export interface DailyExplain {
  readonly version: string;
  readonly today: { readonly stem: string; readonly branch: string; readonly branchMainStem: string };
  readonly signals: readonly DailySignal[];
  /** 화면 설명용: 같은 종류의 합·충(예: 연주·일주 둘 다 천간합)은 한 항목으로 묶는다 */
  readonly details: readonly SignalDetail[];
  readonly compared: readonly PillarPosition[];
  readonly excluded: readonly { readonly position: PillarPosition; readonly reason: string }[];
  readonly areas: readonly AreaExplain[];
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
export const formatSigned = signed;

/** 같은 명식·날짜 → 같은 결과. 입력(r, saju)을 바꾸지 않는다. */
export function dailyExplain(r: Reading, saju: SajuData): DailyExplain | null {
  const day = dayPillarForDate(r.date);
  if (!day) return null;
  const branchMain = r.branchRelation;

  // ① 오늘 십성 신호 (천간·지지 정기가 같은 십성이면 하나로 합친다)
  const tenGodSignals: TenGodSignal[] = [];
  const stemSig = { tenGod: r.stemRelation, source: 'stem' as const, char: day.stem };
  const branchSig = { tenGod: branchMain, source: 'branch' as const, char: day.branch };
  if (stemSig.tenGod === branchSig.tenGod) {
    tenGodSignals.push({ kind: 'tenGod', sources: ['stem', 'branch'], tenGod: stemSig.tenGod, chars: [day.stem, day.branch], chip: stemSig.tenGod,
      title: `오늘 천간 ‘${day.stem}’과 지지 ‘${day.branch}’ → 둘 다 ${stemSig.tenGod}`, plain: TEN_GOD_PLAIN[stemSig.tenGod] });
  } else {
    for (const s of [stemSig, branchSig]) {
      tenGodSignals.push({ kind: 'tenGod', sources: [s.source], tenGod: s.tenGod, chars: [s.char], chip: s.tenGod,
        title: `${s.source === 'stem' ? '오늘 천간' : '오늘 지지'} ‘${s.char}’ → ${s.tenGod}`, plain: TEN_GOD_PLAIN[s.tenGod] });
    }
  }

  // ② 원국과 오늘 일진의 합·충 (reading.ts 가 실제로 찾은 것만)
  const contactSignals: ContactSignal[] = r.contacts.map((c) => {
    const kind = c.kind as ContactKind;
    const info = CONTACT_INFO[kind];
    const natal = saju.pillars[c.position]?.pillar;
    const natalChar = natal ? (info.part === 'stem' ? natal.stem : natal.branch) : '';
    const todayChar = info.part === 'stem' ? day.stem : day.branch;
    return { kind: 'contact', relation: kind, type: info.type, position: c.position, todayChar, natalChar, chip: `${info.chip} ${PILLAR_NAME[c.position]}`,
      title: `오늘 ‘${todayChar}’ ↔ 내 ${PILLAR_NAME[c.position]}(${PILLAR_PLAIN[c.position]}) ‘${natalChar}’ : ${kind}`, plain: info.plain };
  });
  const signals: DailySignal[] = [...tenGodSignals, ...contactSignals];
  if (!contactSignals.length) {
    signals.push({ kind: 'noContact', chip: '합·충 없음', title: '오늘 일진과 내 사주 기둥 사이에 합·충이 없어요',
      plain: '그래서 오늘은 합·충 보정 없이 십성 흐름만 점수에 반영했어요.' });
  }

  // ③ 비교한 기둥 / 제외한 기둥 (reading.ts 와 같은 기준: confirmed 이고 기둥이 있는 것만)
  const compared: PillarPosition[] = [];
  const excluded: { position: PillarPosition; reason: string }[] = [];
  for (const pos of ['year', 'month', 'day', 'hour'] as const) {
    const p = saju.pillars[pos];
    if (p && p.confidence === 'confirmed' && p.pillar) compared.push(pos);
    else excluded.push({ position: pos, reason: pos === 'hour' && !p ? '출생시간을 몰라 비교하지 않았어요' : '절기 경계 등으로 확정되지 않아 비교하지 않았어요' });
  }

  // ④ 분야별: 점수에 더 크게 작용한 십성(가중치×배수의 절댓값)을 근거로 설명·행동을 고른다
  const areas: AreaExplain[] = r.areas.map((a, i) => {
    const key = AREA_KEYS[i]!;
    const stemPart = a.weights[0] * 4;
    const branchPart = a.weights[1] * 2;
    // 동률이면 천간(가중치 배수가 더 큰 쪽). 둘 다 0 이면 천간 기준으로 "더하지 않았어요" 문장이 나온다.
    const driver = Math.abs(stemPart) >= Math.abs(branchPart) ? { tenGod: r.stemRelation, source: 'stem' as const } : { tenGod: branchMain, source: 'branch' as const };
    const raw = 60 + stemPart + branchPart + r.adjustment;
    const breakdown = [
      { label: '기본', value: 60 },
      { label: `천간 ${r.stemRelation}`, value: stemPart },
      { label: `지지 ${branchMain}`, value: branchPart },
      ...(r.contacts.length ? [{ label: '합·충', value: r.adjustment }] : []),
    ];
    const chips = [...new Set([driver.tenGod, ...contactSignals.map((c) => c.chip.split(' ').slice(0, 2).join(' '))])];
    const why = `${driver.source === 'stem' ? '오늘 천간' : '오늘 지지'}의 ${driver.tenGod} — ${AREA_WHY[driver.tenGod][i]}`;
    const action = AREA_ACTION[driver.tenGod][i]!;
    return { key, score: a.score, driver, chips, why, action, breakdown, clamped: raw !== a.score };
  });

  const details: SignalDetail[] = tenGodSignals.map((x) => ({ kind: x.kind, type: null, chip: x.chip, title: x.title, plain: x.plain }));
  for (const kind of ['천간합', '지지육합', '천간충', '지지충'] as const) {
    const group = contactSignals.filter((c) => c.relation === kind);
    if (!group.length) continue;
    const info = CONTACT_INFO[kind];
    // 한 곳이면 기둥 뜻을 함께, 여러 곳이면 제목이 길어지지 않게 기둥 이름만
    const where = group.map((c) => `${PILLAR_NAME[c.position]}${group.length === 1 ? `(${PILLAR_PLAIN[c.position]})` : ''} ‘${c.natalChar}’`).join(' · ');
    details.push({ kind: 'contact', type: info.type, chip: info.chip, title: `오늘 ‘${group[0]!.todayChar}’ ↔ 내 ${where} : ${kind}${group.length > 1 ? ` (${group.length}곳)` : ''}`, plain: info.plain });
  }
  if (!contactSignals.length) details.push({ kind: 'noContact', type: null, chip: '합·충 없음', title: '오늘 일진과 내 사주 기둥 사이에 합·충이 없어요', plain: '그래서 오늘은 합·충 보정 없이 십성 흐름만 점수에 반영했어요.' });
  return { version: EXPLAIN_VERSION, today: { stem: day.stem, branch: day.branch, branchMainStem: mainHiddenStem(day.branch) }, signals, details, compared, excluded, areas };
}
