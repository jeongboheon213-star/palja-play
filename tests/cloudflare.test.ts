import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../api-lib/cloudflare";
import { premiumLimitHashes } from "../api-lib/premium-limit";

const ASSETS = { fetch: async () => new Response("static") };
test("Cloudflare: static assets and unknown APIs remain separate", async () => {
  assert.equal(await (await worker.fetch(new Request("https://example.com/"), { ASSETS })).text(), "static");
  assert.equal((await worker.fetch(new Request("https://example.com/api/unknown"), { ASSETS })).status, 404);
  const response = await worker.fetch(new Request("https://example.com/api/orders"), { ASSETS });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST");
});
test("Cloudflare: all payment routes use per-request settings and stay disabled without keys", async () => {
  for (const path of ["orders", "payments/confirm", "payments/fail", "payments/refund-unopened", "premium/report"]) {
    const response = await worker.fetch(new Request(`https://example.com/api/${path}`, { method: "POST" }), { ASSETS });
    assert.equal(response.status, 503);
    assert.equal(((await response.json()) as { code: string }).code, "PAYMENTS_DISABLED");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});
test("Cloudflare: LIVE is locked even with accidental dashboard approval", async () => {
  const response = await worker.fetch(new Request("https://example.com/api/orders", { method: "POST" }), {
    ASSETS, PALJA_PAYMENTS_MODE: "live", PALJA_ALLOW_LIVE_PAYMENTS: "yes",
  });
  assert.equal(((await response.json()) as { code: string }).code, "LIVE_PAYMENTS_LOCKED");
});
test("Cloudflare limiter: verified IP separates clients; spoofed forwarding is ignored", () => {
  const request = new Request("https://example.com", { headers: { "x-vercel-forwarded-for": "192.0.2.1", "cf-connecting-ip": "192.0.2.1" } });
  const fallback = premiumLimitHashes(new Request("https://example.com"), "invalid", "fake-key", false);
  assert.deepEqual(premiumLimitHashes(request, "invalid", "fake-key", false), fallback);
  const first = premiumLimitHashes(request, "invalid", "fake-key", false, "192.0.2.2");
  const second = premiumLimitHashes(request, "invalid", "fake-key", false, "192.0.2.3");
  assert.notEqual(first.p_client_hash, second.p_client_hash);
  assert.equal(first.p_code_hash, second.p_code_hash);
});
