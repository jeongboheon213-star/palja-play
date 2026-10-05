// PREMIUM 정식 리포트 생성 (서버 전용). 결제가 서버에서 승인된 뒤에만 호출한다.
// 입력은 Signal id 목록뿐 (생년월일 없음). 결정적: 같은 입력이면 같은 리포트.
//
// 상품별 제공 내용 (2,900원)
//  1. 나의 패턴 한눈에 보기 : 이 영역의 근거 Signal 을 한 단어 라벨로 요약
//  2. WHY  왜 이런 패턴인가  : 근거마다 기본 설명 + 구조 심화 설명 (FREE 미리보기 1줄을 넘어서는 내용)
//  3. HOW  어떻게 활용할까   : 근거마다 실천 3가지
//  4. 반전 포인트 심층       : 같은 영역에 반대 방향 근거가 함께 있을 때만
//  5. 나만의 실천 체크리스트 : HOW 중 우선순위 5개
//  WHEN(시기)은 포함하지 않는다.

import { PRODUCTS, type ProductId } from "../../data/products";
import { PREMIUM_COPY } from "../../lib/interpretation/copy/premiumCopy";
import { productDomains, type PaidProductId } from "../payments/service";
import { DETAIL_COPY } from "./detailCopy";
import { withJosa } from "../../lib/battle/battle";

export interface PremiumReport {
  readonly productId: PaidProductId;
  readonly title: string;
  readonly summary: readonly string[];
  readonly why: readonly { readonly label: string; readonly text: string; readonly detail: string }[];
  readonly how: readonly { readonly label: string; readonly steps: readonly string[] }[];
  readonly reversal: string | null;
  readonly checklist: readonly string[];
  readonly notIncluded: readonly string[];
}

/** 주의(negative) 방향 근거. src/lib/interpretation/signals.ts 의 polarity 와 일치해야 한다 (테스트로 확인) */
export const NEGATIVE_SIGNAL_IDS: ReadonlySet<string> = new Set([
  "wealth.jae.none", "wealth.bigeop_outflow", "wealth.inseong_slow",
  "love.star.none", "love.star.crowded", "love.daybranch.clash", "love.bigeop_pride",
  "career.gwan.none", "career.gwan.pressure",
  "business.siksang.none", "business.overload", "business.slow_start",
]);
const isNegative = (id: string) => NEGATIVE_SIGNAL_IDS.has(id);
/** '라벨' + 조사 (조사는 따옴표가 아니라 라벨 마지막 글자 기준) */
const quoted = (label: string, pair: "와/과" | "이/가") => `'${label}'${withJosa(label, pair).slice(label.length)}`;

export function buildPremiumReport(productId: PaidProductId, signalIds: readonly string[]): PremiumReport {
  const domains = productDomains(productId);
  // 상품 영역의 근거만, 문구 정의가 있는 것만, 정해진 순서(문구 표 순서)로
  const order = Object.keys(DETAIL_COPY);
  const ids = order.filter((id) => signalIds.includes(id) && domains.includes(id.split(".")[0]!) && PREMIUM_COPY[id]);
  const why = ids.map((id) => ({ label: DETAIL_COPY[id]!.label, text: PREMIUM_COPY[id]!.why ?? "", detail: DETAIL_COPY[id]!.whyDetail }));
  const how = ids.map((id) => ({ label: DETAIL_COPY[id]!.label, steps: [...DETAIL_COPY[id]!.howSteps] }));
  const pos = ids.filter((id) => !isNegative(id));
  const neg = ids.filter((id) => isNegative(id));
  const reversal =
    pos.length > 0 && neg.length > 0
      ? `당신에게는 ${quoted(DETAIL_COPY[pos[0]!]!.label, "와/과")} ${quoted(DETAIL_COPY[neg[0]!]!.label, "이/가")} 함께 있어요. 같은 영역 안에서 서로 다른 방향의 힘이 작동하기 때문에, 한쪽만 보고 판단하면 스스로도 헷갈릴 수 있어요. 강점 쪽 힘을 쓰면서 아래 HOW 의 '${DETAIL_COPY[neg[0]!]!.label}' 실천을 함께 챙기면 균형이 잡혀요.`
      : null;
  // 체크리스트: 주의(반대 방향) 근거의 첫 실천을 먼저, 그다음 강점 근거의 첫 실천, 나머지 순서대로 최대 5개
  const firsts = [...neg, ...pos].map((id) => DETAIL_COPY[id]!.howSteps[0]);
  const rest = ids.flatMap((id) => DETAIL_COPY[id]!.howSteps.slice(1));
  const checklist = Array.from(new Set([...firsts, ...rest])).slice(0, 5);
  return Object.freeze({
    productId,
    title: PRODUCTS[productId as ProductId].name,
    summary: ids.map((id) => DETAIL_COPY[id]!.label),
    why,
    how,
    reversal,
    checklist,
    notIncluded: ["시기(대운·세운)별 흐름은 계산 엔진 준비 전이라 이 리포트에 포함되지 않아요."],
  });
}
