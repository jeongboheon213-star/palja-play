import { test } from "node:test";
import assert from "node:assert/strict";
import { createSupabaseOrderRepo } from "../src/server/payments/adapters";

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
    assert.deepEqual(seen, [
      '[payment-storage] {"operation":"GET","status":403,"code":"42501"}',
      '[payment-storage] {"operation":"GET","status":0,"code":"ENOTFOUND"}',
      '[payment-storage] {"operation":"GET","status":401,"code":"HTTP_ERROR"}',
    ]);
    assert.ok(!seen.join(" ").includes("PRIVATE"));
    assert.ok(!seen.join(" ").includes("supabase.co"));
  } finally { console.error = original; }
});
