// 상품 설정. 가격은 임시값이며 결제는 모의(mock)다. 실제 결제 연동 없음.

export type ProductId = "free_result" | "premium_report";

export interface Product {
  readonly id: ProductId;
  readonly name: string;
  readonly tier: "free" | "premium";
  readonly priceKrw: number;
  /** true면 확정 가격이 아님 */
  readonly isPlaceholderPrice: boolean;
  readonly paymentMode: "none" | "mock";
  /** FREE는 WHAT, PREMIUM은 WHY/HOW/WHEN */
  readonly axes: readonly ("what" | "why" | "how" | "when")[];
}

export const PRODUCTS: Readonly<Record<ProductId, Product>> = Object.freeze({
  free_result: Object.freeze({
    id: "free_result",
    name: "무료 캐릭터 카드",
    tier: "free",
    priceKrw: 0,
    isPlaceholderPrice: false,
    paymentMode: "none",
    axes: Object.freeze(["what"] as const),
  }),
  premium_report: Object.freeze({
    id: "premium_report",
    name: "프리미엄 리포트",
    tier: "premium",
    priceKrw: 4900,
    isPlaceholderPrice: true,
    paymentMode: "mock",
    axes: Object.freeze(["why", "how", "when"] as const),
  }),
}) as Readonly<Record<ProductId, Product>>;

export function getProduct(id: ProductId): Product {
  return PRODUCTS[id];
}
