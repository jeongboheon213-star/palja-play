// 빌드 시점 설정. esbuild define 으로 주입된다 (scripts/build.mjs).

declare const __PALJA_ENV__: "development" | "production";
declare const __PALJA_PUBLIC_URL__: string | null;

export const APP_CONFIG = Object.freeze({
  env: __PALJA_ENV__,
  isDev: __PALJA_ENV__ === "development",
  /** Production 배포 후 공유 문구에 붙일 공개 URL. 정해지기 전에는 null */
  publicUrl: __PALJA_PUBLIC_URL__,
  /**
   * 피드백 저장소.
   *  - local-dev   : 이 브라우저 localStorage 에만 저장 (개발 환경 표시와 함께)
   *  - unconfigured: Production 저장소 미정. 저장한 척하지 않는다
   */
  feedbackStorage: (__PALJA_ENV__ === "development" ? "local-dev" : "unconfigured") as "local-dev" | "unconfigured",
  /** 분석 adapter. 외부 SaaS 미연결 (Phase 9~10 에서 결정) */
  analytics: (__PALJA_ENV__ === "development" ? ["memory", "console"] : ["memory"]) as readonly ("memory" | "console")[],
});
