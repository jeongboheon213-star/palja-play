// Phase 7~8: 화면용 데이터, 공유, 피드백, 이벤트 테스트 (DOM 없이).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { computeBetaResult } from "../src/lib/engine";
import { toResultView, DEV_TERMS, RESULT_ERROR_TEXT } from "../src/lib/ui/resultView";
import { buildShareText, shareCardData } from "../src/lib/share/share";
import {
  buildFeedbackRecord,
  createMemoryFeedbackRepository,
  createUnconfiguredFeedbackRepository,
  feedbackMetrics,
  type FeedbackDraft,
} from "../src/lib/feedback/feedback";
import { createMemorySink, createTracker, funnelMetrics, sanitizeProps, type AnalyticsSink } from "../src/lib/analytics/events";
import { NOTICE_TEXT } from "../src/lib/interpretation";
import { MS_PER_DAY, epochMsFromIsoUtc, formatLocalFromEpochMs } from "../src/lib/saju/civil";
import type { SajuInput } from "../src/lib/saju/types";

const inp = (d: string, t: string | null, g: "male" | "female" = "female"): SajuInput => ({ birthDate: d, birthTime: t, gender: g, calendar: "solar", birthCountry: "KR" });
const ok = (d: string, t: string | null, g: "male" | "female" = "female") => {
  const r = computeBetaResult(inp(d, t, g));
  assert.ok(r.ok);
  if (!r.ok) throw new Error("unreachable");
  return r;
};
const view = (d: string, t: string | null) => {
  const r = ok(d, t);
  return toResultView(r.free, r.premium);
};
/** 객체 안의 모든 문자열 값 (키 제외) */
function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === "string") out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => strings(x, out));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => strings(x, out));
  return out;
}

test("화면 데이터: 개발자 용어가 문구에 없다 (스윕)", () => {
  const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
  let n = 0;
  for (let ms = epochMsFromIsoUtc("1962-01-02T00:00:00Z")!; ms < end; ms += 41 * MS_PER_DAY) {
    const date = formatLocalFromEpochMs(ms, 0).date;
    for (const t of ["08:00", null]) {
      const r = computeBetaResult(inp(date, t));
      if (!r.ok) continue;
      const v = toResultView(r.free, r.premium);
      const texts = strings({ ...v, premium: v.premium.map((p) => ({ ...p, clickEvent: null, interestEvent: null, productId: null })) });
      for (const s of texts) for (const w of DEV_TERMS) assert.ok(!s.includes(w), `${w} in "${s}"`);
      n++;
    }
  }
  assert.ok(n > 1000);
});

test("화면 데이터: '운의 흐름'은 '기본 운 밸런스'로 표시, 운세 아님 안내, 막대 칸 수", () => {
  const v = view("1990-05-15", "14:20");
  assert.deepEqual(v.stats.map((s) => s.label), ["재물력", "연애력", "사업력", "직업력", "인간관계", "실행력", "기본 운 밸런스"]);
  assert.equal(v.stats.find((s) => s.key === "flow")!.key, "flow", "내부 키는 유지");
  for (const s of v.stats) assert.equal(s.filled, Math.round(s.value / 10));
  assert.ok(v.statsNotes.some((n) => n.includes("운세가 아니에요")));
  for (const s of strings(v)) assert.ok(!/올해 운세|이번 달 운세는|\d+월 운/.test(s.replace("올해·이번 달 운세가 아니에요", "")), s);
});

test("화면 데이터: 결과 순서용 필드와 캐릭터", () => {
  const v = view("1990-05-15", "14:20");
  assert.equal(v.character.name, "독립형 승부사");
  assert.ok(v.coreTraits.length >= 5 && v.strengths.length >= 5 && v.cautions.length >= 3);
  assert.equal(v.elements.length, 5);
  assert.equal(v.sections.length, 5);
  assert.equal(v.premium.length, 3);
  assert.ok(v.disclaimer.includes("엔터테인먼트"));
});

test("화면 데이터: 경계 위험이면 자연어 안내, 아니면 없음", () => {
  const near = view("2020-02-04", "17:50");
  assert.ok(near.notices.includes(NOTICE_TEXT.BOUNDARY_RISK));
  assert.equal(NOTICE_TEXT.BOUNDARY_RISK, "출생 시각이 절기 경계와 가까워 Beta 계산 기준에 따라 일부 결과가 달라질 수 있어요.");
  assert.ok(!view("2020-06-10", "12:00").notices.includes(NOTICE_TEXT.BOUNDARY_RISK));
});

test("화면 데이터: 시간 미상·입춘 당일 기둥 표시는 고르지 않는다", () => {
  const u = view("2010-02-04", null);
  assert.deepEqual(u.pillars.map((p) => p.main), ["?", "?", u.pillars[2]!.main, "–"]);
  assert.ok(u.notices.some((n) => n.includes("출생 시간을 입력하면")));
  assert.ok(u.elementNote?.includes("확정된"));
});

test("오류 문구: 엔진 오류 코드마다 사용자 문구가 있다", () => {
  for (const c of ["NONEXISTENT_LOCAL_TIME", "AMBIGUOUS_LOCAL_TIME", "OUT_OF_COVERAGE", "DAY_MASTER_UNAVAILABLE"]) assert.ok(RESULT_ERROR_TEXT[c], c);
});

test("공유: 문구에 생년월일·시간·기둥이 없고 상위 3개 능력치, 공개 URL 은 설정으로", () => {
  const r = ok("1990-05-15", "14:20");
  const text = buildShareText(r.free, { publicUrl: null });
  assert.ok(text.includes("독립형 승부사") && text.includes("너도 한번 해봐"));
  for (const bad of ["1990", "05-15", "14:20", "경오", "경진"]) assert.ok(!text.includes(bad), bad);
  assert.ok(!text.includes("http"));
  assert.ok(buildShareText(r.free, { publicUrl: "https://example.test" }).endsWith("https://example.test"));
  const card = shareCardData(r.free);
  assert.equal(card.topStats.length, 3);
  const sorted = [...r.free.scores].map((s) => s.value).sort((a, b) => b - a).slice(0, 3);
  assert.deepEqual(card.topStats.map((s) => s.value), sorted);
});

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const UUID2 = "123e4567-e89b-42d3-a456-426614174001";
const meta = () => {
  const r = ok("1990-05-15", "14:20");
  return { feedbackId: UUID, resultId: UUID2, createdAt: "2026-10-05T00:00:00.000Z", versions: r.free.versions, resultTraits: { characterId: r.free.character.id, timeKnown: true, boundaryRisk: false, uncertainPillarCount: 0 } };
};
const draft = (o: Partial<FeedbackDraft> = {}): FeedbackDraft => ({ similarity: 4, bestMatch: ["personality"], worstMatch: "none", shareIntent: "maybe", comment: "", ...o });

test("피드백: 만족도는 필수, 나머지는 선택. 잘못된 값 거부", () => {
  assert.deepEqual(buildFeedbackRecord(draft({ similarity: null }), meta()), { ok: false, code: "SIMILARITY_REQUIRED" });
  assert.equal(buildFeedbackRecord(draft({ similarity: 6 }), meta()).ok, false);
  assert.equal(buildFeedbackRecord(draft({ bestMatch: ["money" as never] }), meta()).ok, false);
  assert.equal(buildFeedbackRecord(draft(), { ...meta(), resultId: "19900515-1420-female" }).ok, false, "개인정보형 id 거부");
  const okr = buildFeedbackRecord(draft({ bestMatch: [], shareIntent: null, comment: "   " }), meta());
  assert.ok(okr.ok);
  if (okr.ok) assert.equal(okr.record.comment, null);
});

test("피드백 레코드: 버전 묶음 포함, 생년월일·시각·성별 필드 없음, 댓글 500자 제한", () => {
  const r = buildFeedbackRecord(draft({ comment: "가".repeat(800), bestMatch: ["career", "career", "love"] }), meta());
  assert.ok(r.ok);
  if (!r.ok) return;
  const rec = r.record;
  for (const k of ["engineVersion", "schemaVersion", "interpretationVersion", "scoreVersion", "solarTermProviderVersion", "policyVersion"]) assert.ok((rec.versions as unknown as Record<string, string>)[k], k);
  assert.equal(rec.comment!.length, 500);
  assert.deepEqual([...rec.bestMatch], ["career", "love"]);
  const json = JSON.stringify(rec);
  assert.ok(!/birth|gender|1990|14:20|female/.test(json), json.slice(0, 200));
});

test("피드백 저장소: 메모리 저장 / 미설정 저장소는 저장한 척하지 않는다", async () => {
  const r = buildFeedbackRecord(draft(), meta());
  assert.ok(r.ok);
  if (!r.ok) return;
  const mem = createMemoryFeedbackRepository();
  assert.deepEqual(await mem.submit(r.record), { ok: true, storage: "memory" });
  assert.equal(mem.records.length, 1);
  const un = createUnconfiguredFeedbackRepository();
  assert.deepEqual(await un.submit(r.record), { ok: false, reason: "NOT_CONFIGURED" });
  assert.equal(un.kind, "unconfigured");
});

test("피드백 지표: 평균 만족도, 5점 비율, 잘 맞은/안 맞은 영역, 공유 의향, 버전별 평균", () => {
  const recs = [5, 4, 5, 2].map((s, i) => {
    const r = buildFeedbackRecord(draft({ similarity: s, bestMatch: i % 2 ? ["love"] : ["personality", "career"], worstMatch: i === 3 ? ["wealth"] : "none", shareIntent: i % 2 ? "yes" : "no" }), meta());
    assert.ok(r.ok);
    return r.ok ? r.record : (null as never);
  });
  const m = feedbackMetrics(recs);
  assert.equal(m.count, 4);
  assert.equal(m.averageSimilarity, 4);
  assert.equal(m.topScoreRate, 0.5);
  assert.equal(m.bestAreaCounts.personality, 2);
  assert.equal(m.worstAreaCounts.wealth, 1);
  assert.deepEqual(m.shareIntent, { no: 2, maybe: 0, yes: 2 });
  assert.equal(Object.values(m.byInterpretationVersion)[0]!.average, 4);
});

test("이벤트: track(event, props) 추상화, 개인정보 키 제거(정상 키는 유지), sink 오류는 흐름을 막지 않는다", () => {
  const mem = createMemorySink();
  const broken: AnalyticsSink = { id: "broken", send: () => { throw new Error("down"); } };
  const track = createTracker([broken, mem], { sessionId: "s1", now: () => "2026-10-05T00:00:00Z" });
  const e = track("calculation_complete", { birthDate: "1990-05-15", birthTime: "14:20", gender: "female", timeKnown: true, engineVersion: "x" }, UUID);
  assert.deepEqual(e.props, { timeKnown: true, engineVersion: "x" });
  assert.equal(mem.events.length, 1);
  assert.equal(mem.events[0]!.resultId, UUID);
  assert.deepEqual(sanitizeProps({ comment: "개인 이야기", productId: "p" }), { productId: "p" });
});

test("이벤트 지표: 방문→입력, 입력→결과, 결과→공유, 결과→Premium 클릭/관심", () => {
  const mem = createMemorySink();
  const mk = (sid: string) => createTracker([mem], { sessionId: sid, now: () => "t" });
  const a = mk("a");
  a("landing_view"); a("input_start"); a("result_view"); a("share_click"); a("premium_money_click"); a("premium_money_interest");
  const b = mk("b");
  b("landing_view"); b("input_start"); b("result_view"); b("premium_love_click");
  const c = mk("c");
  c("landing_view");
  const m = funnelMetrics(mem.events);
  assert.equal(m.sessions, 3);
  assert.equal(m.landingToInputRate, 2 / 3);
  assert.equal(m.inputToResultRate, 1);
  assert.equal(m.resultToShareRate, 0.5);
  assert.equal(m.resultToPremiumClickRate, 1);
  assert.equal(m.resultToPremiumInterestRate, 0.5);
});

test("웹 코드: Mock 계산·난수 계산이 없고, 무작위 값은 레코드 id(runtime.ts)에서만", () => {
  const dir = `${process.cwd()}/web/src`;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    const t = readFileSync(`${dir}/${f}`, "utf8");
    assert.ok(!/Math\.random/.test(t), `${f}: Math.random`);
    assert.ok(!/\bBASE\b|\brng\(|샘플|Mock 결제|mock/i.test(t.replace(/createMemorySink|memory/gi, "")), `${f}: mock 흔적`);
    if (f !== "runtime.ts") assert.ok(!/getRandomValues|randomUUID/.test(t), `${f}: 무작위 값은 runtime.ts 에서만`);
  }
  const html = readFileSync(`${process.cwd()}/web/index.html`, "utf8");
  assert.ok(!/<script>(?!\s*<\/script>)/.test(html), "index.html 에 인라인 계산 스크립트 없음");
  assert.ok(!/샘플|Mock/.test(html), "미리보기 Mock 문구 없음");
});
