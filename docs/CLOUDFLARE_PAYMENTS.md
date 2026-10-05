# Cloudflare Pages TEST payment migration

The user created palja-play.pages.dev from chatgpt/payment-tier-phase2 and confirmed a feedback record in Supabase. The public domain still serves Vercel. AdSense meta and ads.txt are verified on pages.dev only.

Change Pages build command to `npm run build:cloudflare`, output `dist`. wrangler.jsonc supplies nodejs_compat and the compatibility date. Advanced mode emits dist/_worker.js; only /api/* invokes it. Other requests use static Pages assets. No packages added.

Pages Production variables (user enters credentials in dashboard, never chat):
- Keep PALJA_PUBLIC_URL, PALJA_ADSENSE_PUBLISHER_ID, PALJA_SUPABASE_URL, PALJA_SUPABASE_ANON_KEY.
- PALJA_PAYMENTS_MODE = test (build and runtime)
- PALJA_TOSS_CLIENT_KEY = the existing individual API test_ck_ key (build)
- TOSS_SECRET_KEY = paired test_sk_ key (encrypted secret)
- SUPABASE_URL = existing project URL (runtime)
- SUPABASE_SECRET_KEY = existing server secret (encrypted secret)

Retry deployment after settings. The adapter copies bindings per request, never mutates process.env, ignores Vercel forwarding on Cloudflare, and accepts CF-Connecting-IP only for requests with runtime cf metadata. Invalid/missing IP uses the shared bucket. Existing DB RPC limiter remains fail closed. All Cloudflare LIVE requests are explicitly locked even if mistakenly enabled in the dashboard.

Local checks do not prove Cloudflare Node runtime compatibility or real payment success. Verify deployed API returns JSON (not SPA HTML), TEST order creation, confirmation, code restore, explicit first opening, unopened cancellation, and cancelled-code rejection. Do not change domain DNS before this verification. No new SQL is required.

Reference: https://developers.cloudflare.com/pages/functions/advanced-mode/ and https://developers.cloudflare.com/pages/functions/wrangler-configuration/
