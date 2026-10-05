// 운영자 대시보드 서버 공용: 운영자 비밀번호 확인 + Supabase 읽기. 서버에서만 실행된다.
//
// 환경 변수 (Vercel → Settings → Environment Variables, 사용자가 직접 입력)
//  ADMIN_DASHBOARD_TOKEN  운영자 비밀번호 (24자 이상의 무작위 문자열). 없으면 대시보드는 "설정 안 됨"으로 잠긴다.
//  SUPABASE_URL / SUPABASE_SECRET_KEY  (결제와 같은 서버 전용 값)
// 비밀번호와 Secret Key 는 브라우저 번들·응답·로그 어디에도 넣지 않는다.

import { createHash, timingSafeEqual } from "node:crypto";
import { EVENT_COLUMNS, FEEDBACK_COLUMNS, type EventRow, type FeedbackRow, type SourceFilter } from "../src/server/admin/stats";
import { json, supabaseServerKey } from "./env";

export const ADMIN_TOKEN_MIN_LENGTH = 24;
export const MAX_ROWS = 50000;
const PAGE = 1000;

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

/** 운영자 비밀번호 확인. 통과하면 null, 아니면 오류 응답 */
export async function checkAdmin(request: Request, env: Record<string, string | undefined>, delay: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Promise<Response | null> {
  const expected = (env.ADMIN_DASHBOARD_TOKEN ?? "").trim();
  if (expected.length < ADMIN_TOKEN_MIN_LENGTH) return json(503, { code: "ADMIN_NOT_CONFIGURED", message: "운영자 페이지가 아직 설정되지 않았어요. Vercel 에 ADMIN_DASHBOARD_TOKEN 을 넣어 주세요." });
  const m = /^Bearer\s+(.+)$/.exec(request.headers.get("authorization") ?? "");
  const given = (m?.[1] ?? "").trim();
  // 길이와 무관하게 같은 시간이 걸리도록 해시끼리 비교
  if (!given || !timingSafeEqual(digest(given), digest(expected))) {
    await delay(700); // 반복 추측을 느리게
    return json(401, { code: "ADMIN_UNAUTHORIZED", message: "운영자 비밀번호가 맞지 않아요." });
  }
  return null;
}

export function supabaseReadConfig(env: Record<string, string | undefined>): { url: string; key: string } | null {
  const url = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = supabaseServerKey(env)?.key;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) return null;
  return { url, key };
}

/** PostgREST 에서 기간·출처 조건으로 행을 페이지 단위로 읽는다 (최대 MAX_ROWS) */
export async function readRows<T>(
  cfg: { url: string; key: string },
  table: "beta_feedback" | "beta_events",
  fromIso: string,
  source: SourceFilter,
  fetchFn: typeof fetch = fetch,
): Promise<{ rows: T[]; truncated: boolean }> {
  const select = table === "beta_feedback" ? FEEDBACK_COLUMNS : EVENT_COLUMNS;
  const q = new URLSearchParams({ select, created_at: `gte.${fromIso}`, order: "created_at.asc" });
  if (source !== "all") q.set("source", `eq.${source}`);
  const headers: Record<string, string> = { apikey: cfg.key, ...(cfg.key.startsWith("sb_") ? {} : { Authorization: `Bearer ${cfg.key}` }) };
  const rows: T[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const res = await fetchFn(`${cfg.url}/rest/v1/${table}?${q}`, { headers: { ...headers, "Range-Unit": "items", Range: `${offset}-${offset + PAGE - 1}` } });
    if (!res.ok && res.status !== 416) throw new Error(`supabase ${table} ${res.status}`);
    if (res.status === 416) break;
    const page = (await res.json()) as T[];
    rows.push(...page);
    if (page.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export type { EventRow, FeedbackRow };
