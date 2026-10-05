// 조립 지점: 교체 가능한 구현을 고르는 유일한 곳.
import { createKrTimeNormalizer } from "../saju/timeNormalizer";
import { createAlphaSolarTermProvider } from "../saju/alphaSolarTermProvider";
import { ALPHA_POLICY, type Policy } from "../saju/policies";
import { calculateFourPillars, type FourPillarsResult } from "../saju/pillars";
import { buildSajuData } from "../saju/chart";
import type { CalculationResult, NormalizeOptions } from "../saju/providers";
import type { SajuInput } from "../saju/types";
import { KR_TIME_HISTORY } from "../../data/saju/kr-time-history";

export const defaultTimeNormalizer = createKrTimeNormalizer(KR_TIME_HISTORY);

export const defaultSolarTermProvider = createAlphaSolarTermProvider({ boundaryWarning: ALPHA_POLICY.solarTerm.boundaryWarning });

/** 기본 구성(Alpha 정책, AlphaSolarTermProvider)으로 네 기둥을 계산한다. */
export function computeFourPillars(input: SajuInput, options: NormalizeOptions = {}, policy: Policy = ALPHA_POLICY): FourPillarsResult {
  return calculateFourPillars(input, { normalizer: defaultTimeNormalizer, solarTermProvider: defaultSolarTermProvider, policy }, options);
}

/** 네 기둥 + 기본 사주 데이터(SajuData). 해석은 하지 않는다. */
export function computeSaju(input: SajuInput, options: NormalizeOptions = {}, policy: Policy = ALPHA_POLICY): CalculationResult {
  const four = computeFourPillars(input, options, policy);
  if (!four.ok) {
    return four.candidates
      ? { ok: false, code: four.code, message: four.message, candidates: four.candidates }
      : { ok: false, code: four.code, message: four.message };
  }
  return { ok: true, data: buildSajuData(input, policy, four) };
}
