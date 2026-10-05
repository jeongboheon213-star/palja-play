// 피드백·이벤트 → Supabase 테이블 행 (supabase/migrations 의 컬럼과 1:1).
// 순수 함수라 Node 테스트로 검사한다. 개인정보 컬럼은 존재하지 않는다.

import type { AnalyticsEvent } from "../analytics/events";
import type { FeedbackRecord } from "../feedback/feedback";

export type StorageSource = "development" | "production";

export const SUPABASE_TABLES = Object.freeze({ feedback: "beta_feedback", events: "beta_events" });

export interface FeedbackRow {
  readonly id: string;
  readonly result_id: string;
  readonly client_created_at: string;
  readonly source: StorageSource;
  readonly feedback_schema_version: string;
  readonly engine_version: string;
  readonly schema_version: string;
  readonly interpretation_version: string;
  readonly score_version: string;
  readonly solar_term_provider_version: string;
  readonly policy_version: string;
  readonly character_id: string;
  readonly time_known: boolean;
  readonly boundary_risk: boolean;
  readonly uncertain_pillar_count: number;
  readonly similarity: number;
  readonly best_match: readonly string[];
  readonly worst_match: readonly string[];
  readonly worst_none: boolean;
  readonly share_intent: string | null;
  readonly comment: string | null;
}

export function toFeedbackRow(r: FeedbackRecord, source: StorageSource): FeedbackRow {
  return {
    id: r.feedbackId,
    result_id: r.resultId,
    client_created_at: r.createdAt,
    source,
    feedback_schema_version: r.feedbackSchemaVersion,
    engine_version: r.versions.engineVersion,
    schema_version: r.versions.schemaVersion,
    interpretation_version: r.versions.interpretationVersion,
    score_version: r.versions.scoreVersion,
    solar_term_provider_version: r.versions.solarTermProviderVersion,
    policy_version: r.versions.policyVersion,
    character_id: r.resultTraits.characterId,
    time_known: r.resultTraits.timeKnown,
    boundary_risk: r.resultTraits.boundaryRisk,
    uncertain_pillar_count: r.resultTraits.uncertainPillarCount,
    similarity: r.similarity,
    best_match: [...r.bestMatch],
    worst_match: r.worstMatch === "none" ? [] : [...r.worstMatch],
    worst_none: r.worstMatch === "none",
    share_intent: r.shareIntent,
    comment: r.comment,
  };
}

export interface EventRow {
  readonly client_at: string;
  readonly source: StorageSource;
  readonly name: string;
  readonly session_id: string;
  readonly result_id: string | null;
  readonly props: Readonly<Record<string, string | number | boolean | null>>;
}

export function toEventRow(e: AnalyticsEvent, source: StorageSource): EventRow {
  return { client_at: e.at, source, name: e.name, session_id: e.sessionId, result_id: e.resultId, props: { ...e.props } };
}

/** Supabase REST(PostgREST) INSERT 요청. 응답 본문을 받지 않는다(return=minimal). */
export function supabaseInsertRequest(baseUrl: string, anonKey: string, table: string, row: object): { url: string; init: { method: "POST"; headers: Record<string, string>; body: string } } {
  return {
    url: `${baseUrl.replace(/\/+$/, "")}/rest/v1/${table}`,
    init: {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    },
  };
}
