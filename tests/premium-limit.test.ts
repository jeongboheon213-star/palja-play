import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { enforcePremiumLimit, premiumLimitHashes } from "../api-lib/premium-limit";
const env = { SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_fixture", VERCEL: "1" };
const request = (ip: string) => new Request("https://example.com/api/premium/report", { headers: { "x-vercel-forwarded-for": ip } });
test("limiter scopes hash network and normalized code, ignore spoofed untrusted headers", () => {
  const a = premiumLimitHashes(request("203.0.113.1"), "abcd-efgh-jklm-npqr", "fixture", true);
  const b = premiumLimitHashes(request("203.0.113.1"), "ABCDEFGHIJKLMNOP".replace("I", "J"), "fixture", true);
  assert.equal(a.p_client_hash, b.p_client_hash);
  assert.notEqual(a.p_code_hash, b.p_code_hash);
  assert.deepEqual(a, premiumLimitHashes(request("203.0.113.1"), "ABCD EFGH JKLM NPQR", "fixture", true));
  assert.notEqual(a.p_client_hash, premiumLimitHashes(request("203.0.113.2"), "", "fixture", true).p_client_hash);
  assert.deepEqual(premiumLimitHashes(request("203.0.113.1"), "", "fixture", false), premiumLimitHashes(request("203.0.113.2"), "", "fixture", false));
  const v6a = premiumLimitHashes(request("2001:db8::1"), "", "fixture", true);
  const v6b = premiumLimitHashes(request("2001:0db8:0000:0000::abcd"), "", "fixture", true);
  assert.deepEqual(v6a, v6b);
  assert.ok(!JSON.stringify(a).includes("203.0.113") && !JSON.stringify(a).includes("ABCD"));
});
test("limit allow, deny, network/missing migration fail closed", async () => {
  const response = (body: unknown, status = 200) => (async (_url: string, init: RequestInit) => {
    const j = JSON.parse(init.body as string);
    assert.match(j.p_client_hash, /^[0-9a-f]{64}$/); assert.match(j.p_code_hash, /^[0-9a-f]{64}$/);
    assert.equal((init.headers as Record<string, string>).Authorization, undefined);
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  assert.equal(await enforcePremiumLimit(request("203.0.113.1"), "", env, response(true)), null);
  const blocked = await enforcePremiumLimit(request("203.0.113.1"), "", env, response(false));
  assert.equal(blocked?.status, 429); assert.equal(blocked?.headers.get("Retry-After"), "600");
  for (const fn of [response({}, 404), response("true"), (async () => { throw new Error("network"); }) as typeof fetch]) {
    assert.equal((await enforcePremiumLimit(request("203.0.113.1"), "", env, fn))?.status, 503);
  }
});
test("SQL and routes retain fail-closed boundaries, server-only privileges and atomic first-open", () => {
  const sql = readFileSync("supabase/migrations/20261005040000_content_access_and_limits.sql", "utf8");
  assert.match(sql, /for update/); assert.match(sql, /content_opened_at = now\(\)/);
  assert.match(sql, /first content provision is immutable/);
  assert.match(sql, /alter table public.premium_rate_buckets enable row level security/);
  assert.match(sql, /revoke all on public.premium_rate_buckets from public, anon, authenticated, service_role/);
  assert.match(sql, /on conflict \(scope, window_start\) do update/);
  assert.match(sql, /client_n > 30/); assert.match(sql, /code_n <= 15/); assert.match(sql, /n > 1000/);
  for (const path of ["api-src/premium/report.ts", "api-src/payments/refund-unopened.ts"]) {
    const src = readFileSync(path, "utf8"); assert.match(src, /enforcePremiumLimit/); assert.match(src, /if \(limited\) return limited/);
  }
  const browser = readFileSync("web/src/payments.ts", "utf8");
  const handle = browser.slice(browser.indexOf("export async function handlePaymentReturn"), browser.indexOf("export async function fetchReport"));
  assert.ok(!handle.includes("await fetchReport"));
});
