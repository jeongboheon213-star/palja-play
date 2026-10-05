import { test } from "node:test";
import assert from "node:assert/strict";
import { createSupabaseOrderRepo } from "../src/server/payments/adapters";
import { paymentsConfig, supabaseServerKey } from "../api-lib/env";

test("copied server credentials trim surrounding newlines before request headers", async () => {
  assert.deepEqual(supabaseServerKey({ SUPABASE_SECRET_KEY: "  sb_secret_fixture\r\n" }), { name: "SUPABASE_SECRET_KEY", key: "sb_secret_fixture" });
  const cfg = paymentsConfig({ PALJA_PAYMENTS_MODE: "test", TOSS_SECRET_KEY: " test_gsk_fixture\n", SUPABASE_URL: " https://fixture.supabase.co\n", SUPABASE_SECRET_KEY: "sb_secret_fixture\r\n" });
  assert.ok(cfg.ok);
  const clean = supabaseServerKey({ SUPABASE_SECRET_KEY: "sb_secret_fixture\r\n" })!;
  const fakeFetch = (async (_url: unknown, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get("apikey"), "sb_secret_fixture");
    return new Response("[]");
  }) as typeof fetch;
  await createSupabaseOrderRepo("https://fixture.supabase.co", clean.key, fakeFetch).get("fixture");
  assert.equal(paymentsConfig({ PALJA_PAYMENTS_MODE: "live", TOSS_SECRET_KEY: " live_gsk_fixture\n", SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_SECRET_KEY: clean.key }).ok, false);
});

test("storage diagnostics log only allowed codes, never credentials or error content", async () => {
  const seen: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { seen.push(args.join(" ")); };
  try {
    const denied = (async () => new Response(JSON.stringify({ code: "42501", message: "PRIVATE_PAYLOAD", details: "PRIVATE_KEY" }), { status: 403 })) as typeof fetch;
    await assert.rejects(createSupabaseOrderRepo("https://private-project.supabase.co", "sb_secret_PRIVATE_KEY", denied).get("PRIVATE_ORDER"));
    const network = (async () => { throw new Error("PRIVATE_URL", { cause: { code: "ENOTFOUND" } }); }) as typeof fetch;
    await assert.rejects(createSupabaseOrderRepo("https://private-project.supabase.co", "sb_secret_PRIVATE_KEY", network).get("PRIVATE_ORDER"));
    const unknown = (async () => new Response(JSON.stringify({ code: "PRIVATE_KEY" }), { status: 401 })) as typeof fetch;
    await assert.rejects(createSupabaseOrderRepo("https://private-project.supabase.co", "sb_secret_PRIVATE_KEY", unknown).get("PRIVATE_ORDER"));
    const badHeader = (async () => { throw new TypeError("PRIVATE_KEY is not a legal HTTP header value"); }) as typeof fetch;
    await assert.rejects(createSupabaseOrderRepo("https://private-project.supabase.co", "sb_secret_PRIVATE_KEY", badHeader).get("PRIVATE_ORDER"));
    assert.deepEqual(seen, [
      '[payment-storage] {"operation":"GET","status":403,"code":"42501"}',
      '[payment-storage] {"operation":"GET","status":0,"code":"ENOTFOUND"}',
      '[payment-storage] {"operation":"GET","status":401,"code":"HTTP_ERROR"}',
      '[payment-storage] {"operation":"GET","status":0,"code":"INVALID_HEADER"}',
    ]);
    assert.ok(!seen.join(" ").includes("PRIVATE"));
    assert.ok(!seen.join(" ").includes("supabase.co"));
  } finally { console.error = original; }
});
