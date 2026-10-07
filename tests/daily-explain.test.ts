// 오늘운세 V2 설명 계층: 실제 계산 근거만 보여주는지, 같은 점수라도 근거가 다르면 설명이 다른지.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSaju } from '../src/lib/engine';
import { dailyReading } from '../src/lib/daily/reading';
import { dailyExplain, AREA_ACTION, AREA_WHY, TEN_GOD_PLAIN } from '../src/lib/daily/explain';
import { dailyCopy } from '../web/src/dailyCopy';

type Gender = 'male' | 'female';
const chart = (birthDate: string, birthTime: string | null, gender: Gender = 'male') => {
  const c = computeSaju({ birthDate, birthTime, gender, calendar: 'solar', birthCountry: 'KR' });
  assert(c.ok, birthDate);
  return c.data;
};
const iso = (base: string, plus: number) => new Date(Date.parse(base + 'T00:00:00Z') + plus * 86400000).toISOString().slice(0, 10);
// 10일 연속 출생일 → 일간 10개 전부, 60일 연속 날짜 → 60갑자 일진 전부
const BIRTHS = Array.from({ length: 10 }, (_, i) => iso('1990-05-15', i));
const DATES = Array.from({ length: 60 }, (_, i) => iso('2026-10-01', i));

function all(time: string | null = '14:20') {
  const out = [];
  for (const b of BIRTHS) {
    const s = chart(b, time);
    for (const d of DATES) {
      const r = dailyReading(s, d)!;
      out.push({ b, d, s, r, ex: dailyExplain(r, s)! });
    }
  }
  return out;
}
const SAMPLES = all();

test('A: 같은 명식·같은 날짜 → 같은 점수·같은 신호·같은 문장, 입력을 바꾸지 않음', () => {
  for (const { s, r, ex, d } of SAMPLES.slice(0, 120)) {
    const before = JSON.stringify(r);
    assert.deepEqual(dailyExplain(r, s), ex);
    assert.deepEqual(dailyExplain(dailyReading(s, d)!, s), ex);
    assert.equal(JSON.stringify(r), before, '점수·관계 원본 그대로');
    assert.deepEqual(ex.areas.map((a) => a.score), r.areas.map((a) => a.score), '점수는 엔진 값 그대로');
  }
});

test('점수 계산식 공개값 = 실제 점수 (기본 60 + 천간×4 + 지지×2 + 합·충, 0~100)', () => {
  for (const { r, ex } of SAMPLES) {
    ex.areas.forEach((a, i) => {
      const sum = a.breakdown.reduce((t, b) => t + b.value, 0);
      assert.equal(a.clamped ? Math.max(0, Math.min(100, sum)) : sum, a.score);
      assert.equal(a.breakdown[1]!.value, r.areas[i]!.weights[0] * 4);
      assert.equal(a.breakdown[2]!.value, r.areas[i]!.weights[1] * 2);
      assert.equal(a.breakdown[1]!.label, '천간 ' + r.stemRelation);
      assert.equal(a.breakdown[2]!.label, '지지 ' + r.branchRelation);
    });
  }
});

test('B: 같은 분야 점수라도 근거 십성이 다르면 설명·행동이 다르다', () => {
  let pairs = 0;
  const byScore = new Map<string, (typeof SAMPLES)[number]>();
  for (const x of SAMPLES) {
    for (let i = 0; i < 5; i++) {
      const a = x.ex.areas[i]!;
      const k = `${i}:${a.score}`;
      const prev = byScore.get(k);
      if (prev) {
        const p = prev.ex.areas[i]!;
        if (p.driver.tenGod !== a.driver.tenGod) {
          pairs++;
          assert.notEqual(p.why, a.why);
          assert.notEqual(p.action, a.action);
        }
      } else byScore.set(k, x);
    }
  }
  assert(pairs > 50, `비교 쌍 ${pairs}`);
});

test('C: 합·충이 실제로 있으면 신호·분야 칩·계산식에 그대로 반영된다', () => {
  let combine = 0, clash = 0;
  for (const { r, ex } of SAMPLES) {
    const contacts = ex.signals.filter((x) => x.kind === 'contact');
    assert.equal(contacts.length, r.contacts.length);
    r.contacts.forEach((c, i) => {
      const sig = contacts[i]!;
      assert(sig.kind === 'contact');
      assert.equal(sig.relation, c.kind);
      assert.equal(sig.position, c.position);
      assert.match(sig.chip, c.kind.endsWith('충') ? /^충 ⚡/ : /^합 🤝/);
      if (c.kind.endsWith('충')) clash++; else combine++;
    });
    if (r.contacts.length) {
      for (const a of ex.areas) {
        assert.equal(a.breakdown.find((b) => b.label === '합·충')!.value, r.adjustment);
        for (const c of r.contacts) assert(a.chips.includes(c.kind.endsWith('충') ? '충 ⚡' : '합 🤝'));
      }
    }
  }
  assert(combine > 20 && clash > 20, `합 ${combine} 충 ${clash}`);
});

test('화면 설명: 같은 종류 합·충은 한 항목으로 묶고, 모든 실제 접촉 위치를 빠짐없이 적는다', () => {
  let grouped = 0;
  for (const { r, ex } of SAMPLES) {
    const contactDetails = ex.details.filter((x) => x.kind === 'contact');
    assert.equal(contactDetails.length, new Set(r.contacts.map((c) => c.kind)).size, '종류별 1개');
    assert.equal(new Set(ex.details.map((x) => x.plain)).size, ex.details.length, '같은 설명 반복 없음');
    const POS = { year: '연주', month: '월주', day: '일주', hour: '시주' } as const;
    for (const c of r.contacts) assert(contactDetails.some((x) => x.title.includes(POS[c.position]) && x.title.endsWith(c.kind) || x.title.includes(POS[c.position]) && x.title.includes(c.kind + ' (')), `${c.position} ${c.kind}`);
    if (contactDetails.some((x) => x.title.includes('곳)'))) grouped++;
  }
  assert(grouped > 0, '묶음 사례 확인');
});

test('D: 합·충이 없는 날은 억지로 표시하지 않는다', () => {
  let none = 0;
  for (const { r, ex } of SAMPLES) {
    if (r.contacts.length) continue;
    none++;
    assert(!ex.signals.some((x) => x.kind === 'contact'));
    assert.equal(ex.signals.filter((x) => x.kind === 'noContact').length, 1);
    for (const a of ex.areas) {
      assert(!a.chips.some((c) => /충|합/.test(c)));
      assert(!a.breakdown.some((b) => b.label === '합·충'));
    }
  }
  assert(none > 100, `합·충 없는 날 ${none}`);
});

test('E: 출생시간 모름 → 시주를 근거로 쓰지 않고 이유를 밝힌다', () => {
  for (const b of BIRTHS) {
    const s = chart(b, null);
    assert.equal(s.pillars.hour, null);
    for (const d of DATES) {
      const ex = dailyExplain(dailyReading(s, d)!, s)!;
      assert(!ex.compared.includes('hour'));
      assert(ex.excluded.some((e) => e.position === 'hour' && e.reason.includes('출생시간')));
      assert(!ex.signals.some((x) => x.kind === 'contact' && x.position === 'hour'));
    }
  }
});

test('성별은 오늘운세 계산·설명에 쓰이지 않는다 (같은 명식이면 남녀 결과 동일)', () => {
  for (const b of BIRTHS.slice(0, 3)) {
    const m = chart(b, '09:30', 'male'), f = chart(b, '09:30', 'female');
    for (const d of DATES.slice(0, 10)) assert.deepEqual(dailyExplain(dailyReading(m, d)!, m), dailyExplain(dailyReading(f, d)!, f));
  }
});

test('설명 문구 크기 표현이 실제 가중치와 일치 (크게 올림/올림/조금/더하지 않음/낮게)', () => {
  const seen = new Set<string>();
  for (const { r, ex } of SAMPLES) {
    ex.areas.forEach((a, i) => {
      const w = a.driver.source === 'stem' ? r.areas[i]!.weights[0] : r.areas[i]!.weights[1];
      const t = a.why;
      seen.add(`${a.driver.tenGod}:${i}`);
      if (w >= 3) assert(t.includes('크게 올렸어요'), t);
      else if (w === 2) assert(t.includes('올렸어요') && !t.includes('크게'), t);
      else if (w === 1) assert(t.includes('조금') && !t.includes('올렸어요'), t);
      else if (w === 0) assert(t.includes('더하지 않았어요'), t);
      else assert(t.includes('낮게 잡혔어요'), t);
    });
  }
  assert(seen.size >= 40, `확인한 십성×분야 ${seen.size}`);
  // 문장표 자체도 같은 기준인지 (가중치 표를 엔진에서 직접 읽어 모든 칸 확인)
  const weightOf = new Map<string, number>();
  for (const { r } of SAMPLES) r.areas.forEach((a, i) => { weightOf.set(`${r.stemRelation}:${i}`, a.weights[0]); weightOf.set(`${r.branchRelation}:${i}`, a.weights[1]); });
  assert.equal(weightOf.size, 50);
  for (const [k, w] of weightOf) {
    const [g, i] = k.split(':') as [keyof typeof AREA_WHY, string];
    const t = AREA_WHY[g][Number(i)]!;
    if (w >= 3) assert(t.includes('크게 올렸어요'), k + t);
    else if (w === 2) assert(t.includes('올렸어요') && !t.includes('크게'), k + t);
    else if (w === 1) assert(t.includes('조금') && !t.includes('올렸어요'), k + t);
    else if (w === 0) assert(t.includes('더하지 않았어요'), k + t);
    else assert(t.includes('낮게 잡혔어요'), k + t);
  }
});

test('계산하지 않는 명리 요소·단정 표현을 쓰지 않는다', () => {
  const banned = /용신|희신|기신|격국|신강|신약|운성|대운|세운|지지형|지지파|지지해|삼형|반드시|돈이 들어옵니다|연인이 생깁니다|성사됩니다|사고가 납니다|건강이 나빠|병이|질병|수익 보장/;
  const texts = [...Object.values(TEN_GOD_PLAIN), ...Object.values(AREA_WHY).flat(), ...Object.values(AREA_ACTION).flat()];
  for (const { ex } of SAMPLES.slice(0, 200)) texts.push(...ex.signals.flatMap((x) => [x.title, x.plain]), ...ex.areas.flatMap((a) => [a.why, a.action]), ...ex.excluded.map((e) => e.reason));
  for (const t of texts) assert(!banned.test(t), t);
  assert.equal(new Set(Object.values(AREA_ACTION).flat()).size, 50, '행동 50개 모두 다름');
  assert.equal(Object.keys(TEN_GOD_PLAIN).length, 10);
});

test('기존 dailyCopy 결과는 V2 추가 후에도 그대로 (점수·문구 회귀 없음)', () => {
  const s = chart('1990-05-15', '14:20');
  const r = dailyReading(s, '2026-10-06')!;
  assert.equal(r.score, 64);
  assert.deepEqual(r.areas.map((a) => a.score), [64, 62, 72, 58, 66]);
  const before = JSON.stringify(dailyCopy(r, s.dayMaster!.stem));
  dailyExplain(r, s);
  assert.equal(JSON.stringify(dailyCopy(r, s.dayMaster!.stem)), before);
});
