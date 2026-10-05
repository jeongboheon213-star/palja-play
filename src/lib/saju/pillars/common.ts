// 기둥 계산 공용 도우미.
// 절기 순간은 SolarTermProvider 결과(SolarTermContext)에서만 읽는다. 여기서 절기를 다시 계산하지 않는다.

import { epochMsFromIsoUtc, MS_PER_MINUTE } from "../civil";
import { ganjiHanja, ganjiKo } from "../ganji";
import type { Policy } from "../policies";
import type { NormalizedBirthTime, ProviderInfo, SolarTermInstant } from "../providers";
import type { SolarTermContext } from "../solarTermContext";
import { getSolarTermById, type SolarTermDefinition } from "../solarTerms";
import type { Pillar, PillarPosition } from "../types";
import { VERIFICATION_STATUS, type VerificationItemId, type VerificationLevel } from "../verification";
import type { EvidenceValue, PillarReasonCode, PillarResult, PolicyDependency } from "./types";

/** 네 기둥 함수가 공통으로 받는 입력. 각 함수는 서로의 결과에 의존하지 않는다. */
export interface PillarInputs {
  readonly normalized: NormalizedBirthTime;
  readonly solarTermContext: SolarTermContext;
  readonly solarTermProvider: { readonly info: ProviderInfo; readonly verificationStatus: VerificationLevel };
  readonly policy: Policy;
}

interface Common {
  readonly position: PillarPosition;
  readonly item: VerificationItemId;
  readonly evidence: Readonly<Record<string, EvidenceValue>>;
  readonly policyDependencies: readonly PolicyDependency[];
}

function verificationOf(item: VerificationItemId) {
  return Object.freeze({ item, level: VERIFICATION_STATUS[item].level });
}

export function confirmed(c: Common, pillar: Pillar, boundaryRisk: boolean): PillarResult {
  return Object.freeze({
    position: c.position,
    confidence: "confirmed",
    boundaryRisk,
    pillar,
    ganji: ganjiKo(pillar),
    hanja: ganjiHanja(pillar),
    candidates: Object.freeze([]),
    reason: null,
    evidence: Object.freeze({ ...c.evidence }),
    policyDependencies: Object.freeze([...c.policyDependencies]),
    verification: verificationOf(c.item),
  });
}

export function uncertain(c: Common, candidates: readonly Pillar[], reason: PillarReasonCode): PillarResult {
  return Object.freeze({
    position: c.position,
    confidence: "uncertain",
    boundaryRisk: false,
    pillar: null,
    ganji: null,
    hanja: null,
    candidates: Object.freeze([...candidates]),
    reason,
    evidence: Object.freeze({ ...c.evidence }),
    policyDependencies: Object.freeze([...c.policyDependencies]),
    verification: verificationOf(c.item),
  });
}

export function unavailable(c: Common, reason: PillarReasonCode): PillarResult {
  return Object.freeze({
    position: c.position,
    confidence: "unavailable",
    boundaryRisk: false,
    pillar: null,
    ganji: null,
    hanja: null,
    candidates: Object.freeze([]),
    reason,
    evidence: Object.freeze({ ...c.evidence }),
    policyDependencies: Object.freeze([...c.policyDependencies]),
    verification: verificationOf(c.item),
  });
}

function definitionOf(termId: string): SolarTermDefinition {
  const d = getSolarTermById(termId);
  if (!d) throw new Error(`알 수 없는 절기 id: ${termId}`); // 제공자 계약 위반. 정상 경로에서는 일어나지 않는다.
  return d;
}

/**
 * 절기 순간이 속한 "절기 해"(입춘~다음 입춘)의 서기 연도.
 * 입춘(1)~동지(22)는 그 해 2~12월, 소한(23)·대한(24)은 다음 해 1월에 온다.
 * 제공자가 준 순간의 UTC 연도와 절기 순번만 사용한다.
 */
export function solarYearOfTerm(t: SolarTermInstant): number {
  const utcYear = Number(t.termInstantUtc.slice(0, 4));
  return definitionOf(t.termId).order >= 23 ? utcYear - 1 : utcYear;
}

/** 현재 절기가 중기면 바로 앞 절(節)을 돌려준다. 순번만 사용한다. */
export function governingJeolOrder(t: SolarTermInstant): number {
  const d = definitionOf(t.termId);
  return d.kind === "jeol" ? d.order : d.order - 1;
}

/** 절(節) 순번 → 바로 앞 절 순번 (입춘 앞은 소한) */
export function previousJeolOrder(order: number): number {
  return order === 1 ? 23 : order - 2;
}

export function isIpchun(termId: string): boolean {
  return definitionOf(termId).yearBoundaryCandidate;
}

export function isJeol(termId: string): boolean {
  return definitionOf(termId).monthBoundaryCandidate;
}

/**
 * 절기 컨텍스트를 연주/월주가 쓰기 쉬운 형태로 정리한 것.
 *  - determined : 이 출생의 현재 절기가 하나로 정해짐
 *  - ambiguous  : 시간 미상 + 그날 안에 절(節)이 있음
 *  - unavailable: 절기 제공자 실패 등
 */
export type TermResolution =
  | {
      readonly kind: "determined";
      readonly term: SolarTermInstant;
      readonly timeKnown: boolean;
      /** 경계 근처 경고가 걸린 절의 id들 (검증되지 않은 경계라 외부 엔진과 다를 수 있음) */
      readonly nearBoundaryTermIds: readonly string[];
    }
  | { readonly kind: "ambiguous"; readonly boundaryTerm: SolarTermInstant }
  | { readonly kind: "unavailable"; readonly reason: PillarReasonCode; readonly detail: string };

export function resolveTerm(ctx: SolarTermContext, policy: Policy): TermResolution {
  if (!ctx.ok) {
    return {
      kind: "unavailable",
      reason: ctx.code === "INVALID_NORMALIZED_INPUT" ? "INVALID_NORMALIZED_INPUT" : "SOLAR_TERM_UNAVAILABLE",
      detail: ctx.code,
    };
  }
  if (ctx.timeKnown) {
    if (!ctx.lookup) return { kind: "unavailable", reason: "SOLAR_TERM_UNAVAILABLE", detail: "LOOKUP_MISSING" };
    const near = ctx.warnings.filter((w) => w.code === "SOLAR_TERM_BOUNDARY_NEAR").flatMap((w) => w.termIds ?? []);
    return { kind: "determined", term: ctx.lookup.currentTerm, timeKnown: true, nearBoundaryTermIds: near };
  }
  const day = ctx.dayAssessment;
  if (!day) return { kind: "unavailable", reason: "SOLAR_TERM_UNAVAILABLE", detail: "DAY_ASSESSMENT_MISSING" };
  if (day.status === "ambiguous") {
    const t = day.boundaryTermsInRange[0];
    if (!t) return { kind: "unavailable", reason: "SOLAR_TERM_UNAVAILABLE", detail: "BOUNDARY_TERM_MISSING" };
    return { kind: "ambiguous", boundaryTerm: t };
  }
  const term = day.currentTermAtDayStart;
  if (!term) return { kind: "unavailable", reason: "SOLAR_TERM_UNAVAILABLE", detail: "CURRENT_TERM_MISSING" };

  // 시간 미상이지만 하루 범위 바로 바깥(경고 범위 이내)에 절이 있으면 경계 위험으로 표시한다.
  const near: string[] = [];
  if (day.nearRangeEdge) {
    const win = policy.solarTerm.boundaryWarning.minutes * MS_PER_MINUTE;
    const start = epochMsFromIsoUtc(day.range.startUtc);
    const end = epochMsFromIsoUtc(day.range.endUtc);
    if (start !== null && end !== null) {
      if (isJeol(term.termId) && start - term.epochMs <= win) near.push(term.termId);
      for (const v of ctx.localInstants) {
        const ms = epochMsFromIsoUtc(v.termInstantUtc);
        if (ms !== null && ms >= end && ms - end <= win && isJeol(v.termId)) near.push(v.termId);
      }
    }
  }
  return { kind: "determined", term, timeKnown: false, nearBoundaryTermIds: near };
}

/** 제공자 정보를 근거(evidence)로 남기기 위한 값 */
export function providerEvidence(inp: PillarInputs): Record<string, EvidenceValue> {
  const p = inp.solarTermProvider;
  return {
    solarTermProvider: `${p.info.name}@${p.info.version}`,
    solarTermAlgorithm: p.info.algorithmVersion,
    solarTermVerification: p.verificationStatus,
  };
}
