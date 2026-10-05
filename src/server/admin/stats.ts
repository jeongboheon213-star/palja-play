// 운영자 대시보드 통계 (순수 함수). Supabase 에서 읽은 행을 받아 집계만 한다.
// 시계·환경 변수·네트워크를 읽지 않는다 (호출자가 now·행을 주입). 개인정보 컬럼은 애초에 없다
// (beta_feedback / beta_events 에는 생년월일·출생시각·성별·이름·전화번호 컬럼이 없음).

import { CHARACTERS } from "../../lib/interpretation/copy/characters";
import { FEEDBACK_AREAS, FEEDBACK_AREA_LABELS } from "../../lib/feedback/feedback";

export interface FeedbackRow {
  readonly id: string;
  readonly result_id: string;
  readonly created_at: string;
  readonly source: string;
  readonly engine_version: string;
  readonly interpretation_version: string;
  readonly score_version: string;
  readonly character_id: string;
  readonly time_known: boolean;
  readonly boundary_risk: boolean;
  readonly similarity: number;
  readonly best_match: readonly string[] | null;
  readonly worst_match: readonly string[] | null;
  readonly worst_none: boolean;
  readonly share_intent: string | null;
  readonly comment: string | null;
}

export interface EventRow {
  readonly created_at: string;
  readonly name: string;
  readonly session_id: string;
  readonly result_id: string | null;
  readonly props: Readonly<Record<string, unknown>> | null;
}

/** 대시보드가 Supabase 에서 읽는 컬럼 (이 목록 밖은 읽지 않는다) */
export const FEEDBACK_COLUMNS = "id,result_id,created_at,source,engine_version,interpretation_version,score_version,character_id,time_known,boundary_risk,similarity,best_match,worst_match,worst_none,share_intent,comment";
export const EVENT_COLUMNS = "created_at,name,session_id,result_id,props";

export const PERIOD_DAYS = [1, 7, 30, 90, 365] as const;
export type SourceFilter = "production" | "development" | "all";

export interface Count {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

export interface Group {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  /** 평균 "나와 비슷함" 점수 (1~5), 표본 0 이면 null */
  readonly avgSimilarity: number | null;
}

export interface FunnelStep {
  readonly key: string;
  readonly label: string;
  readonly sessions: number;
  /** 첫 단계 대비 % */
  readonly ofTop: number | null;
  /** 바로 앞 단계 대비 % */
  readonly ofPrev: number | null;
}

export interface DayRow {
  readonly date: string;
  readonly visitors: number;
  readonly results: number;
  readonly feedback: number;
  readonly shares: number;
}

export interface Dashboard {
  readonly generatedAt: string;
  readonly period: { readonly from: string; readonly to: string; readonly days: number; readonly source: SourceFilter };
  readonly truncated: boolean;
  readonly totals: {
    readonly visitors: number;
    readonly results: number;
    readonly feedback: number;
    readonly feedbackRate: number | null;
    readonly avgSimilarity: number | null;
    readonly shareSessions: number;
    readonly shareRate: number | null;
    readonly premiumInterestSessions: number;
  };
  readonly funnel: readonly FunnelStep[];
  readonly daily: readonly DayRow[];
  readonly landingVia: readonly Count[];
  readonly shareMethods: readonly Count[];
  readonly shareDevices: readonly Count[];
  readonly battleOutcomes: readonly Count[];
  readonly premium: readonly { readonly productId: string; readonly label: string; readonly clickSessions: number; readonly interestSessions: number }[];
  readonly feedback: {
    readonly count: number;
    readonly similarity: readonly Count[];
    readonly shareIntent: readonly Count[];
    readonly bestMatch: readonly Count[];
    readonly worstMatch: readonly Count[];
    readonly worstNone: number;
    readonly byCharacter: readonly Group[];
    readonly byTimeKnown: readonly Group[];
    readonly byBoundary: readonly Group[];
    readonly byVersion: readonly Group[];
    readonly withComment: number;
  };
  readonly comments: readonly { readonly date: string; readonly similarity: number; readonly character: string; readonly shareIntent: string | null; readonly comment: string }[];
  readonly characters: readonly Count[];
  readonly notes: readonly string[];
}

const KST_MS = 9 * 60 * 60 * 1000; // 한국은 현재 서머타임 없음

/** ISO 시각 → 한국 날짜 YYYY-MM-DD (잘못된 값은 null) */
export function kstDate(iso: string): string | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + KST_MS).toISOString().slice(0, 10) : null;
}

const pct = (n: number, d: number): number | null => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
const avg = (xs: readonly number[]): number | null => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

const CHARACTER_NAMES: ReadonlyMap<string, string> = new Map(Object.values(CHARACTERS).map((c) => [c.id, `${c.emoji} ${c.name}`]));
export const characterLabel = (id: string): string => CHARACTER_NAMES.get(id) ?? id;

const AREA_LABELS: Readonly<Record<string, string>> = FEEDBACK_AREA_LABELS;

const LANDING_LABELS: Readonly<Record<string, string>> = { direct: "직접 방문", battle: "배틀 링크", "battle-legacy": "배틀 링크(예전 형식)", "battle-invalid": "잘못된 배틀 링크" };
const SHARE_LABELS: Readonly<Record<string, string>> = {
  sms: "문자",
  kakao: "카카오톡",
  "kakao-failed": "카카오톡(실패)",
  "web-share": "공유 시트",
  "web-share-failed": "공유 시트(실패)",
  qr: "QR 보기",
  "copy-clipboard": "링크 복사",
  "copy-execCommand": "링크 복사",
  "copy-manual": "링크 직접 복사",
};
const INTENT_LABELS: Readonly<Record<string, string>> = { yes: "공유할래요", maybe: "고민 중", no: "안 할래요", none: "응답 없음" };
const OUTCOME_LABELS: Readonly<Record<string, string>> = { win: "링크 받은 친구 승리", lose: "링크 보낸 사람 승리", draw: "무승부" };
const PRODUCTS = [
  { productId: "premium_money", label: "💰 재물 리포트" },
  { productId: "premium_love", label: "💕 연애 리포트" },
  { productId: "premium_career", label: "💼 직업·사업 리포트" },
] as const;

function tally(keys: readonly string[], labels: Readonly<Record<string, string>>, order?: readonly string[]): Count[] {
  const m = new Map<string, number>();
  for (const k of order ?? []) m.set(k, 0);
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  const rows = [...m].map(([key, count]) => ({ key, label: labels[key] ?? key, count }));
  return order ? rows : rows.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function group(rows: readonly FeedbackRow[], keyOf: (r: FeedbackRow) => string, labelOf: (k: string) => string): Group[] {
  const m = new Map<string, number[]>();
  for (const r of rows) {
    const k = keyOf(r);
    m.set(k, [...(m.get(k) ?? []), r.similarity]);
  }
  return [...m]
    .map(([key, xs]) => ({ key, label: labelOf(key), count: xs.length, avgSimilarity: avg(xs) }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length <= 60 ? v : null);

export function buildDashboard(input: {
  readonly feedback: readonly FeedbackRow[];
  readonly events: readonly EventRow[];
  readonly now: Date;
  readonly days: number;
  readonly source: SourceFilter;
  readonly truncated?: boolean;
}): Dashboard {
  const { feedback, events, now, days, source } = input;
  const from = new Date(now.getTime() - days * 86400000);

  // 단계별 "세션 수" (같은 사람이 여러 번 눌러도 한 번)
  const sessionsOf = (pred: (e: EventRow) => boolean) => new Set(events.filter(pred).map((e) => e.session_id));
  const all = new Set(events.map((e) => e.session_id));
  const landing = sessionsOf((e) => e.name === "landing_view");
  const input_ = sessionsOf((e) => e.name === "input_start");
  const calc = sessionsOf((e) => e.name === "calculation_complete");
  const result = sessionsOf((e) => e.name === "result_view");
  const share = sessionsOf((e) => e.name === "share_click");
  const fb = sessionsOf((e) => e.name === "feedback_submit");
  const interest = sessionsOf((e) => e.name.endsWith("_interest"));

  const steps: [string, string, Set<string>][] = [
    ["landing_view", "첫 화면 방문", landing],
    ["input_start", "입력 시작", input_],
    ["calculation_complete", "계산 완료", calc],
    ["result_view", "결과 보기", result],
    ["share_click", "배틀 공유", share],
    ["feedback_submit", "피드백 제출", fb],
  ];
  const top = steps[0]![2].size;
  const funnel: FunnelStep[] = steps.map(([key, label, s], i) => ({
    key,
    label,
    sessions: s.size,
    ofTop: pct(s.size, top),
    ofPrev: i === 0 ? null : pct(s.size, i <= 3 ? steps[i - 1]![2].size : result.size), // 공유·피드백은 결과 본 사람 대비
  }));

  // 날짜별
  const dayMap = new Map<string, { v: Set<string>; r: Set<string>; f: number; s: Set<string> }>();
  const day = (d: string) => {
    let x = dayMap.get(d);
    if (!x) dayMap.set(d, (x = { v: new Set(), r: new Set(), f: 0, s: new Set() }));
    return x;
  };
  for (let t = from.getTime(); t <= now.getTime() && days <= 366; t += 86400000) day(kstDate(new Date(t).toISOString())!);
  day(kstDate(now.toISOString())!);
  for (const e of events) {
    const d = kstDate(e.created_at);
    if (!d) continue;
    const x = day(d);
    x.v.add(e.session_id);
    if (e.name === "result_view") x.r.add(e.result_id ?? e.session_id);
    if (e.name === "share_click") x.s.add(e.session_id);
  }
  for (const f of feedback) {
    const d = kstDate(f.created_at);
    if (d) day(d).f++;
  }
  const daily = [...dayMap]
    .map(([date, x]) => ({ date, visitors: x.v.size, results: x.r.size, feedback: x.f, shares: x.s.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const propOf = (name: string, key: string) => events.filter((e) => e.name === name).map((e) => str(e.props?.[key]) ?? "unknown");
  const shareEvents = events.filter((e) => e.name === "share_click");

  const results = new Set(events.filter((e) => e.name === "result_view").map((e) => e.result_id ?? e.session_id)).size;
  const sims = feedback.map((f) => f.similarity);

  const notes: string[] = [];
  if (feedback.length < 30) notes.push(`피드백이 ${feedback.length}건이라 비율·평균은 참고용이에요 (30건 이상부터 경향을 보기 좋아요).`);
  if (input.truncated) notes.push("데이터가 많아 일부만 집계했어요. 기간을 줄여서 다시 확인해 주세요.");
  if (source !== "production") notes.push(source === "all" ? "개발·테스트 기록이 함께 포함돼 있어요." : "개발·테스트 기록만 보고 있어요.");

  return {
    generatedAt: now.toISOString(),
    period: { from: from.toISOString(), to: now.toISOString(), days, source },
    truncated: !!input.truncated,
    totals: {
      visitors: all.size,
      results,
      feedback: feedback.length,
      feedbackRate: pct(fb.size, result.size),
      avgSimilarity: avg(sims),
      shareSessions: share.size,
      shareRate: pct(share.size, result.size),
      premiumInterestSessions: interest.size,
    },
    funnel,
    daily,
    landingVia: tally(propOf("landing_view", "via"), LANDING_LABELS),
    shareMethods: tally(shareEvents.map((e) => str(e.props?.method) ?? "unknown"), SHARE_LABELS),
    shareDevices: tally(shareEvents.map((e) => str(e.props?.device) ?? "unknown"), { mobile: "휴대폰", pc: "PC" }),
    battleOutcomes: tally(
      events.filter((e) => e.name === "result_view" && str(e.props?.battleOutcome)).map((e) => str(e.props?.battleOutcome)!),
      OUTCOME_LABELS,
    ),
    premium: PRODUCTS.map((p) => ({
      ...p,
      clickSessions: sessionsOf((e) => e.name === `${p.productId}_click`).size,
      interestSessions: sessionsOf((e) => e.name === `${p.productId}_interest`).size,
    })),
    feedback: {
      count: feedback.length,
      similarity: tally(sims.map(String), { "1": "1 전혀 아님", "2": "2", "3": "3 보통", "4": "4", "5": "5 완전 나" }, ["5", "4", "3", "2", "1"]),
      shareIntent: tally(feedback.map((f) => f.share_intent ?? "none"), INTENT_LABELS, ["yes", "maybe", "no", "none"]),
      bestMatch: tally(feedback.flatMap((f) => f.best_match ?? []), AREA_LABELS, FEEDBACK_AREAS),
      worstMatch: tally(feedback.flatMap((f) => f.worst_match ?? []), AREA_LABELS, FEEDBACK_AREAS),
      worstNone: feedback.filter((f) => f.worst_none).length,
      byCharacter: group(feedback, (f) => f.character_id, characterLabel),
      byTimeKnown: group(feedback, (f) => (f.time_known ? "known" : "unknown"), (k) => (k === "known" ? "출생시간 입력" : "출생시간 모름")),
      byBoundary: group(feedback, (f) => (f.boundary_risk ? "risk" : "normal"), (k) => (k === "risk" ? "절기 경계 안내 받음" : "일반")),
      byVersion: group(feedback, (f) => `${f.interpretation_version} / ${f.score_version}`, (k) => k),
      withComment: feedback.filter((f) => (f.comment ?? "").trim().length > 0).length,
    },
    comments: feedback
      .filter((f) => (f.comment ?? "").trim().length > 0)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 200)
      .map((f) => ({ date: kstDate(f.created_at) ?? "", similarity: f.similarity, character: characterLabel(f.character_id), shareIntent: f.share_intent, comment: f.comment!.trim() })),
    characters: tally(
      events.filter((e) => e.name === "result_view").map((e) => characterLabel(str(e.props?.characterId) ?? "unknown")),
      {},
    ),
    notes,
  };
}

/** 피드백 원본 CSV (개인정보 컬럼 없음). 엑셀에서 한글이 깨지지 않도록 BOM 은 화면에서 붙인다. */
export function feedbackCsv(rows: readonly FeedbackRow[]): string {
  const cell = (v: unknown) => {
    const s = Array.isArray(v) ? v.join("|") : v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // 엑셀 수식 실행 방지
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = ["created_at_kst", "character", "similarity", "share_intent", "best_match", "worst_match", "worst_none", "time_known", "boundary_risk", "interpretation_version", "score_version", "comment"];
  const lines = rows.map((r) =>
    [
      r.created_at ? new Date(Date.parse(r.created_at) + KST_MS).toISOString().slice(0, 16).replace("T", " ") : "",
      characterLabel(r.character_id),
      r.similarity,
      r.share_intent,
      r.best_match ?? [],
      r.worst_match ?? [],
      r.worst_none,
      r.time_known,
      r.boundary_risk,
      r.interpretation_version,
      r.score_version,
      r.comment,
    ]
      .map(cell)
      .join(","),
  );
  return [head.join(","), ...lines].join("\r\n");
}
