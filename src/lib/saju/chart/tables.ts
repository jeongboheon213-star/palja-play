// 기본 사주 데이터용 고정 표 (지장간, 오행 생극, 12운성 시작점).
// 표준 명리 표를 옮긴 것이며 외부 대조·전문가 검토 전이다 (verification.ts 참고).

import { branchIndex, stemIndex } from "../ganji";
import { ELEMENTS, type Branch, type Element, type Stem } from "../types";

/**
 * 지장간: [여기, 중기, 정기(본기)] 순. 길이 2인 지지는 [여기, 정기].
 * 정기(마지막 값)를 지지의 대표 천간으로 쓴다.
 */
export const HIDDEN_STEMS: Readonly<Record<string, readonly Stem[]>> = Object.freeze({
  자: Object.freeze(["임", "계"] as Stem[]),
  축: Object.freeze(["계", "신", "기"] as Stem[]),
  인: Object.freeze(["무", "병", "갑"] as Stem[]),
  묘: Object.freeze(["갑", "을"] as Stem[]),
  진: Object.freeze(["을", "계", "무"] as Stem[]),
  사: Object.freeze(["무", "경", "병"] as Stem[]),
  오: Object.freeze(["병", "기", "정"] as Stem[]),
  미: Object.freeze(["정", "을", "기"] as Stem[]),
  // 지지 신(申). 천간 신(辛)과 한글 표기가 같지만 이 표는 지지 기준이다.
  신: Object.freeze(["무", "임", "경"] as Stem[]),
  유: Object.freeze(["경", "신"] as Stem[]),
  술: Object.freeze(["신", "정", "무"] as Stem[]),
  해: Object.freeze(["무", "갑", "임"] as Stem[]),
});

export function hiddenStemsOf(b: Branch): readonly Stem[] {
  return HIDDEN_STEMS[b] as readonly Stem[];
}

/** 지지의 대표 천간(정기) */
export function mainHiddenStem(b: Branch): Stem {
  const h = hiddenStemsOf(b);
  return h[h.length - 1] as Stem;
}

/** 오행 순서: 목 → 화 → 토 → 금 → 수 (상생 순) */
export function elementIndex(e: Element): number {
  return ELEMENTS.indexOf(e);
}

/** a 가 b 를 생한다 (목→화→토→금→수→목) */
export function generates(a: Element, b: Element): boolean {
  return (elementIndex(a) + 1) % 5 === elementIndex(b);
}

/** a 가 b 를 극한다 (목→토→수→화→금→목) */
export function controls(a: Element, b: Element): boolean {
  return (elementIndex(a) + 2) % 5 === elementIndex(b);
}

/** 12운성 장생 지지 (일간별). 양간 순행, 음간 역행. */
export const TWELVE_STAGE_START: Readonly<Record<Stem, Branch>> = Object.freeze({
  갑: "해", 을: "오", 병: "인", 정: "유", 무: "인", 기: "유", 경: "사", 신: "자", 임: "신", 계: "묘",
});

export function isYangStem(s: Stem): boolean {
  return stemIndex(s) % 2 === 0;
}

export { branchIndex };
