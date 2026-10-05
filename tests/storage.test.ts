// Supabase 행 변환 테스트: migrations SQL 컬럼과 일치, 개인정보 없음.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { computeBetaResult } from "../src/lib/engine";
import { buildFeedbackRecord } from "../src/lib/feedback/feedback";
import { createTracker, createMemorySink, EVENT_NAMES } from "../src/lib/analytics/events";
import { SUPABASE_TABLES, supabaseInsertRequest, toEventRow, toFeedbackRow } from "../src/lib/storage/supabaseRows";

const dir = `${process.cwd()}/supabase/migrations`;
const sql = readdirSync(dir).map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
const columnsOf = (table: string): string[] => {
  const body = new RegExp(String.raw`create table if not exists public\.${table} \(([\s\S]*?)\n\);`).exec(sql)![1]!;
  return body.split("\n").map((l) => /^\s{2}([a-z_]+)\s/.exec(l)?.[1]).filter((x): x is string => !!x);
};

function record() {
  const r = computeBetaResult({ birthDate: "1990-05-15", birthTime: "14:20", gender: "female", calendar: "solar", birthCountry: "KR" });
  assert.ok(r.ok);
  if (!r.ok) throw new Error("x");
  const b = buildFeedbackRecord(
    { similarity: 5, bestMatch: ["career"], worstMatch: "none", shareIntent: "yes", comment: "좋아요" },
    { feedbackId: "123e4567-e89b-42d3-a456-426614174000", resultId: "123e4567-e89b-42d3-a456-426614174001", createdAt: "2026-10-05T00:00:00.000Z", versions: r.free.versions, resultTraits: { characterId: r.free.character.id, timeKnown: true, boundaryRisk: false, uncertainPillarCount: 0 } },
  );
  assert.ok(b.ok);
  if (!b.ok) throw new Error("x");
  return b.record;
}

test("피드백 행: SQL 테이블 컬럼과 정확히 일치(서버 기본값 created_at 제외), 개인정보 없음", () => {
  const row = toFeedbackRow(record(), "development");
  assert.deepEqual(Object.keys(row).sort(), columnsOf(SUPABASE_TABLES.feedback).filter((c) => c !== "created_at").sort());
  assert.equal(row.worst_none, true);
  assert.deepEqual(row.worst_match, []);
  assert.ok(!/1990|14:20|female|birth|gender/.test(JSON.stringify(row)));
});

test("이벤트 행: SQL 컬럼과 일치, 이벤트 이름 목록이 SQL CHECK 와 같다", () => {
  const mem = createMemorySink();
  const e = createTracker([mem], { sessionId: "123e4567-e89b-42d3-a456-426614174002", now: () => "2026-10-05T00:00:00Z" })("result_view", { birthDate: "x", characterId: "c" });
  const row = toEventRow(e, "production");
  assert.deepEqual(Object.keys(row).sort(), columnsOf(SUPABASE_TABLES.events).filter((c) => !["id", "created_at"].includes(c)).sort());
  assert.deepEqual(row.props, { characterId: "c" });
  for (const n of EVENT_NAMES) assert.ok(sql.includes(`'${n}'`), n);
});

test("SQL: RLS 켜짐, anon 은 INSERT 만 (SELECT/UPDATE/DELETE 정책 없음), 개인정보 컬럼 없음", () => {
  for (const t of ["beta_feedback", "beta_events"]) {
    assert.ok(sql.includes(`alter table public.${t} enable row level security`), t);
    assert.ok(sql.includes(`grant insert on public.${t} to anon`), t);
  }
  assert.ok(!/for (select|update|delete|all)/i.test(sql));
  // 2026-10-05: orders 에 서버 역할(service_role) 권한이 추가되어, "누구에게" 주는지까지 검사하도록 정밀화.
  // 브라우저 역할(anon/authenticated/public)에는 INSERT 외 어떤 grant 도 없어야 한다 (원래 의도 유지).
  const grants = sql.replace(/^--.*$/gm, "").match(/grant [^;]+;/gi) ?? [];
  for (const g of grants) {
    if (/\bto\s+(anon|authenticated|public)\b/i.test(g)) assert.match(g, /^grant insert on public\.beta_(feedback|events) to anon;$/i, g);
    else assert.match(g, /to service_role;$/i, g);
  }
  assert.ok(!/birth|gender|phone|email/i.test(sql.replace(/^--.*$/gm, "")));
});

test("SQL orders: RLS 켜짐, 브라우저 역할 권한 회수·정책 없음, 서버 역할은 삭제 권한 없음, 함수 외부 호출 차단", () => {
  const orders = readFileSync(`${dir}/20261005010000_orders.sql`, "utf8").replace(/^--.*$/gm, "");
  assert.ok(orders.includes("alter table public.orders enable row level security"));
  assert.ok(orders.includes("revoke all on public.orders from public, anon, authenticated"));
  assert.ok(!/create policy[^;]*on public\.orders/i.test(orders), "orders 에 브라우저용 정책 없음");
  assert.ok(!/grant[^;]*on public\.orders to (anon|authenticated|public)/i.test(orders));
  assert.match(orders, /grant select, insert, update on public\.orders to service_role;/);
  assert.ok(!/grant[^;]*delete[^;]*on public\.orders/i.test(orders), "삭제 권한 없음");
  assert.ok(orders.includes("revoke all on function public.orders_touch() from public, anon, authenticated"));
  assert.ok(orders.includes("set search_path = ''"));
  assert.ok(!/card_number|card_no|cvc|birth|gender|phone/i.test(orders), "민감정보 컬럼 없음");
});

test("SQL orders 컬럼 ↔ 서버 코드(NewOrder·OrderPatch) 일치", () => {
  const cols = columnsOf("orders");
  for (const c of ["order_id", "result_id", "product_id", "amount", "currency", "status", "chart_key", "purchase_code_hash", "toss_mode", "source", "payment_key", "method", "failure_code", "failure_message", "approved_at", "refund_reason"]) {
    assert.ok(cols.includes(c), `orders.${c} 없음`);
  }
});

test("REST 요청: return=minimal, anon 키 헤더, 테이블 경로", () => {
  const r = supabaseInsertRequest("https://abc.supabase.co/", "anon-key", "beta_events", { a: 1 });
  assert.equal(r.url, "https://abc.supabase.co/rest/v1/beta_events");
  assert.equal(r.init.headers.Prefer, "return=minimal");
  assert.equal(r.init.headers.apikey, "anon-key");
  assert.equal(r.init.body, '{"a":1}');
});
