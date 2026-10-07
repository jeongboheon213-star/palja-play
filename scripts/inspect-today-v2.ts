// 오늘운세 V2 대표 명식 비교표 → docs/TODAY_V2_SAMPLES.md
//   npx tsx scripts/inspect-today-v2.ts
import { writeFileSync } from 'node:fs';
import { computeSaju } from '../src/lib/engine';
import { dailyReading } from '../src/lib/daily/reading';
import { dailyExplain } from '../src/lib/daily/explain';
import { dailyCopy } from '../web/src/dailyCopy';

type G = 'male' | 'female';
const POS = { year: '연', month: '월', day: '일', hour: '시' } as const;
const iso = (base: string, plus: number) => new Date(Date.parse(base + 'T00:00:00Z') + plus * 86400000).toISOString().slice(0, 10);

function row(label: string, birthDate: string, birthTime: string | null, gender: G, date: string) {
  const c = computeSaju({ birthDate, birthTime, gender, calendar: 'solar', birthCountry: 'KR' });
  if (!c.ok) return `| ${label} | 계산 불가 |`;
  const s = c.data;
  const r = dailyReading(s, date);
  if (!r) return `| ${label} | ${birthDate} | 일주 미확정 → 오늘운세 생성 안 함 |`;
  const ex = dailyExplain(r, s)!;
  const copy = dailyCopy(r, s.dayMaster!.stem);
  const natal = (['year', 'month', 'day', 'hour'] as const).map((p) => {
    const x = s.pillars[p];
    return x?.pillar ? `${POS[p]}:${x.pillar.stem}${x.pillar.branch}${x.confidence === 'confirmed' ? '' : '?'}` : `${POS[p]}:—`;
  }).join(' ');
  const contacts = r.contacts.map((x) => `${POS[x.position]}${x.kind}`).join(', ') || '없음';
  const money = ex.areas[0]!;
  return `| ${label} | ${birthDate} ${birthTime ?? '시간모름'} ${gender === 'male' ? '남' : '여'} | 일간 ${s.dayMaster!.stem} · ${natal} | ${date} ${r.ganji} | ${r.stemRelation} | ${r.branchRelation} | ${contacts} (보정 ${r.adjustment}) | ${r.areas.map((a) => a.score).join('/')} · ${r.score} ${r.tier} | ${ex.signals.map((x) => x.chip).join(' · ')} | ${copy.areas[0]!.headline} / ${money.why} / 🎯 ${money.action} / ${money.breakdown.map((b) => `${b.label} ${b.value}`).join(' ')} |`;
}

const head = '| 구분 | 명식 | 원국 핵심 | 오늘 일진 | 천간 십신 | 지지 십신 | 합·충 | 5분야 점수(재/애/직/관/컨) · 총점 | 표시 신호 | 재물운 최종 문장 (핵심 / 근거 / PLAY / 계산식) |\n|---|---|---|---|---|---|---|---|---|---|';
const rows: string[] = [];
const DATE = '2026-10-08';
rows.push(row('대표 샘플', '1990-05-15', '14:20', 'male', DATE));
rows.push(row('대표 샘플 · 여', '1990-05-15', '14:20', 'female', DATE));
rows.push(row('대표 샘플 · 시간모름', '1990-05-15', null, 'male', DATE));
for (let i = 1; i < 10; i++) rows.push(row(`일간 ${i + 1}/10`, iso('1990-05-15', i), i % 2 ? '08:30' : null, i % 3 ? 'female' : 'male', DATE));

// 대표 명식으로 합만 / 충만 / 합·충 없음 / 합+충 날짜 찾기 (2026-10-01부터 60일)
const c = computeSaju({ birthDate: '1990-05-15', birthTime: '14:20', gender: 'male', calendar: 'solar', birthCountry: 'KR' });
if (c.ok) {
  const want = { 합만: (k: string[]) => k.length > 0 && k.every((x) => x.endsWith('합')), 충만: (k: string[]) => k.length > 0 && k.every((x) => x.endsWith('충')), '합·충 없음': (k: string[]) => k.length === 0, '합+충': (k: string[]) => k.some((x) => x.endsWith('합')) && k.some((x) => x.endsWith('충')) };
  for (const [label, ok] of Object.entries(want)) {
    for (let d = 0; d < 60; d++) {
      const date = iso('2026-10-01', d);
      const r = dailyReading(c.data, date)!;
      if (ok(r.contacts.map((x) => x.kind))) { rows.push(row(`대표 · ${label}`, '1990-05-15', '14:20', 'male', date)); break; }
    }
  }
}

const md = `# 오늘운세 V2 대표 명식 비교 (자동 생성)\n\n\`npx tsx scripts/inspect-today-v2.ts\` 로 다시 만들 수 있다. 원국 기둥 뒤 ? 는 미확정(비교 제외). 성별은 오늘운세 계산에 쓰이지 않는다.\n\n${head}\n${rows.join('\n')}\n`;
writeFileSync('docs/TODAY_V2_SAMPLES.md', md);
console.log(md);
