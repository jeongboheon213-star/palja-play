import { json, supabaseServerKey } from "./env";
import type { AdminFeedback } from "../src/lib/feedback/admin";

export async function adminFeedback(request: Request, env: Record<string, string | undefined>, fetcher: typeof fetch = (input, init) => fetch(input, init)): Promise<Response> {
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  if (![7, 30, 90].includes(days)) return json(400, { message: "조회 기간을 확인해 주세요." });
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = supabaseServerKey(env)?.key;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) return json(503, { code: "FEEDBACK_CONFIG", message: "저장소 설정을 확인해 주세요." });
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows: AdminFeedback[] = [];
  let code = "FEEDBACK_FETCH";
  try {
    for (let offset = 0; offset <= 10000; offset += 1000) {
      const query = new URLSearchParams({ select: "created_at,similarity,best_match,worst_match,worst_none,share_intent,comment,character_id,interpretation_version,source", created_at: `gte.${since}`, source: "eq.production", order: "created_at.desc,id.desc", limit: "1000", offset: String(offset) });
      code = "FEEDBACK_FETCH";
      const response = await fetcher(`${url}/rest/v1/beta_feedback?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000), redirect: "manual" });
      if (!response.ok) { code = `FEEDBACK_HTTP_${response.status}`; throw new Error("storage"); }
      code = "FEEDBACK_DATA";
      const page = await response.json() as AdminFeedback[];
      if (!Array.isArray(page)) throw new Error("storage");
      if (offset === 10000) return json(200, { rows, truncated: page.length > 0, days, since, fetchedAt: new Date().toISOString() });
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return json(200, { rows, truncated: false, days, since, fetchedAt: new Date().toISOString() });
  } catch { return json(503, { code, message: "피드백을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }); }
}
