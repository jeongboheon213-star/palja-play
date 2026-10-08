// 오늘운세 계산 결과 기준선(BEFORE) 만들기 → tests/fixtures/today-v2-baseline.json
// 계산 엔진을 바꾸지 않았음을 증명하기 위한 고정 데이터. V2(c23411c) 시점에서 한 번 생성했다.
//   npx tsx scripts/today-baseline.ts
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { computeSaju } from '../src/lib/engine';
import { dailyReading } from '../src/lib/daily/reading';
import { dailyCopy } from '../web/src/dailyCopy';

export const BASELINE_BIRTHS = Array.from({ length: 12 }, (_, i) => new Date(Date.parse('1990-05-15T00:00:00Z') + i * 86400000).toISOString().slice(0, 10))
  .concat(['1963-01-15', '1978-03-15', '1985-02-15', '2001-12-31', '1972-07-07']);
export const BASELINE_TIMES = ['14:20', '00:30', null] as const;
export const BASELINE_DATES = Array.from({ length: 60 }, (_, i) => new Date(Date.parse('2026-10-01T00:00:00Z') + i * 86400000).toISOString().slice(0, 10));

export function baselineRows() {
  const rows: unknown[] = [];
  for (const b of BASELINE_BIRTHS) for (const t of BASELINE_TIMES) {
    const c = computeSaju({ birthDate: b, birthTime: t, gender: 'male', calendar: 'solar', birthCountry: 'KR' });
    if (!c.ok) { rows.push([b, t, 'ERR']); continue; }
    for (const d of BASELINE_DATES) {
      const r = dailyReading(c.data, d);
      if (!r) { rows.push([b, t, d, null]); continue; }
      const copy = createHash('sha256').update(JSON.stringify(dailyCopy(r, c.data.dayMaster!.stem))).digest('hex').slice(0, 16);
      rows.push([b, t, d, r.ganji, r.stemRelation, r.branchRelation, r.contacts.map((x) => `${x.position}:${x.kind}`), r.adjustment, r.areas.map((a) => a.score), r.areas.map((a) => a.weights), r.score, r.tier, copy]);
    }
  }
  return rows;
}

if (process.argv[1]?.endsWith('today-baseline.ts')) {
  mkdirSync('tests/fixtures', { recursive: true });
  const rows = baselineRows();
  writeFileSync('tests/fixtures/today-v2-baseline.json', JSON.stringify({ createdFrom: 'claude/today-v2 c23411c (V2 Preview)', rows }) + '\n');
  console.log('rows', rows.length);
}
