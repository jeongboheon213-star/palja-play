// 12운성 (일간 기준). 규칙 검증 전(rule = unverified)이며 Signals/해석에 연결하지 않는다.

import { TWELVE_STAGES, type Branch, type Stem, type TwelveStage } from "../types";
import { branchIndex, isYangStem, TWELVE_STAGE_START } from "./tables";

export function twelveStageOf(dayStem: Stem, b: Branch): TwelveStage {
  const start = branchIndex(TWELVE_STAGE_START[dayStem]);
  const x = branchIndex(b);
  const k = isYangStem(dayStem) ? (x - start + 12) % 12 : (start - x + 12) % 12;
  return TWELVE_STAGES[k] as TwelveStage;
}
