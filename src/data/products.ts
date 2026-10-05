// 상품 설정. Beta 기간에는 실제 결제를 하지 않는다.
// 가격은 구매 의향 측정용 Beta 테스트 값이며 확정 가격이 아니다 (betaTestPrice = true).

import type { EventName } from "../lib/analytics/events";

export type ProductId = "free_result" | "premium_money" | "premium_love" | "premium_career";
export type ReportDomain = "wealth" | "love" | "career" | "business";

export interface Product {
  readonly id: ProductId;
  readonly name: string;
  readonly tier: "free" | "premium";
  readonly priceKrw: number;
  /** true 면 Beta 테스트 가격 (확정 가격 아님) */
  readonly betaTestPrice: boolean;
  /** Beta 에서는 항상 false. 결제 연동 없음 */
  readonly paymentEnabled: false;
  /** FREE 는 WHAT, PREMIUM 은 WHY / HOW / WHEN */
  readonly axes: readonly ("what" | "why" | "how" | "when")[];
  /** 이 리포트가 다루는 해석 영역 */
  readonly domains: readonly ReportDomain[];
  /** 버튼 클릭 시 기록할 이벤트 (구매 의향 측정) */
  readonly clickEvent: EventName | null;
  /** "나오면 보고 싶어요" 버튼 이벤트 (단순 클릭과 실제 관심 구분) */
  readonly interestEvent: EventName | null;
  /** 카드에 쓰는 질문형 문구 (확정 약속이 아니라 질문) */
  readonly hook: string;
  readonly emoji: string;
  readonly subtitle: string;
}

/** 결제 대신 보여줄 문구 */
export const PREMIUM_COMING_SOON_MESSAGE = "팔자PLAY Beta에서 준비 중인 기능입니다.";

export const PRODUCTS: Readonly<Record<ProductId, Product>> = Object.freeze({
  free_result: Object.freeze({
    id: "free_result",
    name: "무료 캐릭터 카드",
    tier: "free",
    priceKrw: 0,
    betaTestPrice: false,
    paymentEnabled: false,
    axes: Object.freeze(["what"] as const),
    domains: Object.freeze(["wealth", "love", "career", "business"] as const),
    clickEvent: null,
    interestEvent: null,
    hook: "",
    emoji: "🎴",
    subtitle: "나는 어떤 사람인가",
  }),
  premium_money: Object.freeze({
    id: "premium_money",
    name: "재물 심층 리포트",
    tier: "premium",
    priceKrw: 4900,
    betaTestPrice: true,
    paymentEnabled: false,
    axes: Object.freeze(["why", "how", "when"] as const),
    domains: Object.freeze(["wealth"] as const),
    clickEvent: "premium_money_click",
    interestEvent: "premium_money_interest",
    hook: "왜 돈이 들어오고 나가는 패턴이 반복될까?",
    emoji: "💰",
    subtitle: "돈이 들어오고 나가는 패턴",
  }),
  premium_love: Object.freeze({
    id: "premium_love",
    name: "연애 심층 리포트",
    tier: "premium",
    priceKrw: 4900,
    betaTestPrice: true,
    paymentEnabled: false,
    axes: Object.freeze(["why", "how", "when"] as const),
    domains: Object.freeze(["love"] as const),
    clickEvent: "premium_love_click",
    interestEvent: "premium_love_interest",
    hook: "왜 나는 이런 사람에게 끌릴까?",
    emoji: "💕",
    subtitle: "끌리는 사람과 관계의 패턴",
  }),
  premium_career: Object.freeze({
    id: "premium_career",
    name: "직업·사업 심층 리포트",
    tier: "premium",
    priceKrw: 4900,
    betaTestPrice: true,
    paymentEnabled: false,
    axes: Object.freeze(["why", "how", "when"] as const),
    domains: Object.freeze(["career", "business"] as const),
    clickEvent: "premium_career_click",
    interestEvent: "premium_career_interest",
    hook: "나는 조직형일까, 사업형일까?",
    emoji: "💼",
    subtitle: "일하는 방식과 커리어 패턴",
  }),
}) as Readonly<Record<ProductId, Product>>;

export const PREMIUM_PRODUCT_IDS: readonly ProductId[] = Object.freeze(["premium_money", "premium_love", "premium_career"]);

export function getProduct(id: ProductId): Product {
  return PRODUCTS[id];
}

export function formatPriceKrw(n: number): string {
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}
