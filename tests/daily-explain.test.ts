// 오늘운세 V2 설명 계층: 실제 계산 근거만 보여주는지, 합·충을 분야 원인으로 과장하지 않는지, 계산 결과가 기준선과 같은지.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { computeSaju } from '../src/lib/engine';
import { dailyReading } from '../src/lib/daily/reading';
import { dailyExplain, effectPhrase, AREA_ACTION, AREA_MEANING, TEN_GOD_PLAIN, CONTACT_PLAIN } from '../src/lib/daily/explain';
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
const POS = { year: '연주', month: '월주', day: '일주', hour: '시주' } as const;

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

test('계산 LOCK: V2(c23411c) 기준선 3,060건과 점수·십신·합충·TIER·기존 문구가 완전히 같다 (diff = 0)', () => {
  const base = JSON.parse(readFileSync(new URL('./fixtures/today-v2-baseline.json', import.meta.url), 'utf8')) as { rows: unknown[][] };
  assert.equal(base.rows.length, 3060);
  let diff = 0, compared = 0;
  for (const row of base.rows) {
    const [b, t, d] = row as [string, string | null, string];
    if (row[2] === 'ERR') continue;
    const c = computeSaju({ birthDate: b, birthTime: t, gender: 'male', calendar: 'solar', birthCountry: 'KR' });
    assert(c.ok);
    const r = dailyReading(c.data, d);
    const now = r === null ? [b, t, d, null] : [b, t, d, r.ganji, r.stemRelation, r.branchRelation, r.contacts.map((x) => `${x.position}:${x.kind}`), r.adjustment, r.areas.map((a) => a.score), r.areas.map((a) => a.weights), r.score, r.tier,
      createHash('sha256').update(JSON.stringify(dailyCopy(r, c.data.dayMaster!.stem))).digest('hex').slice(0, 16)];
    compared++;
    if (JSON.stringify(now) !== JSON.stringify(row)) diff++;
  }
  assert.equal(compared, 3060);
  assert.equal(diff, 0);
});

test('A: 같은 명식·같은 날짜 → 같은 점수·같은 신호·같은 문장, 입력을 바꾸지 않음', () => {
  for (const { s, r, ex, d } of SAMPLES.slice(0, 120)) {
    const before = JSON.stringify(r);
    assert.deepEqual(dailyExplain(r, s), ex);
    assert.deepEqual(dailyExplain(dailyReading(s, d)!, s), ex);
    assert.equal(JSON.stringify(r), before, '점수·관계 원본 그대로');
    assert.deepEqual(ex.areas.map((a) => a.score), r.areas.map((a) => a.score), '점수는 엔진 값 그대로');
  }
});

test('점수 상세표 합계 = 실제 점수 (기본 60 + 천간×4 + 지지×2 + 합·충, 0~100)', () => {
  for (const { r, ex } of SAMPLES) {
    ex.areas.forEach((a, i) => {
      const sum = a.breakdown.reduce((t, b) => t + b.value, 0);
      assert.equal(a.clamped ? Math.max(0, Math.min(100, sum)) : sum, a.score);
      assert.equal(a.breakdown[0]!.value, 60);
      assert.equal(a.breakdown[1]!.value, r.areas[i]!.weights[0] * 4);
      assert.equal(a.breakdown[2]!.value, r.areas[i]!.weights[1] * 2);
      assert.equal(a.breakdown[1]!.label, '천간 ' + r.stemRelation);
      assert.equal(a.breakdown[2]!.label, '지지 ' + r.branchRelation);
    });
  }
});

test('B: 같은 분야 점수라도 근거 십신이 다르면 기본 문장·행동·상세 의미가 다르다', () => {
  let pairs = 0;
  const byScore = new Map<string, (typeof SAMPLES)[number]>();
  for (const x of SAMPLES) {
    for (let i = 0; i < 5; i++) {
      const a = x.ex.areas[i]!;
      const k = `${i}:${a.score}`;
      const prev = byScore.get(k);
      if (!prev) { byScore.set(k, x); continue; }
      const p = prev.ex.areas[i]!;
      if (p.driver.tenGod === a.driver.tenGod) continue;
      pairs++;
      assert.notEqual(p.action, a.action);
      assert.notEqual(p.meaning, a.meaning);
      if (p.driver.weight !== 0 || a.driver.weight !== 0) assert.notEqual(p.basis, a.basis);
    }
  }
  assert(pairs > 50, `비교 쌍 ${pairs}`);
});

test('C: 합·충이 실제로 있으면 개수 칩·상세 관계·점수표에 그대로 반영된다', () => {
  let combine = 0, clash = 0;
  for (const { r, ex } of SAMPLES) {
    const contacts = ex.signals.filter((x) => x.kind === 'contact');
    assert.equal(contacts.length, r.contacts.length);
    r.contacts.forEach((c, i) => {
      const sig = contacts[i]!;
      assert(sig.kind === 'contact');
      assert.equal(sig.relation, c.kind);
      assert.equal(sig.position, c.position);
      const line = `오늘 ${sig.todayChar} ↔ 내 ${POS[c.position]} ${sig.natalChar} → ${c.kind}`;
      assert.equal(ex.relationLines.filter((l) => l === line).length, 1, line);
    });
    const nC = r.contacts.filter((c) => c.kind.endsWith('합')).length;
    const nX = r.contacts.filter((c) => c.kind.endsWith('충')).length;
    combine += nC; clash += nX;
    const labels = ex.summary.chips.map((c) => c.label);
    assert.equal(labels.includes(`합 🤝 ${nC}`), nC > 0);
    assert.equal(labels.includes(`충 ⚡ ${nX}`), nX > 0);
    assert.equal(ex.summary.contactLines.includes(CONTACT_PLAIN.combine), nC > 0);
    assert.equal(ex.summary.contactLines.includes(CONTACT_PLAIN.clash), nX > 0);
    if (r.contacts.length) for (const a of ex.areas) assert.equal(a.breakdown.find((b) => b.label === '오늘 합·충')!.value, r.adjustment);
  }
  assert(combine > 20 && clash > 20, `합 ${combine} 충 ${clash}`);
});

test('D: 합·충이 없는 날은 억지로 표시하지 않는다', () => {
  let none = 0;
  for (const { r, ex } of SAMPLES) {
    if (r.contacts.length) continue;
    none++;
    assert(!ex.signals.some((x) => x.kind === 'contact'));
    assert.deepEqual(ex.summary.chips.filter((c) => c.tone !== 'god').map((c) => c.label), ['합·충 없음']);
    assert.deepEqual(ex.summary.contactLines, [CONTACT_PLAIN.none]);
    assert(!ex.relationLines.some((l) => l.includes('↔')));
    for (const a of ex.areas) assert(!a.breakdown.some((b) => b.label === '오늘 합·충'));
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
      assert(ex.excluded.some((e) => e.position === 'hour' && e.reason === '출생시간을 몰라 시주는 비교하지 않았어요.'));
      assert(!ex.signals.some((x) => x.kind === 'contact' && x.position === 'hour'));
      assert(!ex.relationLines.some((l) => l.includes('시주')));
    }
  }
});

test('성별은 오늘운세 계산·설명에 쓰이지 않는다 (같은 명식이면 남녀 결과 동일)', () => {
  for (const b of BIRTHS.slice(0, 3)) {
    const m = chart(b, '09:30', 'male'), f = chart(b, '09:30', 'female');
    for (const d of DATES.slice(0, 10)) assert.deepEqual(dailyExplain(dailyReading(m, d)!, m), dailyExplain(dailyReading(f, d)!, f));
  }
});

test('기본 문장의 크기 표현 = 엔진 가중치 (크게 올렸/올렸/조금 올렸/움직이지 않았/낮췄)', () => {
  const seen = new Set<string>();
  for (const { r, ex } of SAMPLES) {
    ex.areas.forEach((a, i) => {
      const w = a.driver.source === 'stem' ? r.areas[i]!.weights[0] : r.areas[i]!.weights[1];
      assert.equal(a.driver.weight, w);
      seen.add(`${a.driver.tenGod}:${i}`);
      const both0 = r.areas[i]!.weights[0] === 0 && r.areas[i]!.weights[1] === 0;
      assert(a.basis.includes(both0 ? '거의 움직이지 않았어요' : effectPhrase(w)), a.basis);
      if (!both0) assert(a.basis.startsWith(`오늘은 ${a.driver.tenGod}의 흐름이 `), a.basis);
    });
  }
  assert(seen.size >= 40, `확인한 십신×분야 ${seen.size}`);
  assert.equal(effectPhrase(4), '크게 올렸어요');
  assert.equal(effectPhrase(2), '올렸어요');
  assert.equal(effectPhrase(1), '조금 올렸어요');
  assert.equal(effectPhrase(0), '움직이지 않았어요');
  assert.equal(effectPhrase(-1), '조금 낮췄어요');
  assert.equal(effectPhrase(-2), '낮췄어요');
});

test('합·충을 분야 원인으로 쓰지 않는다: 분야 기본 문장·PLAY·상세 의미에 합/충 없음', () => {
  for (const { ex } of SAMPLES) for (const a of ex.areas) {
    for (const t of [a.basis, a.action, a.meaning]) assert(!/합|충/.test(t), t);
  }
  for (const t of [...Object.values(AREA_MEANING).flat(), ...Object.values(AREA_ACTION).flat()]) {
    assert(!/합|충|점수|올렸|낮췄/.test(t), t);
  }
});

test('계산하지 않는 명리 요소·단정 표현·지출/투자 유도를 쓰지 않는다', () => {
  const banned = /용신|희신|기신|격국|신강|신약|운성|대운|세운|지지형|지지파|지지해|삼형|반드시|돈이 들어옵니다|연인이 생깁니다|성사됩니다|사고가 납니다|건강이 나빠|병이|질병|수익 보장|투자하|대출|주식|코인|구매하기|사기|진단/;
  const texts = [...Object.values(TEN_GOD_PLAIN), ...Object.values(CONTACT_PLAIN), ...Object.values(AREA_MEANING).flat(), ...Object.values(AREA_ACTION).flat()];
  for (const { ex } of SAMPLES.slice(0, 200)) texts.push(...ex.summary.tenGodLines, ...ex.summary.contactLines, ...ex.relationLines, ex.scoringNote, ...ex.areas.flatMap((a) => [a.basis, a.action, a.meaning]), ...ex.excluded.map((e) => e.reason));
  for (const t of texts) assert(!banned.test(t), t);
  assert.equal(new Set(Object.values(AREA_ACTION).flat()).size, 50, '행동 50개 모두 다름');
  assert.equal(Object.keys(TEN_GOD_PLAIN).length, 10);
  assert(CONTACT_PLAIN.clash.includes('나쁜 일을 뜻하지는 않아요'));
});

test('기존 dailyCopy 결과는 V2 설명 추가 후에도 그대로', () => {
  const s = chart('1990-05-15', '14:20');
  const r = dailyReading(s, '2026-10-06')!;
  assert.equal(r.score, 64);
  assert.deepEqual(r.areas.map((a) => a.score), [64, 62, 72, 58, 66]);
  const before = JSON.stringify(dailyCopy(r, s.dayMaster!.stem));
  dailyExplain(r, s);
  assert.equal(JSON.stringify(dailyCopy(r, s.dayMaster!.stem)), before);
});

test('/today V2 본문은 합충을 특정 분야에 배정하지 않고 공통 근거와 실제 점수는 보존한다', () => {
  for (const {s,r} of SAMPLES) {
    const before=JSON.stringify(r);
    const copy=dailyCopy(r,s.dayMaster!.stem,{commonContactsOnly:true});
    assert(copy.areas.every(a=>!a.meaning.contactFocus));
    assert.deepEqual(copy.areas.map(a=>a.score),r.areas.map(a=>a.score));
    assert.equal(copy.evidence.adjustment,r.adjustment);
    assert.equal(copy.evidence.labels.length,r.contacts.length);
    const withoutContacts={...r,contacts:[]};
    assert.deepEqual(copy.areas.map(a=>a.text),dailyCopy(withoutContacts,s.dayMaster!.stem,{commonContactsOnly:true}).areas.map(a=>a.text));
    assert.equal(JSON.stringify(r),before);
    assert.deepEqual(copy,dailyCopy(r,s.dayMaster!.stem,{commonContactsOnly:true}));
  }
});
