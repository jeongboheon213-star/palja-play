// Supabase 연결 adapter (브라우저). anon(공개) 키로 INSERT 만 한다. 읽기 권한은 없다 (테이블 RLS).
// service_role 키는 절대 브라우저 코드에 넣지 않는다.

import type { AnalyticsEvent, AnalyticsSink } from "../../src/lib/analytics/events";
import type { FeedbackRecord, FeedbackRepository } from "../../src/lib/feedback/feedback";
import { SUPABASE_TABLES, supabaseInsertRequest, toEventRow, toFeedbackRow, type StorageSource } from "../../src/lib/storage/supabaseRows";

export interface SupabaseSettings {
  readonly url: string;
  readonly anonKey: string;
  readonly source: StorageSource;
}

export function createSupabaseFeedbackRepository(s: SupabaseSettings): FeedbackRepository {
  return {
    kind: "remote",
    async submit(r: FeedbackRecord) {
      const req = supabaseInsertRequest(s.url, s.anonKey, SUPABASE_TABLES.feedback, toFeedbackRow(r, s.source));
      try {
        const res = await fetch(req.url, req.init);
        return res.ok ? { ok: true, storage: "supabase" } : { ok: false, reason: "STORAGE_ERROR" };
      } catch {
        return { ok: false, reason: "STORAGE_ERROR" };
      }
    },
  };
}

/** 이벤트는 기다리지 않고 보낸다 (keepalive: 페이지를 떠나도 전송). 실패해도 화면 흐름을 막지 않는다. */
export function createSupabaseEventSink(s: SupabaseSettings): AnalyticsSink {
  return {
    id: "supabase",
    send(e: AnalyticsEvent) {
      const req = supabaseInsertRequest(s.url, s.anonKey, SUPABASE_TABLES.events, toEventRow(e, s.source));
      fetch(req.url, { ...req.init, keepalive: true }).catch(() => undefined);
    },
  };
}
