// 엔진 결과 → 화면용 데이터. 개발자 용어(boundaryRisk, confidence 등)를 자연어로 바꾼다.
// DOM 을 다루지 않는 순수 함수라 Node 테스트로 검사할 수 있다.

import type { FreeReading, PillarDisplay } from "../interpretation/free";
import type { PremiumPreview } from "../interpretation/premium";
import { BETA_DISCLAIMER, NOTICE_TEXT, SCORE_DISCLAIMER } from "../interpretation/notices";
import type { Domain } from "../interpretation/types";
import type { Element } from "../saju/types";
import { displayStatLabel, shareCardData, type ShareCardData } from "../share/share";

export interface StatView {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** 10칸 게임 스탯 막대 중 채워진 칸 수 */
  readonly filled: number;
}

export interface ElementView {
  readonly element: Element;
  readonly hanja: string;
  readonly count: number;
  readonly tone: "many" | "normal" | "none";
}

export interface PillarView {
  readonly label: string;
  readonly main: string;
  readonly sub: string;
}

export interface PremiumCardView {
  readonly productId: string;
  readonly emoji: string;
  readonly name: string;
  readonly hook: string;
  readonly priceLabel: string;
  readonly priceNote: string;
  readonly whyTeaser: string | null;
  readonly howTeaser: string | null;
  readonly lockedCount: number;
  readonly whenText: string;
  readonly clickEvent: string | null;
  readonly interestEvent: string | null;
}

export interface ResultView {
  readonly character: { readonly emoji: string; readonly name: string; readonly tagline: string; readonly elementLabel: string };
  readonly notices: readonly string[];
  readonly coreTraits: readonly string[];
  readonly stats: readonly StatView[];
  readonly statsNotes: readonly string[];
  readonly strengths: readonly string[];
  readonly cautions: readonly string[];
  readonly elements: readonly ElementView[];
  readonly elementSummary: readonly string[];
  readonly elementNote: string | null;
  readonly pillars: readonly PillarView[];
  readonly sections: readonly { readonly domain: string; readonly title: string; readonly summary: string; readonly paragraphs: readonly string[]; readonly productLabel: string | null }[];
  readonly reversals: readonly { readonly title: string; readonly text: string }[];
  readonly keywords: readonly string[];
  readonly evidence: readonly { readonly domain: string; readonly title: string; readonly facts: readonly string[] }[];
  readonly premium: readonly PremiumCardView[];
  readonly disclaimer: string;
  readonly share: ShareCardData;
}

const ELEMENT_HANJA: Readonly<Record<Element, string>> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const ELEMENT_NAME: Readonly<Record<Element, string>> = { 목: "나무", 화: "불", 토: "흙", 금: "쇠", 수: "물" };

const REVERSAL_TITLE: Readonly<Partial<Record<Domain, string>>> = {
  wealth: "돈 앞에서의 반전",
  love: "연애에서의 반전",
  career: "일할 때의 반전",
  business: "사업 감각의 반전",
  relationship: "사람 사이의 반전",
  execution: "실행력의 반전",
  flow: "기운의 반전",
};

const POSITION_NOTE: Readonly<Record<string, string>> = { year: "태어난 해", month: "태어난 달", day: "태어난 날", hour: "태어난 시간" };

function pillarView(p: PillarDisplay): PillarView {
  if (p.confidence === "confirmed" && p.ganji) return { label: p.label, main: p.ganji, sub: p.hanja ?? POSITION_NOTE[p.position] ?? "" };
  if (p.confidence === "uncertain") return { label: p.label, main: "?", sub: "절기 바뀌는 날" };
  return { label: p.label, main: "–", sub: p.position === "hour" ? "시간 미상" : "계산 불가" };
}

export function toResultView(free: FreeReading, premium: readonly PremiumPreview[]): ResultView {
  const notices: string[] = [];
  if (free.boundaryRisk) notices.push(NOTICE_TEXT.BOUNDARY_RISK);
  for (const n of free.notices) if (n.code !== "BOUNDARY_RISK") notices.push(n.text);

  const counts = free.fiveElements.counts;
  const elements: ElementView[] = (["목", "화", "토", "금", "수"] as const).map((e) => ({
    element: e,
    hanja: ELEMENT_HANJA[e],
    count: counts[e],
    tone: counts[e] === 0 ? "none" : counts[e] >= 3 ? "many" : "normal",
  }));
  const excluded = free.fiveElements.excludedPositions.filter((p) => p !== "hour" || free.notices.some((n) => n.code === "TIME_UNKNOWN"));

  return Object.freeze({
    character: {
      emoji: free.character.emoji,
      name: free.character.name,
      tagline: free.character.tagline,
      elementLabel: `${ELEMENT_NAME[free.character.element]}(${free.character.element}) 기운의 ${free.character.dayMaster}${free.character.dayMasterHanja} 일간`,
    },
    notices,
    coreTraits: free.coreTraits.map((t) => t.text),
    stats: free.scores.map((s) => ({ key: s.stat, label: displayStatLabel(s.stat, s.label), value: s.value, filled: Math.max(0, Math.min(10, Math.round(s.value / 10))) })),
    statsNotes: [SCORE_DISCLAIMER, "‘기본 운 밸런스’는 타고난 오행 균형으로 본 지표예요. 올해·이번 달 운세가 아니에요."],
    strengths: free.strengths.map((t) => t.text),
    cautions: free.cautions.map((t) => t.text),
    elements,
    elementSummary: free.fiveElements.summary.map((t) => t.text),
    elementNote: excluded.length > 0 ? `확정된 ${free.fiveElements.total}글자만으로 센 결과예요.` : null,
    pillars: free.pillars.map(pillarView),
    sections: free.sections.map((s) => {
      const product = premium.find(p => p.product.domains.includes(s.domain))?.product;
      return { domain: s.domain, title: s.title, summary: s.summary?.text ?? "", paragraphs: s.items.map((i) => i.text), productLabel: ["wealth", "love", "career"].includes(s.domain) && product ? `${product.name} · ${product.priceLabel}` : null };
    }),
    reversals: free.reversals.map((r) => ({ title: REVERSAL_TITLE[r.domain] ?? "반전 포인트", text: r.text })),
    keywords: free.displayKeywords.map((k) => k.text),
    evidence: free.evidence,
    premium: premium.map((p) => ({
      productId: p.product.id,
      emoji: p.product.emoji,
      name: p.product.name,
      hook: p.product.hook,
      priceLabel: p.product.priceLabel,
      priceNote: p.product.betaTestPrice ? "Beta 테스트 가격" : "",
      whyTeaser: p.why.teaser?.text ?? null,
      howTeaser: p.how.teaser?.text ?? null,
      // 같은 근거가 WHY·HOW 양쪽에 쓰이므로 추가 근거 수(WHY 기준)만 센다
      lockedCount: p.why.lockedCount,
      whenText: "언제 흐름이 강해지는지(시기)는 아직 준비 중이에요.",
      clickEvent: p.product.clickEvent,
      interestEvent: p.product.interestEvent,
    })),
    disclaimer: BETA_DISCLAIMER,
    share: shareCardData(free),
  });
}

/** 계산 오류 코드 → 사용자 문구 */
export const RESULT_ERROR_TEXT: Readonly<Record<string, string>> = Object.freeze({
  NONEXISTENT_LOCAL_TIME: "그 시각은 서머타임 전환으로 실제로는 없던 시간이에요. 출생 시간을 다시 확인해 주세요.",
  AMBIGUOUS_LOCAL_TIME: "서머타임이 끝나던 날이라 같은 시각이 두 번 있었어요. 어느 쪽이었는지 골라 주세요.",
  OUT_OF_COVERAGE: "지금은 1962년 1월 1일 이후 출생만 지원해요.",
  DAY_MASTER_UNAVAILABLE: "출생 시간이 있어야 결과를 만들 수 있는 날이에요. 태어난 시간을 입력해 주세요.",
});

/** 화면에 보이면 안 되는 개발자 용어 (E2E·단위 테스트에서 사용) */
export const DEV_TERMS: readonly string[] = Object.freeze([
  "SolarTermProvider",
  "boundaryRisk",
  "confidence",
  "verificationStatus",
  "engineVersion",
  "schemaVersion",
  "not-verified",
  "verified-internally",
  "uncertain",
  "unavailable",
  "undefined",
  "null",
  "NaN",
  "[object Object]",
]);
