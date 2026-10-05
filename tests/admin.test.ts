import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { adminIdentity } from "../api-lib/admin-access";
import { adminFeedback } from "../api-lib/admin-feedback";
import worker from "../api-lib/cloudflare";
import { summarize, csvCell, type AdminFeedback } from "../src/lib/feedback/admin";

const env = { ADMIN_HOST: "admin.example.com", ADMIN_ACCESS_TEAM_DOMAIN: "https://test-team.cloudflareaccess.com", ADMIN_ACCESS_AUD: "application", ADMIN_EMAILS: "owner@example.com" };
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const fetchKeys = (async () => new Response(JSON.stringify({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: "key" }] }))) as typeof fetch;
function token(overrides = {}, signer = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: "RS256", kid: "key" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ iss: env.ADMIN_ACCESS_TEAM_DOMAIN, aud: ["application"], exp: now + 300, iat: now, sub: "user", email: "owner@example.com", ...overrides })).toString("base64url");
  return `${h}.${p}.${sign("RSA-SHA256", Buffer.from(`${h}.${p}`), signer).toString("base64url")}`;
}
const request = (jwt: string, host = "admin.example.com") => new Request(`https://${host}/api/admin/feedback`, { headers: { "Cf-Access-Jwt-Assertion": jwt } });

test("auth diagnostics identify failed stages without exposing credentials or accepting invalid tokens", async () => {
  let reason = "";
  const report = (code: string) => { reason = code; };
  assert.equal(await adminIdentity(request(""), env, fetchKeys, report), null);
  assert.equal(reason, "AUTH_TOKEN_MISSING");
  assert.equal(await adminIdentity(request(token()), {}, fetchKeys, report), null);
  assert.equal(reason, "AUTH_CONFIG");
  assert.equal(await adminIdentity(request(token({ email: "visitor@example.com" })), env, fetchKeys, report), null);
  assert.equal(reason, "AUTH_EMAIL");
  const failed = (async () => { throw new Error("private information"); }) as typeof fetch;
  assert.equal(await adminIdentity(request(token()), env, failed, report), null);
  assert.equal(reason, "AUTH_CERT_FETCH");
  reason = "";
  assert.equal(await adminIdentity(request(token()), env, fetchKeys, report), "owner@example.com");
  assert.equal(reason, "");
});
test("admin auth: signed owner accepted; expired, wrong audience/issuer/email/host and forged signature blocked", async () => {
  assert.equal(await adminIdentity(request(token()), env, fetchKeys), "owner@example.com");
  for (const claims of [{ exp: 1 }, { aud: ["other"] }, { iss: "https://evil.example" }, { email: "visitor@example.com" }, { nbf: Math.floor(Date.now()/1000) + 500 }]) assert.equal(await adminIdentity(request(token(claims)), env, fetchKeys), null);
  assert.equal(await adminIdentity(request(token(), "public.example.com"), env, fetchKeys), null);
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.equal(await adminIdentity(request(token({}, other.privateKey)), env, fetchKeys), null);
  assert.equal(await adminIdentity(request(token()), {}, fetchKeys), null);
});
test("admin endpoints fail closed before accessing assets or database including pages.dev", async () => {
  let accesses = 0;
  for (const path of ["/admin", "/admin/", "/api/admin/feedback"]) {
    const r = await worker.fetch(new Request(`https://example.pages.dev${path}`, { headers: { "Cf-Access-Authenticated-User-Email": "owner@example.com" } }), { ASSETS: { fetch: async () => { accesses++; return new Response("secret"); } } });
    assert.equal(r.status, 403); assert.equal(r.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(accesses, 0);
});
const row: AdminFeedback = { created_at: "2026-10-05T16:00:00Z", similarity: 5, best_match: ["wealth"], worst_match: [], worst_none: true, share_intent: "yes", comment: "설명 좋아요", character_id: "water", interpretation_version: "v1", source: "production" };
test("feedback metrics distinguish empty data, multiple selections, KST day and keyword counts", () => {
  assert.equal(summarize([]).average, null);
  const m = summarize([row, { ...row, similarity: 1, worst_match: ["wealth", "love"], worst_none: false, share_intent: null }]);
  assert.equal(m.average, 3); assert.equal(m.positive, 0.5); assert.equal(m.days[0]?.day, "2026-10-06"); assert.equal(m.themes[0]?.count, 2);
  assert.equal(m.worst.find(x => x.key === "wealth")?.count, 1);
});
test("CSV escapes quotes and blocks spreadsheet formula prefixes", () => {
  assert.equal(csvCell('a"b'), '"a""b"');
  for (const text of ["=HYPERLINK(1)", " +SUM(1)", "@test", "-1"]) assert.ok(csvCell(text).startsWith('"\''));
});
test("admin storage is read-only, uses server credentials and omits result IDs and payment data", async () => {
  const config = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_fake" };
  let calls = 0;
  const mock = (async (url: string | URL | Request, init?: RequestInit) => {
    calls++; const query = new URL(String(url));
    assert.equal(query.searchParams.get("source"), "eq.production");
    assert.ok(!query.searchParams.get("select")?.includes("result_id"));
    assert.equal(init?.method, undefined); assert.equal((init?.headers as Record<string, string>).apikey, config.SUPABASE_SECRET_KEY);
    return new Response(JSON.stringify([row]));
  }) as typeof fetch;
  const r = await adminFeedback(new Request("https://admin.example.com/api/admin/feedback?days=30"), config, mock);
  assert.equal(r.status, 200); assert.equal(calls, 1);
  assert.equal((await r.json() as { rows: AdminFeedback[] }).rows.length, 1);
  assert.equal((await adminFeedback(new Request("https://admin.example.com/api/admin/feedback?days=999"), config, mock)).status, 400);
  assert.equal(calls, 1);
});

test("admin pagination flags incomplete totals and never returns partial statistics on storage failure", async () => {
  const config = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_fake" };
  let calls = 0;
  const mock = (async () => { calls++; return new Response(JSON.stringify(Array.from({ length: 1000 }, () => row))); }) as typeof fetch;
  const request = new Request("https://admin.example.com/api/admin/feedback?days=90");
  const result = await (await adminFeedback(request, config, mock)).json() as { rows: AdminFeedback[]; truncated: boolean };
  assert.equal(result.rows.length, 10000); assert.equal(result.truncated, true); assert.equal(calls, 11);
  calls = 0;
  const failed = (async () => { calls++; return calls === 1 ? new Response(JSON.stringify(Array.from({ length: 1000 }, () => row))) : new Response("private storage error", { status: 500 }); }) as typeof fetch;
  const response = await adminFeedback(request, config, failed);
  assert.equal(response.status, 503); assert.ok(!JSON.stringify(await response.json()).includes("private storage"));
});
