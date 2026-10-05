import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { normalizePurchaseCode } from "../src/server/payments/service";
import { json, supabaseServerKey } from "./env";
/** Only trust Vercel's overwritten forwarded header in Vercel. Else use one shared bucket. */
export function premiumLimitHashes(request: Request, code: unknown, key: string, vercel: boolean, trustedClientIp?: string) {
  const raw = trustedClientIp ?? (vercel ? request.headers.get("x-vercel-forwarded-for")?.trim() : null);
  // IPv6 /64 grouping prevents trivial address rotation within the same network.
  let client = "unidentified";
  if (raw && isIP(raw) === 4) client = raw;
  if (raw && isIP(raw) === 6) {
    const normalized = new URL(`http://[${raw}]/`).hostname.slice(1, -1);
    const [left, right] = normalized.split("::");
    const a = left ? left.split(":") : [];
    const b = right ? right.split(":") : [];
    const full = right !== undefined ? [...a, ...Array(8 - a.length - b.length).fill("0"), ...b] : a;
    client = full.slice(0, 4).map((p) => p.padStart(4, "0")).join(":");
  }
  const digest = (context: string, value: string) => createHmac("sha256", key).update(`premium-limit-v1:${context}:${value}`).digest("hex");
  return { p_client_hash: digest("client", client), p_code_hash: digest("code", normalizePurchaseCode(code) ?? "invalid") };
}
export async function enforcePremiumLimit(request: Request, code: unknown, env: Record<string, string | undefined> = process.env, fetchFn: typeof fetch = fetch, trustedClientIp?: string): Promise<Response | null> {
  const key = supabaseServerKey(env)?.key;
  const url = env.SUPABASE_URL?.trim();
  if (!key || !url) return json(503, { code: "RATE_LIMIT_UNAVAILABLE", message: "구매 확인을 잠시 이용할 수 없어요." });
  try {
    const response = await fetchFn(`${url.replace(/\/+$/, "")}/rest/v1/rpc/consume_premium_attempt`, {
      method: "POST", headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
      body: JSON.stringify(premiumLimitHashes(request, code, key, env.VERCEL === "1", trustedClientIp)),
    });
    if (!response.ok) throw new Error("limiter unavailable");
    const allowed: unknown = await response.json();
    if (allowed === true) return null;
    if (allowed !== false) throw new Error("invalid limiter response");
    const result = json(429, { code: "TOO_MANY_ATTEMPTS", message: "구매 확인 요청이 많아요. 10분 뒤 다시 시도해 주세요." });
    result.headers.set("Retry-After", "600");
    return result;
  } catch { return json(503, { code: "RATE_LIMIT_UNAVAILABLE", message: "구매 확인을 잠시 이용할 수 없어요. 잠시 후 다시 시도해 주세요." }); }
}
