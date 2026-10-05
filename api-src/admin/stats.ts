// POST /api/admin/stats — 운영자 대시보드 통계. 운영자 비밀번호(Authorization: Bearer)가 맞을 때만 응답.
// 본문: { days: 1|7|30|90|365, source: "production"|"development"|"all", csv?: true }
import { buildDashboard, feedbackCsv, PERIOD_DAYS, type EventRow, type FeedbackRow, type SourceFilter } from "../../src/server/admin/stats";
import { checkAdmin, readRows, supabaseReadConfig } from "../../api-lib/admin";
import { json, readJson } from "../../api-lib/env";

export async function POST(request: Request): Promise<Response> {
  const denied = await checkAdmin(request, process.env);
  if (denied) return noIndex(denied);
  const body = (await readJson(request)) ?? {};
  const days = PERIOD_DAYS.includes(body.days as (typeof PERIOD_DAYS)[number]) ? (body.days as number) : 30;
  const source: SourceFilter = body.source === "development" || body.source === "all" ? body.source : "production";
  const cfg = supabaseReadConfig(process.env);
  if (!cfg) return noIndex(json(503, { code: "STORAGE_NOT_CONFIGURED", message: "서버에 Supabase Secret Key(SUPABASE_SECRET_KEY)가 설정되지 않았어요." }));
  const now = new Date();
  const fromIso = new Date(now.getTime() - days * 86400000).toISOString();
  try {
    const [fb, ev] = await Promise.all([
      readRows<FeedbackRow>(cfg, "beta_feedback", fromIso, source),
      body.csv === true ? Promise.resolve({ rows: [] as EventRow[], truncated: false }) : readRows<EventRow>(cfg, "beta_events", fromIso, source),
    ]);
    if (body.csv === true) return noIndex(json(200, { csv: feedbackCsv(fb.rows), count: fb.rows.length }));
    return noIndex(json(200, buildDashboard({ feedback: fb.rows, events: ev.rows, now, days, source, truncated: fb.truncated || ev.truncated })));
  } catch {
    // 키·주소·응답 본문은 기록하지 않는다
    console.error("[admin-stats]", JSON.stringify({ code: "STORAGE_READ_FAILED" }));
    return noIndex(json(503, { code: "STORAGE_READ_FAILED", message: "Supabase 에서 데이터를 읽지 못했어요. 잠시 후 다시 시도해 주세요." }));
  }
}

function noIndex(r: Response): Response {
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  return r;
}
