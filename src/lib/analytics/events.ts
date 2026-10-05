// Beta 행동 이벤트 구조. 특정 외부 분석 서비스에 연결하지 않는다.
// 실제 전송처(sink/adapter)는 조립 지점에서 주입한다. 개발용으로는 메모리·콘솔 adapter 를 쓴다.
//
// 개인정보 원칙: 이벤트에는 생년월일·시각·성별 원본을 넣지 않는다.
// 결과와 연결이 필요하면 resultId(브라우저에서 만든 무작위 UUID — 사주 계산과 무관)와 버전 묶음만 넣는다.

export const EVENT_NAMES = [
  "landing_view",
  "input_start",
  "calculation_complete",
  "result_view",
  "share_click",
  "premium_money_click",
  "premium_love_click",
  "premium_career_click",
  "premium_money_interest",
  "premium_love_interest",
  "premium_career_interest",
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
const FORBIDDEN_PROP_KEYS = /^(birth.*|date|time|datetime|gender|sex|name|.*phone.*|.*email.*|comment)$/i;

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

export interface TrackerContext {
  readonly sessionId: string;
  /** 현재 시각 ISO 문자열 (브라우저가 주입) */
  readonly now: () => string;
}

export type Track = (name: EventName, props?: EventProps, resultId?: string | null) => AnalyticsEvent;

/** track(event, properties) 추상화. 여러 sink 로 동시에 보낼 수 있다. sink 오류는 화면 흐름을 막지 않는다. */
export function createTracker(sinks: readonly AnalyticsSink[], ctx: TrackerContext): Track {
  return (name, props = {}, resultId = null) => {
    const e: AnalyticsEvent = Object.freeze({ name, at: ctx.now(), sessionId: ctx.sessionId, resultId, props: sanitizeProps(props) });
    for (const s of sinks) {
      try {
        s.send(e);
      } catch {
        // 분석 실패가 사용자 흐름을 막지 않는다
      }
    }
    return e;
  };
}

// ── Beta 핵심 지표 계산 (이벤트 목록 → 숫자) ─────────────────────

export interface FunnelMetrics {
  readonly sessions: number;
  readonly landingToInputRate: number | null;
  readonly inputToResultRate: number | null;
  readonly resultToShareRate: number | null;
  readonly resultToPremiumClickRate: number | null;
  readonly resultToPremiumInterestRate: number | null;
}

const rate = (a: number, b: number): number | null => (b === 0 ? null : a / b);

/** 세션 단위 전환율. 같은 세션의 같은 이벤트는 한 번으로 센다. */
export function funnelMetrics(events: readonly AnalyticsEvent[]): FunnelMetrics {
  const sessionsWith = (pred: (n: EventName) => boolean) => new Set(events.filter((e) => pred(e.name)).map((e) => e.sessionId)).size;
  const landing = sessionsWith((n) => n === "landing_view");
  const input = sessionsWith((n) => n === "input_start");
  const result = sessionsWith((n) => n === "result_view");
  return {
    sessions: new Set(events.map((e) => e.sessionId)).size,
    landingToInputRate: rate(input, landing),
    inputToResultRate: rate(result, input),
    resultToShareRate: rate(sessionsWith((n) => n === "share_click"), result),
    resultToPremiumClickRate: rate(sessionsWith((n) => n.startsWith("premium_") && n.endsWith("_click")), result),
    resultToPremiumInterestRate: rate(sessionsWith((n) => n.endsWith("_interest")), result),
  };
}
