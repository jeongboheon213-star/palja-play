// Beta 행동 이벤트 구조. 특정 외부 분석 서비스에 연결하지 않는다.
// 실제 전송처(sink)는 조립 지점에서 주입한다. 개발용으로는 메모리 sink 를 쓴다.
//
// 개인정보 원칙: 이벤트에는 생년월일·시각·성별 원본을 넣지 않는다.
// 결과와 연결이 필요하면 resultId(세션마다 새로 만든 무작위 id)와 버전 묶음만 넣는다.

export const EVENT_NAMES = [
  "landing_view",
  "input_start",
  "calculation_complete",
  "result_view",
  "share_click",
  "premium_money_click",
  "premium_love_click",
  "premium_career_click",
  "feedback_submit",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export type EventProps = Readonly<Record<string, string | number | boolean | null>>;

export interface AnalyticsEvent {
  readonly name: EventName;
  /** 이벤트를 만든 쪽(브라우저)의 시각. 계산 계층과 무관 */
  readonly at: string;
  readonly sessionId: string;
  readonly resultId: string | null;
  readonly props: EventProps;
}

export interface AnalyticsSink {
  readonly id: string;
  send(event: AnalyticsEvent): void;
}

/** 개인정보로 보이는 키를 막는다 (실수 방지용 최소 검사) */
const FORBIDDEN_PROP_KEYS = /birth|date|time|gender|name|phone|email/i;

export function sanitizeProps(props: EventProps): EventProps {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) if (!FORBIDDEN_PROP_KEYS.test(k)) out[k] = v;
  return Object.freeze(out);
}

/** 개발/테스트용: 메모리에만 쌓는다 */
export function createMemorySink(): AnalyticsSink & { readonly events: readonly AnalyticsEvent[] } {
  const events: AnalyticsEvent[] = [];
  return {
    id: "memory",
    events,
    send(e: AnalyticsEvent) {
      events.push(e);
    },
  };
}
