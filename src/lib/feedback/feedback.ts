// Beta 피드백 데이터와 저장소 추상화.
// 저장 레코드에는 이름·생년월일·출생 시각·성별 원본을 넣지 않는다.
// 결과와는 resultId(브라우저 무작위 UUID, 사주 계산과 무관) + 버전 묶음 + 비식별 결과 특성으로만 연결한다.

import type { ResultVersions } from "../interpretation/free";

export const FEEDBACK_AREAS = ["personality", "wealth", "love", "career", "business", "relationship"] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export const FEEDBACK_AREA_LABELS: Readonly<Record<FeedbackArea, string>> = Object.freeze({
  personality: "성격",
  wealth: "재물",
  love: "연애",
  career: "직업",
  business: "사업",
  relationship: "인간관계",
});

export type ShareIntent = "no" | "maybe" | "yes";
export const FEEDBACK_COMMENT_MAX = 500;
export const FEEDBACK_SCHEMA_VERSION = "feedback-0.1.0" as const;

/** 화면에서 모은 값 (모두 선택 사항, 단 만족도는 제출 시 필요) */
export interface FeedbackDraft {
  readonly similarity: number | null;
  readonly bestMatch: readonly FeedbackArea[];
  /** "none" = 안 맞은 부분 없음 */
  readonly worstMatch: readonly FeedbackArea[] | "none";
  readonly shareIntent: ShareIntent | null;
  readonly comment: string;
}

/** 비식별 결과 특성 (분석용). 사람을 특정할 수 없는 값만 */
export interface ResultTraits {
  readonly characterId: string;
  readonly timeKnown: boolean;
  readonly boundaryRisk: boolean;
  readonly uncertainPillarCount: number;
}

export interface FeedbackRecord {
  readonly feedbackSchemaVersion: string;
  readonly feedbackId: string;
  readonly resultId: string;
  readonly createdAt: string;
  readonly versions: ResultVersions;
  readonly resultTraits: ResultTraits;
  readonly similarity: 1 | 2 | 3 | 4 | 5;
  readonly bestMatch: readonly FeedbackArea[];
  readonly worstMatch: readonly FeedbackArea[] | "none";
  readonly shareIntent: ShareIntent | null;
  readonly comment: string | null;
}

export type FeedbackBuildResult = { readonly ok: true; readonly record: FeedbackRecord } | { readonly ok: false; readonly code: "SIMILARITY_REQUIRED" | "INVALID_AREA" | "INVALID_ID" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildFeedbackRecord(
  draft: FeedbackDraft,
  meta: { readonly feedbackId: string; readonly resultId: string; readonly createdAt: string; readonly versions: ResultVersions; readonly resultTraits: ResultTraits },
): FeedbackBuildResult {
  const s = draft.similarity;
  if (s === null || !Number.isInteger(s) || s < 1 || s > 5) return { ok: false, code: "SIMILARITY_REQUIRED" };
  if (!UUID_RE.test(meta.feedbackId) || !UUID_RE.test(meta.resultId)) return { ok: false, code: "INVALID_ID" };
  const valid = (a: readonly string[]) => a.every((x) => (FEEDBACK_AREAS as readonly string[]).includes(x));
  if (!valid(draft.bestMatch) || (draft.worstMatch !== "none" && !valid(draft.worstMatch))) return { ok: false, code: "INVALID_AREA" };
  const comment = draft.comment.trim().slice(0, FEEDBACK_COMMENT_MAX);
  const uniq = <T,>(a: readonly T[]) => Object.freeze(Array.from(new Set(a)));
  return {
    ok: true,
    record: Object.freeze({
      feedbackSchemaVersion: FEEDBACK_SCHEMA_VERSION,
      feedbackId: meta.feedbackId,
      resultId: meta.resultId,
      createdAt: meta.createdAt,
      versions: meta.versions,
      resultTraits: Object.freeze({ ...meta.resultTraits }),
      similarity: s as 1 | 2 | 3 | 4 | 5,
      bestMatch: uniq(draft.bestMatch),
      worstMatch: draft.worstMatch === "none" ? "none" : uniq(draft.worstMatch),
      shareIntent: draft.shareIntent,
      comment: comment.length > 0 ? comment : null,
    }),
  };
}

export type SubmitResult = { readonly ok: true; readonly storage: string } | { readonly ok: false; readonly reason: "NOT_CONFIGURED" | "STORAGE_ERROR" };

/** 저장소 추상화. UI 는 이 인터페이스만 안다. */
export interface FeedbackRepository {
  /** 사람이 읽을 저장 위치 설명 (UI 에 개발 환경 여부 표시용) */
  readonly kind: "memory" | "local-dev" | "remote" | "unconfigured";
  submit(record: FeedbackRecord): Promise<SubmitResult>;
}

export function createMemoryFeedbackRepository(): FeedbackRepository & { readonly records: readonly FeedbackRecord[] } {
  const records: FeedbackRecord[] = [];
  return {
    kind: "memory",
    records,
    async submit(r) {
      records.push(r);
      return { ok: true, storage: "memory" };
    },
  };
}

/** Production 저장소가 정해지기 전: 저장한 척하지 않는다 */
export function createUnconfiguredFeedbackRepository(): FeedbackRepository {
  return {
    kind: "unconfigured",
    async submit() {
      return { ok: false, reason: "NOT_CONFIGURED" };
    },
  };
}

// ── Beta 핵심 지표 (피드백 목록 → 숫자) ───────────────────────────

export interface FeedbackMetrics {
  readonly count: number;
  readonly averageSimilarity: number | null;
  readonly topScoreRate: number | null;
  readonly bestAreaCounts: Readonly<Record<FeedbackArea, number>>;
  readonly worstAreaCounts: Readonly<Record<FeedbackArea, number>>;
  readonly shareIntent: Readonly<Record<ShareIntent, number>>;
  /** 버전별 평균 만족도 (엔진/해석 버전 비교용) */
  readonly byInterpretationVersion: Readonly<Record<string, { count: number; average: number }>>;
}

export function feedbackMetrics(records: readonly FeedbackRecord[]): FeedbackMetrics {
  const zero = () => Object.fromEntries(FEEDBACK_AREAS.map((a) => [a, 0])) as Record<FeedbackArea, number>;
  const best = zero();
  const worst = zero();
  const intent: Record<ShareIntent, number> = { no: 0, maybe: 0, yes: 0 };
  const byV: Record<string, { count: number; sum: number }> = {};
  let sum = 0;
  let fives = 0;
  for (const r of records) {
    sum += r.similarity;
    if (r.similarity === 5) fives++;
    for (const a of r.bestMatch) best[a]++;
    if (r.worstMatch !== "none") for (const a of r.worstMatch) worst[a]++;
    if (r.shareIntent) intent[r.shareIntent]++;
    const key = `${r.versions.engineVersion}|${r.versions.interpretationVersion}|${r.versions.scoreVersion}`;
    const v = (byV[key] ??= { count: 0, sum: 0 });
    v.count++;
    v.sum += r.similarity;
  }
  const n = records.length;
  return {
    count: n,
    averageSimilarity: n ? sum / n : null,
    topScoreRate: n ? fives / n : null,
    bestAreaCounts: best,
    worstAreaCounts: worst,
    shareIntent: intent,
    byInterpretationVersion: Object.fromEntries(Object.entries(byV).map(([k, v]) => [k, { count: v.count, average: v.sum / v.count }])),
  };
}
