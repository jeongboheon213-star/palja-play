// 조립 지점: 교체 가능한 구현을 고르는 유일한 곳.
import { createKrTimeNormalizer } from "../saju/timeNormalizer";
import { createAlphaSolarTermProvider } from "../saju/alphaSolarTermProvider";
import { ALPHA_POLICY, type Policy } from "../saju/policies";
import { calculateFourPillars, type FourPillarsResult } from "../saju/pillars";
import { buildSajuData, type SajuData } from "../saju/chart";
import type { CalculationErrorCode, CalculationResult, NormalizeOptions, TimeCandidate } from "../saju/providers";
import type { SajuInput } from "../saju/types";
import { buildFreeReading, buildPremiumPreviews, type FreeReading, type PremiumPreview, type PremiumProductSpec } from "../interpretation";
import { KR_TIME_HISTORY } from "../../data/saju/kr-time-history";
import { PRODUCTS, PREMIUM_PRODUCT_IDS, PREMIUM_COMING_SOON_MESSAGE, formatPriceKrw } from "../../data/products";

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

// ── Beta 결과 (FREE + PREMIUM 미리보기) ─────────────────────────

export const PREMIUM_SPECS: readonly PremiumProductSpec[] = Object.freeze(
  PREMIUM_PRODUCT_IDS.map((id) => {
    const p = PRODUCTS[id];
    return Object.freeze({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      subtitle: p.subtitle,
      priceKrw: p.priceKrw,
      priceLabel: formatPriceKrw(p.priceKrw),
      betaTestPrice: p.betaTestPrice,
      paymentEnabled: p.paymentEnabled,
      domains: p.domains,
      clickEvent: p.clickEvent,
      interestEvent: p.interestEvent,
      hook: p.hook,
      comingSoonMessage: PREMIUM_COMING_SOON_MESSAGE,
    });
  }),
);

export type BetaResult =
  | { readonly ok: true; readonly free: FreeReading; readonly premium: readonly PremiumPreview[]; readonly saju: SajuData }
  | {
      readonly ok: false;
      readonly code: CalculationErrorCode | "DAY_MASTER_UNAVAILABLE";
      readonly message: string;
      readonly candidates?: readonly TimeCandidate[];
    };

/**
 * 입력 검사를 통과한 SajuInput → SajuData → Signals → FREE + PREMIUM 미리보기.
 * saju 는 내부/디버그용이며 화면에 그대로 노출하지 않는다.
 */
export function computeBetaResult(input: SajuInput, options: NormalizeOptions = {}, policy: Policy = ALPHA_POLICY): BetaResult {
  const r = computeSaju(input, options, policy);
  if (!r.ok) return r.candidates ? { ok: false, code: r.code, message: r.message, candidates: r.candidates } : { ok: false, code: r.code, message: r.message };
  const free = buildFreeReading(r.data);
  if (!free.ok) return { ok: false, code: "DAY_MASTER_UNAVAILABLE", message: "출생 시간 없이는 일주를 하나로 정할 수 없어 결과를 만들 수 없어요." };
  return { ok: true, free: free.reading, premium: buildPremiumPreviews(free.signals, PREMIUM_SPECS), saju: r.data };
}
