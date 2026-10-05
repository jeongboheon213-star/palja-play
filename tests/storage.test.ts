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
  assert.ok(!/grant (select|update|delete|all)/i.test(sql));
  assert.ok(!/birth|gender|phone|email/i.test(sql.replace(/^--.*$/gm, "")));
});

test("REST 요청: return=minimal, anon 키 헤더, 테이블 경로", () => {
  const r = supabaseInsertRequest("https://abc.supabase.co/", "anon-key", "beta_events", { a: 1 });
  assert.equal(r.url, "https://abc.supabase.co/rest/v1/beta_events");
  assert.equal(r.init.headers.Prefer, "return=minimal");
  assert.equal(r.init.headers.apikey, "anon-key");
  assert.equal(r.init.body, '{"a":1}');
});
