// 천간·지지·60갑자 기본 표. 계산 규칙이 아니라 고정된 이름/순서 표다.

import { BRANCHES, STEMS, type Branch, type Element, type Pillar, type Stem } from "./types";

export const STEM_HANJA: Readonly<Record<Stem, string>> = Object.freeze({
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
});

/** 지지 "신"(申)은 천간 "신"(辛)과 한글이 같으므로 지지 쪽은 인덱스로 구분한다. */
export const BRANCH_HANJA: readonly string[] = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);

export const STEM_ELEMENT: Readonly<Record<Stem, Element>> = Object.freeze({
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
});

/** 지지 오행 (자축인묘진사오미신유술해 순서) */
export const BRANCH_ELEMENT: readonly Element[] = Object.freeze(["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"]);

export type YinYang = "yang" | "yin";

export function stemIndex(s: Stem): number {
  return STEMS.indexOf(s);
}

export function branchIndex(b: Branch): number {
  return BRANCHES.indexOf(b);
}

export function stemAt(i: number): Stem {
  return STEMS[((i % 10) + 10) % 10] as Stem;
}

export function branchAt(i: number): Branch {
  return BRANCHES[((i % 12) + 12) % 12] as Branch;
}

export function stemYinYang(s: Stem): YinYang {
  return stemIndex(s) % 2 === 0 ? "yang" : "yin";
}

/** 60갑자 순번(0 = 갑자) → 기둥 */
export function pillarFromCycleIndex(i: number): Pillar {
  const k = ((i % 60) + 60) % 60;
  return Object.freeze({ stem: stemAt(k), branch: branchAt(k) });
}

/** 기둥 → 60갑자 순번. 천간·지지의 음양이 다르면(존재하지 않는 조합) null. */
export function cycleIndexOf(p: Pillar): number | null {
  const s = stemIndex(p.stem);
  const b = branchIndex(p.branch);
  for (let k = 0; k < 60; k++) if (k % 10 === s && k % 12 === b) return k;
  return null;
}

export function ganjiKo(p: Pillar): string {
  return `${p.stem}${p.branch}`;
}

export function ganjiHanja(p: Pillar): string {
  return `${STEM_HANJA[p.stem]}${BRANCH_HANJA[branchIndex(p.branch)]}`;
}

export function pillarEquals(a: Pillar | null, b: Pillar | null): boolean {
  return a !== null && b !== null && a.stem === b.stem && a.branch === b.branch;
}
