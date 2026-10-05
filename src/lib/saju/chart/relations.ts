// 합·충·형·해·파·삼합·방합. confirmed 기둥끼리만 본다 (uncertain 기둥은 후보를 고르지 않으므로 제외).

import { branchIndex, stemIndex } from "../ganji";
import type { Branch, PillarPosition, Relation, RelationKind, Stem } from "../types";

export interface PositionedPillar {
  readonly position: PillarPosition;
  readonly stem: Stem;
  readonly branch: Branch;
}

const ORDER: readonly PillarPosition[] = ["year", "month", "day", "hour"];

/** 천간합: 갑기·을경·병신·정임·무계 (순번 차 5) */
function stemCombine(a: Stem, b: Stem): boolean {
  return Math.abs(stemIndex(a) - stemIndex(b)) === 5;
}

/** 천간충: 갑경·을신·병임·정계 (무·기는 충 없음) */
function stemClash(a: Stem, b: Stem): boolean {
  const [x, y] = [stemIndex(a), stemIndex(b)].sort((p, q) => p - q) as [number, number];
  return y - x === 6 && x <= 3;
}

/** 지지육합: 자축·인해·묘술·진유·사신·오미 */
const branchCombine = (a: number, b: number) => (a + b) % 12 === 1;
/** 지지충: 순번 차 6 */
const branchClash = (a: number, b: number) => Math.abs(a - b) === 6;
/** 지지해: 자미·축오·인사·묘진·신해·유술 */
const branchHarm = (a: number, b: number) => (a + b) % 12 === 7;
/** 지지파: 자유·묘오·진축·미술·인해·사신 */
const BREAK_PAIRS: readonly (readonly [number, number])[] = [[0, 9], [3, 6], [4, 1], [7, 10], [2, 11], [5, 8]];
const branchBreak = (a: number, b: number) => BREAK_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** 형: 자묘 상형, 자형(진진·오오·유유·해해) */
const SELF_PUNISH = new Set([4, 6, 9, 11]);
const branchPunishPair = (a: number, b: number) => (a === 0 && b === 3) || (a === 3 && b === 0) || (a === b && SELF_PUNISH.has(a));
/** 삼형 묶음: 인사신, 축술미 (둘 이상 있으면 형으로 기록, 셋이면 완전) */
const PUNISH_SETS: readonly (readonly number[])[] = [[2, 5, 8], [1, 10, 7]];

/** 삼합: 신자진(수)·해묘미(목)·인오술(화)·사유축(금). 가운데가 왕지 */
const TRIPLE_SETS: readonly (readonly [number, number, number])[] = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
/** 방합: 인묘진·사오미·신유술·해자축 */
const SEASON_SETS: readonly (readonly number[])[] = [[2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 0, 1]];

function rel(kind: RelationKind, items: readonly { position: PillarPosition; member: Stem | Branch }[]): Relation {
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.position) - ORDER.indexOf(b.position));
  return Object.freeze({
    kind,
    positions: Object.freeze(sorted.map((i) => i.position)),
    members: Object.freeze(sorted.map((i) => i.member)),
  });
}

export function findRelations(pillars: readonly PositionedPillar[]): readonly Relation[] {
  const ps = [...pillars].sort((a, b) => ORDER.indexOf(a.position) - ORDER.indexOf(b.position));
  const out: Relation[] = [];

  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i]!;
      const b = ps[j]!;
      const s = [{ position: a.position, member: a.stem }, { position: b.position, member: b.stem }];
      if (stemCombine(a.stem, b.stem)) out.push(rel("천간합", s));
      if (stemClash(a.stem, b.stem)) out.push(rel("천간충", s));

      const x = branchIndex(a.branch);
      const y = branchIndex(b.branch);
      const br = [{ position: a.position, member: a.branch }, { position: b.position, member: b.branch }];
      if (branchCombine(x, y)) out.push(rel("지지육합", br));
      if (branchClash(x, y)) out.push(rel("지지충", br));
      if (branchHarm(x, y)) out.push(rel("지지해", br));
      if (branchBreak(x, y)) out.push(rel("지지파", br));
      if (branchPunishPair(x, y)) out.push(rel("지지형", br));
    }
  }

  const byBranch = (set: readonly number[]) => ps.filter((p) => set.includes(branchIndex(p.branch)));
  const distinct = (list: readonly PositionedPillar[]) => new Set(list.map((p) => branchIndex(p.branch))).size;
  const toItems = (list: readonly PositionedPillar[]) => list.map((p) => ({ position: p.position, member: p.branch as Stem | Branch }));

  for (const set of PUNISH_SETS) {
    const hit = byBranch(set);
    if (distinct(hit) >= 2) out.push(rel("지지형", toItems(hit)));
  }
  for (const set of TRIPLE_SETS) {
    const hit = byBranch(set);
    const d = distinct(hit);
    if (d === 3) out.push(rel("삼합", toItems(hit)));
    // 반합: 왕지(가운데)를 포함한 두 글자
    else if (d === 2 && hit.some((p) => branchIndex(p.branch) === set[1])) out.push(rel("반합", toItems(hit)));
  }
  for (const set of SEASON_SETS) {
    const hit = byBranch(set);
    if (distinct(hit) === 3) out.push(rel("방합", toItems(hit)));
  }
  return Object.freeze(out);
}
