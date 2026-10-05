// PREMIUM 미리보기. FREE(WHAT)와 구조를 나눈다: WHY(왜) / HOW(어떻게) / WHEN(언제).
// Beta 에서는 결제하지 않는다. 미리보기 한 줄씩만 보여 주고, 잠긴 항목 수는 실제 근거 Signal 수로만 센다.
// WHEN 은 대운·세운 계산이 없으므로 항상 "준비 중" (가짜 시기 금지).

import type { Domain, Signal } from "./types";
import type { ReadingItem } from "./free";
import type { SignalSet } from "./signals";
import { PREMIUM_COPY, WHEN_PREPARING } from "./copy/premiumCopy";

/** 해석 계층이 필요로 하는 상품 정보 (설정 파일 형식과 분리) */
export interface PremiumProductSpec {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly subtitle: string;
  readonly priceKrw: number;
  readonly priceLabel: string;
  readonly betaTestPrice: boolean;
  readonly paymentEnabled: false;
  readonly domains: readonly Domain[];
  readonly clickEvent: string | null;
  readonly comingSoonMessage: string;
}

export interface PremiumAxisPreview {
  readonly axis: "why" | "how";
  readonly status: "preview" | "preparing";
  /** 미리 보여 주는 한 줄 (Signal 근거). 근거가 없으면 null */
  readonly teaser: (ReadingItem & { readonly evidence: string }) | null;
  /** 정식 리포트에서 열릴 항목 수 (실제 근거 Signal 기준) */
  readonly lockedCount: number;
}

export interface PremiumPreview {
  readonly product: PremiumProductSpec;
  readonly why: PremiumAxisPreview;
  readonly how: PremiumAxisPreview;
  readonly when: { readonly axis: "when"; readonly status: "preparing"; readonly message: string; readonly reason: string };
}

const byStrength = (list: readonly Signal[]) => [...list].map((s, i) => ({ s, i })).sort((a, b) => b.s.strength - a.s.strength || a.i - b.i).map((x) => x.s);

function axisPreview(axis: "why" | "how", signals: readonly Signal[]): PremiumAxisPreview {
  const usable = signals.filter((s) => PREMIUM_COPY[s.id]?.[axis]);
  const first = usable[0];
  if (!first) return Object.freeze({ axis, status: "preparing", teaser: null, lockedCount: 0 });
  return Object.freeze({
    axis,
    status: "preview",
    teaser: Object.freeze({ text: PREMIUM_COPY[first.id]![axis]!, signalIds: Object.freeze([first.id]), evidence: first.evidence.map((e) => e.detail).join(" / ") }),
    lockedCount: usable.length - 1,
  });
}

export function buildPremiumPreviews(set: SignalSet, products: readonly PremiumProductSpec[]): readonly PremiumPreview[] {
  return Object.freeze(
    products.map((product) => {
      const inDomain = byStrength(set.signals.filter((s) => product.domains.includes(s.domain)));
      return Object.freeze({
        product,
        why: axisPreview("why", inDomain),
        how: axisPreview("how", inDomain),
        when: Object.freeze({ axis: "when" as const, status: "preparing" as const, message: WHEN_PREPARING.message, reason: WHEN_PREPARING.reason }),
      });
    }),
  );
}
