// 운영자 통계: 집계 정확성, 운영자 비밀번호 확인, Supabase 읽기 범위, 개인정보·비밀 노출 없음.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDashboard, feedbackCsv, FEEDBACK_COLUMNS, EVENT_COLUMNS, kstDate, type EventRow, type FeedbackRow } from "../src/server/admin/stats";
import { checkAdmin, readRows } from "../api-lib/admin";

const NOW = new Date("2026-10-05T03:00:00Z"); // 한국 시간 2026-10-05 12:00

function fbRow(over: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    result_id: "00000000-0000-4000-8000-0000000000aa",
    created_at: "2026-10-04T10:00:00Z",
    source: "production",
    engine_version: "e1",
    interpretation_version: "i1",
    score_version: "s1",
    character_id: "gyeong-challenger",
    time_known: true,
    boundary_risk: false,
    similarity: 4,
    best_match: ["love"],
    worst_match: ["wealth"],
    worst_none: false,
    share_intent: "yes",
    comment: null,
    ...over,
  };
}
const ev = (name: string, session: string, props: Record<string, unknown> = {}, at = "2026-10-04T10:00:00Z", result: string | null = null): EventRow => ({ created_at: at, name, session_id: session, result_id: result, props });

test("kstDate: UTC 15시 이후는 한국 다음 날", () => {
  assert.equal(kstDate("2026-10-04T14:59:00Z"), "2026-10-04");
  assert.equal(kstDate("2026-10-04T15:00:00Z"), "2026-10-05");
  assert.equal(kstDate("nope"), null);
});

test("퍼널: 세션 기준(같은 사람이 여러 번 눌러도 1), 단계별 비율", () => {
  const events = [
    ev("landing_view", "a", { via: "direct" }), ev("landing_view", "a", { via: "direct" }),
    ev("landing_view", "b", { via: "battle" }), ev("landing_view", "c", { via: "direct" }), ev("landing_view", "d", { via: "battle-invalid" }),
    ev("input_start", "a"), ev("input_start", "b"), ev("input_start", "c"),
    ev("calculation_complete", "a"), ev("calculation_complete", "b"),
    ev("result_view", "a", { characterId: "gyeong-challenger", battleOutcome: null }, undefined, "r1"),
    ev("result_view", "b", { characterId: "gap-pioneer", battleOutcome: "win" }, undefined, "r2"),
    ev("share_click", "a", { method: "copy-clipboard", device: "pc" }), ev("share_click", "a", { method: "qr", device: "pc" }),
    ev("feedback_submit", "b"),
    ev("premium_money_click", "a", { productId: "premium_money" }), ev("premium_money_interest", "a"), ev("premium_love_click", "b"),
  ];
  const d = buildDashboard({ feedback: [fbRow()], events, now: NOW, days: 7, source: "production" });
  assert.deepEqual(d.funnel.map((f) => f.sessions), [4, 3, 2, 2, 1, 1]);
  assert.equal(d.funnel[1]!.ofPrev, 75);
  assert.equal(d.funnel[3]!.ofTop, 50);
  assert.equal(d.funnel[4]!.ofPrev, 50, "공유는 결과 본 사람 대비");
  assert.equal(d.totals.visitors, 4);
  assert.equal(d.totals.results, 2);
  assert.equal(d.totals.shareSessions, 1);
  assert.equal(d.totals.shareRate, 50);
  assert.equal(d.totals.feedbackRate, 50);
  assert.equal(d.totals.premiumInterestSessions, 1);
  assert.deepEqual(d.landingVia.map((x) => [x.key, x.count]), [["direct", 3], ["battle", 1], ["battle-invalid", 1]]);
  assert.equal(d.landingVia[0]!.label, "직접 방문");
  assert.deepEqual(d.shareMethods.map((x) => x.label).sort(), ["QR 보기", "링크 복사"]);
  assert.deepEqual(d.battleOutcomes.map((x) => [x.key, x.count]), [["win", 1]]);
  assert.deepEqual(d.premium.map((p) => [p.productId, p.clickSessions, p.interestSessions]), [["premium_money", 1, 1], ["premium_love", 1, 0], ["premium_career", 0, 0]]);
  assert.equal(d.characters.length, 2);
});

test("피드백 집계: 공감도 분포·평균, 영역, 캐릭터별, 의견 최신순, 표본 적음 안내", () => {
  const feedback = [
    fbRow({ similarity: 5, best_match: ["love", "career"], worst_match: [], worst_none: true, comment: "  연애가 소름  ", created_at: "2026-10-04T01:00:00Z" }),
    fbRow({ id: "x2", similarity: 2, character_id: "gap-pioneer", share_intent: null, time_known: false, comment: "재물은 틀려요", created_at: "2026-10-04T05:00:00Z" }),
    fbRow({ id: "x3", similarity: 4, comment: "" }),
  ];
  const d = buildDashboard({ feedback, events: [], now: NOW, days: 30, source: "production" });
  assert.equal(d.totals.avgSimilarity, 3.67);
  assert.deepEqual(d.feedback.similarity.map((s) => [s.key, s.count]), [["5", 1], ["4", 1], ["3", 0], ["2", 1], ["1", 0]]);
  assert.deepEqual(d.feedback.shareIntent.map((s) => [s.key, s.count]), [["yes", 2], ["maybe", 0], ["no", 0], ["none", 1]]);
  assert.equal(d.feedback.bestMatch.find((x) => x.key === "love")!.count, 3); // 3건 모두 연애 선택
  assert.equal(d.feedback.bestMatch.find((x) => x.key === "career")!.count, 1);
  assert.equal(d.feedback.worstMatch.find((x) => x.key === "wealth")!.count, 2);
  assert.equal(d.feedback.worstNone, 1);
  assert.equal(d.feedback.byCharacter[0]!.key, "gyeong-challenger");
  assert.equal(d.feedback.byCharacter[0]!.avgSimilarity, 4.5);
  assert.match(d.feedback.byCharacter[0]!.label, /독립형 승부사/);
  assert.deepEqual(d.feedback.byTimeKnown.map((g) => [g.key, g.count]), [["known", 2], ["unknown", 1]]);
  assert.equal(d.feedback.withComment, 2);
  assert.deepEqual(d.comments.map((c) => c.comment), ["재물은 틀려요", "연애가 소름"], "최신순, 앞뒤 공백 제거");
  assert.ok(d.notes.some((n) => n.includes("3건")), "30건 미만 안내");
});

test("날짜별: 기간 안의 날짜를 빈 날까지 채우고 한국 날짜로 묶는다", () => {
  const d = buildDashboard({
    feedback: [fbRow({ created_at: "2026-10-04T16:00:00Z" })],
    events: [ev("landing_view", "a", {}, "2026-10-04T16:00:00Z"), ev("result_view", "a", {}, "2026-10-04T16:00:01Z", "r1")],
    now: NOW,
    days: 7,
    source: "production",
  });
  assert.equal(d.daily.length, 8);
  const today = d.daily.find((x) => x.date === "2026-10-05")!;
  assert.deepEqual([today.visitors, today.results, today.feedback], [1, 1, 1]);
  assert.ok(d.daily.every((x, i, a) => i === 0 || a[i - 1]!.date < x.date));
});

test("빈 데이터에서도 오류 없이 0/null", () => {
  const d = buildDashboard({ feedback: [], events: [], now: NOW, days: 1, source: "all" });
  assert.equal(d.totals.avgSimilarity, null);
  assert.equal(d.totals.feedbackRate, null);
  assert.ok(d.notes.some((n) => n.includes("개발·테스트")));
});

test("CSV: 엑셀 수식 실행 방지, 쉼표·따옴표·줄바꿈 처리, 개인정보 컬럼 없음", () => {
  const csv = feedbackCsv([fbRow({ comment: '=HYPERLINK("x"), 좋아요\n둘째줄' })]);
  const [head, ...rest] = csv.split("\r\n");
  assert.ok(!/birth|gender|phone|name|time_of|raw/i.test(head!.replace("interpretation_version", "")), head);
  const body = rest.join("\r\n");
  assert.ok(body.includes(`"'=HYPERLINK(""x""), 좋아요\n둘째줄"`), body);
  assert.ok(body.startsWith("2026-10-04 19:00,"), "한국 시간");
});

test("읽는 컬럼에 개인정보 없음", () => {
  for (const c of [...FEEDBACK_COLUMNS.split(","), ...EVENT_COLUMNS.split(",")]) {
    assert.ok(!/birth|gender|sex|phone|name$|^name_|raw|pillar/i.test(c) || c === "name", c);
  }
  assert.ok(!FEEDBACK_COLUMNS.includes("*") && !EVENT_COLUMNS.includes("*"));
});

test("운영자 비밀번호: 미설정·짧음 → 503, 틀림·없음 → 401(지연), 맞음 → 통과", async () => {
  const req = (auth?: string) => new Request("http://x/api/admin/stats", { method: "POST", headers: auth ? { authorization: auth } : {} });
  const good = "a".repeat(16) + "B7c9-xYz_12345";
  let waited = 0;
  const delay = async (ms: number) => void (waited += ms);
  assert.equal((await checkAdmin(req(`Bearer ${good}`), {}, delay))!.status, 503);
  assert.equal((await checkAdmin(req("Bearer short"), { ADMIN_DASHBOARD_TOKEN: "short" }, delay))!.status, 503, "24자 미만 비밀번호는 거부(잠김)");
  assert.equal((await checkAdmin(req(), { ADMIN_DASHBOARD_TOKEN: good }, delay))!.status, 401);
  assert.equal((await checkAdmin(req(`Bearer ${good}x`), { ADMIN_DASHBOARD_TOKEN: good }, delay))!.status, 401);
  assert.equal((await checkAdmin(req(`Basic ${good}`), { ADMIN_DASHBOARD_TOKEN: good }, delay))!.status, 401);
  assert.ok(waited >= 2100, "틀릴 때마다 지연");
  assert.equal(await checkAdmin(req(`Bearer ${good}`), { ADMIN_DASHBOARD_TOKEN: ` ${good}\n` }, delay), null, "앞뒤 공백 허용");
  const denied = await checkAdmin(req("Bearer wrong"), { ADMIN_DASHBOARD_TOKEN: good }, delay);
  assert.ok(!(await denied!.text()).includes(good), "응답에 비밀번호 없음");
});

test("Supabase 읽기: 필요한 컬럼만, 기간·출처 조건, 페이지 나눔, 상한", async () => {
  const urls: string[] = [];
  const ranges: string[] = [];
  const fake = (async (url: string, init: RequestInit) => {
    urls.push(url);
    const h = init.headers as Record<string, string>;
    ranges.push(h.Range!);
    assert.equal(h.apikey, "sb_secret_test");
    assert.equal(h.Authorization, undefined, "새 Secret Key 는 apikey 헤더만");
    const start = Number(h.Range!.split("-")[0]);
    const n = start < 2000 ? 1000 : 5;
    return new Response(JSON.stringify(Array.from({ length: n }, () => ({}))), { status: 200 });
  }) as unknown as typeof fetch;
  const r = await readRows({ url: "https://abc.supabase.co", key: "sb_secret_test" }, "beta_feedback", "2026-10-01T00:00:00.000Z", "production", fake);
  assert.equal(r.rows.length, 2005);
  assert.equal(r.truncated, false);
  assert.deepEqual(ranges, ["0-999", "1000-1999", "2000-2999"]);
  const u = new URL(urls[0]!);
  assert.equal(u.pathname, "/rest/v1/beta_feedback");
  assert.equal(u.searchParams.get("select"), FEEDBACK_COLUMNS);
  assert.equal(u.searchParams.get("created_at"), "gte.2026-10-01T00:00:00.000Z");
  assert.equal(u.searchParams.get("source"), "eq.production");
  const all = await readRows({ url: "https://abc.supabase.co", key: "sb_secret_test" }, "beta_events", "x", "all", fake);
  assert.ok(all.rows.length > 0 && !urls.at(-1)!.includes("source="), "전체 보기는 출처 조건 없음");
  await assert.rejects(readRows({ url: "https://abc.supabase.co", key: "k" }, "beta_events", "x", "all", (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch));
});

test("운영자 화면: 서버 코드·비밀 미포함, 의견은 textContent, 검색 노출 차단", () => {
  const ts = readFileSync(`${process.cwd()}/web/src/admin.ts`, "utf8");
  assert.ok(!/src\/server|api-lib|SUPABASE_SECRET|ADMIN_DASHBOARD_TOKEN\s*=|sb_secret_/.test(ts));
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(ts), "사용자 글을 HTML 로 넣지 않음");
  assert.ok(!/localStorage/.test(ts), "비밀번호를 영구 저장하지 않음");
  const html = readFileSync(`${process.cwd()}/web/admin.html`, "utf8");
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  const vercel = JSON.parse(readFileSync(`${process.cwd()}/vercel.json`, "utf8")) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const admin = vercel.headers.find((x) => x.source === "/admin.html")!;
  assert.ok(admin.headers.some((x) => x.key === "X-Robots-Tag"));
  const api = readFileSync(`${process.cwd()}/api-src/admin/stats.ts`, "utf8");
  assert.ok(api.indexOf("checkAdmin(") < api.indexOf("readRows<"), "비밀번호 확인이 데이터 읽기보다 먼저");
});
