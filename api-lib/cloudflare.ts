import { POST as orders } from "../api-src/orders";
import { POST as confirm } from "../api-src/payments/confirm";
import { POST as fail } from "../api-src/payments/fail";
import { POST as refund } from "../api-src/payments/refund-unopened";
import { POST as report } from "../api-src/premium/report";
import { json } from "./env";
import { adminIdentity } from "./admin-access";
import { adminFeedback } from "./admin-feedback";

type Env = Record<string, unknown> & { ASSETS: { fetch(request: Request): Promise<Response> } };
const routes = new Map([
  ["/api/orders", orders], ["/api/payments/confirm", confirm],
  ["/api/payments/fail", fail], ["/api/payments/refund-unopened", refund],
  ["/api/premium/report", report],
]);

export default {
  async fetch(request: Request, bindings: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/")) {
      const env = Object.fromEntries(Object.entries(bindings).filter(([, v]) => typeof v === "string")) as Record<string, string>;
      let code = "AUTH_CLAIMS";
      if (!await adminIdentity(request, env, fetch, reason => { code = reason; })) return json(403, { code, message: "관리자 인증을 확인하지 못했습니다. 오류 코드를 관리자에게 알려 주세요." });
      if (request.method !== "GET") return json(405, { message: "허용되지 않은 요청입니다." });
      if (path === "/api/admin/feedback") return adminFeedback(request, env);
      if (path.startsWith("/api/")) return json(404, { code: "NOT_FOUND" });
      const response = await bindings.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      return new Response(response.body, { status: response.status, headers });
    }
    if (!path.startsWith("/api/")) return bindings.ASSETS.fetch(request);
    const handler = routes.get(path);
    if (!handler) return json(404, { code: "NOT_FOUND" });
    if (request.method !== "POST") {
      const response = json(405, { code: "METHOD_NOT_ALLOWED" });
      response.headers.set("Allow", "POST");
      return response;
    }
    // Copy strings only, per request. Never mutate process.env or trust forwarded headers.
    const env: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(bindings)) if (typeof value === "string") env[key] = value;
    env.VERCEL = undefined;
    env.VERCEL_ENV = "production";
    // This migration is TEST-only even if a dashboard setting accidentally requests LIVE.
    if (env.PALJA_PAYMENTS_MODE === "live") return json(503, { code: "LIVE_PAYMENTS_LOCKED" });
    const cf = (request as Request & { cf?: unknown }).cf;
    const ip = cf && typeof cf === "object" ? request.headers.get("cf-connecting-ip")?.trim() : undefined;
    try { return await handler(request, env, ip); }
    catch { return json(500, { code: "SERVER_ERROR", message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." }); }
  },
};
