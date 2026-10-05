// 서버 함수(api/*) 공용: 환경 변수 → 결제 의존성. 이 폴더는 서버에서만 실행된다 (브라우저 번들 아님).
//
// 환경 변수 (Vercel → Settings → Environment Variables, 서버 전용 값은 절대 PALJA_ 공개 변수로 넣지 않음)
//  PALJA_PAYMENTS_MODE        off | test | live   (기본 off → 결제 API 전부 "준비 중")
//  TOSS_SECRET_KEY            test_sk_… (TEST) / live_sk_… (LIVE)  — 서버 전용
//  SUPABASE_URL               Supabase 프로젝트 주소
//  SUPABASE_SERVICE_ROLE_KEY  Supabase 관리자 키 — 서버 전용
//  PALJA_ALLOW_LIVE_PAYMENTS  yes 일 때만 live 모드 허용 (사용자 최종 승인 전에는 설정하지 않음)

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createSupabaseOrderRepo, createTossClient } from "../src/server/payments/adapters";
import type { OrderSource, PaymentDeps } from "../src/server/payments/types";

export type PaymentsConfig = { readonly ok: true; readonly deps: PaymentDeps } | { readonly ok: false; readonly status: number; readonly code: string; readonly message: string };

const PURCHASE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O, 1/I 제외 (32자)

/** 구매 코드: 16자(80비트) → ABCD-EFGH-JKLM-NPQR */
export function newPurchaseCode(): string {
  const b = randomBytes(16);
  const chars = Array.from(b, (x) => PURCHASE_ALPHABET[x % 32]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function paymentsConfig(env: Record<string, string | undefined> = process.env): PaymentsConfig {
  const mode = env.PALJA_PAYMENTS_MODE ?? "off";
  if (mode !== "test" && mode !== "live") return { ok: false, status: 503, code: "PAYMENTS_DISABLED", message: "사주팔자PLAY Beta에서 준비 중인 기능입니다." };
  const secret = env.TOSS_SECRET_KEY ?? "";
  const supaUrl = env.SUPABASE_URL ?? "";
  const supaKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (mode === "test" && !/^test_(g?sk)_/.test(secret)) return { ok: false, status: 503, code: "PAYMENTS_MISCONFIGURED", message: "결제 설정을 확인하는 중이에요." };
  if (mode === "live") {
    // 사용자 최종 승인(구매 복구·환불·약관 준비) 전에는 LIVE 결제를 막는다
    if (env.PALJA_ALLOW_LIVE_PAYMENTS !== "yes" || !/^live_(g?sk)_/.test(secret)) return { ok: false, status: 503, code: "LIVE_PAYMENTS_LOCKED", message: "사주팔자PLAY Beta에서 준비 중인 기능입니다." };
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supaUrl) || !supaKey) return { ok: false, status: 503, code: "PAYMENTS_MISCONFIGURED", message: "결제 설정을 확인하는 중이에요." };
  const vercelEnv = env.VERCEL_ENV;
  const source: OrderSource = vercelEnv === "production" ? "production" : vercelEnv === "preview" ? "preview" : "development";
  return {
    ok: true,
    deps: {
      repo: createSupabaseOrderRepo(supaUrl, supaKey),
      toss: createTossClient(secret),
      sha256,
      newOrderId: () => `sp-${randomUUID()}`,
      newPurchaseCode,
      tossMode: mode,
      source,
    },
  };
}

// ── 요청/응답 도우미 ─────────────────────────────────────────────

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** JSON 본문 읽기 (최대 8KB). 실패하면 null */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return null;
  const text = await request.text();
  if (text.length > 8192) return null;
  try {
    const v = JSON.parse(text) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function fromResult(r: { ok: true; status: number; body: unknown } | { ok: false; status: number; code: string; message: string }): Response {
  return r.ok ? json(r.status, r.body) : json(r.status, { code: r.code, message: r.message });
}
