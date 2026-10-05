// 브라우저 런타임 도우미: 무작위 ID, 분석 adapter, 피드백 저장소 adapter.
//
// 주의: 여기의 무작위 값(UUID)은 피드백·이벤트 레코드를 구분하기 위한 식별자일 뿐이다.
// 사주 계산(src/lib/saju, src/lib/interpretation)에는 난수를 쓰지 않으며, 이 값은 계산에 들어가지 않는다.

import { createMemorySink, createTracker, type AnalyticsEvent, type AnalyticsSink, type Track } from "../../src/lib/analytics/events";
import { createUnconfiguredFeedbackRepository, type FeedbackRecord, type FeedbackRepository } from "../../src/lib/feedback/feedback";
import { APP_CONFIG } from "./config";
import { createSupabaseEventSink, createSupabaseFeedbackRepository } from "./supabase";

/** 레코드 식별용 UUID v4 (계산과 무관) */
export function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const nowIso = (): string => new Date().toISOString();

/** KST 기준 오늘 (미래 날짜 입력 막기용, 화면 계층에서만 시계를 읽는다) */
export function todayKst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

function consoleSink(): AnalyticsSink {
  return {
    id: "console",
    send(e: AnalyticsEvent) {
      // eslint-disable-next-line no-console
      console.info("[palja:event]", e.name, e.props);
    },
  };
}

export interface Runtime {
  readonly track: Track;
  readonly memoryEvents: readonly AnalyticsEvent[];
  readonly feedback: FeedbackRepository;
  readonly sessionId: string;
}

const LOCAL_FEEDBACK_KEY = "palja-dev-feedback-v1";

/** 개발 환경 전용: 이 브라우저 localStorage 에만 저장. 운영 서버로 보내지 않는다. */
function createLocalDevFeedbackRepository(): FeedbackRepository {
  return {
    kind: "local-dev",
    async submit(r: FeedbackRecord) {
      try {
        const prev = JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) ?? "[]") as unknown[];
        prev.push(r);
        localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(prev));
        return { ok: true, storage: "local-dev" };
      } catch {
        return { ok: false, reason: "STORAGE_ERROR" };
      }
    },
  };
}

export function createRuntime(): Runtime {
  const sessionId = randomId();
  const memory = createMemorySink();
  const sinks: AnalyticsSink[] = [];
  if (APP_CONFIG.analytics.includes("memory")) sinks.push(memory);
  if (APP_CONFIG.analytics.includes("console")) sinks.push(consoleSink());
  if (APP_CONFIG.supabase && APP_CONFIG.analytics.includes("supabase")) sinks.push(createSupabaseEventSink(APP_CONFIG.supabase));
  const track = createTracker(sinks, { sessionId, now: nowIso });
  const feedback =
    APP_CONFIG.feedbackStorage === "supabase" && APP_CONFIG.supabase
      ? createSupabaseFeedbackRepository(APP_CONFIG.supabase)
      : APP_CONFIG.feedbackStorage === "local-dev"
        ? createLocalDevFeedbackRepository()
        : createUnconfiguredFeedbackRepository();
  return { track, memoryEvents: memory.events, feedback, sessionId };
}
