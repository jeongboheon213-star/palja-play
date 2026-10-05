// 빌드 시점 설정. esbuild define 으로 주입된다 (scripts/build.mjs).
// Supabase URL/anon 키는 환경 변수 PALJA_SUPABASE_URL / PALJA_SUPABASE_ANON_KEY 로만 들어온다 (코드에 적지 않음).

declare const __PALJA_ENV__: "development" | "production";
declare const __PALJA_PUBLIC_URL__: string | null;
declare const __PALJA_SUPABASE_URL__: string | null;
declare const __PALJA_SUPABASE_ANON_KEY__: string | null;

const supabaseConfigured = !!__PALJA_SUPABASE_URL__ && !!__PALJA_SUPABASE_ANON_KEY__;

export const APP_CONFIG = Object.freeze({
  env: __PALJA_ENV__,
  isDev: __PALJA_ENV__ === "development",
  /** Production 배포 후 공유 문구에 붙일 공개 URL. 정해지기 전에는 null */
  publicUrl: __PALJA_PUBLIC_URL__,
  supabase: supabaseConfigured
    ? Object.freeze({ url: __PALJA_SUPABASE_URL__ as string, anonKey: __PALJA_SUPABASE_ANON_KEY__ as string, source: __PALJA_ENV__ })
    : null,
  /**
   * 피드백 저장소.
   *  - supabase    : Supabase beta_feedback 테이블 (INSERT 만)
   *  - local-dev   : Supabase 미설정 개발 환경. 이 브라우저 localStorage 에만 (개발 환경 표시와 함께)
   *  - unconfigured: Supabase 미설정 production. 저장한 척하지 않는다
   */
  feedbackStorage: (supabaseConfigured ? "supabase" : __PALJA_ENV__ === "development" ? "local-dev" : "unconfigured") as "supabase" | "local-dev" | "unconfigured",
  /** 분석 adapter. Supabase 가 설정되면 beta_events 테이블로도 보낸다 */
  analytics: [
    "memory",
    ...(__PALJA_ENV__ === "development" ? ["console"] : []),
    ...(supabaseConfigured ? ["supabase"] : []),
  ] as readonly ("memory" | "console" | "supabase")[],
});
