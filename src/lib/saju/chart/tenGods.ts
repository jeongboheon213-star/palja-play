// 십성: 일간과 다른 천간의 오행 관계 + 음양 같음/다름.

import { STEM_ELEMENT } from "../ganji";
import type { Stem, TenGod } from "../types";
import { controls, generates, isYangStem } from "./tables";

export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

export const TEN_GOD_GROUP: Readonly<Record<TenGod, TenGodGroup>> = Object.freeze({
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
});

export function tenGodOf(dayStem: Stem, other: Stem): TenGod {
  const d = STEM_ELEMENT[dayStem];
  const o = STEM_ELEMENT[other];
  const same = isYangStem(dayStem) === isYangStem(other);
  if (d === o) return same ? "비견" : "겁재";
  if (generates(d, o)) return same ? "식신" : "상관";
  if (controls(d, o)) return same ? "편재" : "정재";
  if (controls(o, d)) return same ? "편관" : "정관";
  return same ? "편인" : "정인"; // generates(o, d)
}
