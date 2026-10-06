// 브라우저 빌드 (esbuild). Next.js 등 프레임워크 없이 정적 파일을 만든다.
//
//   node scripts/build.mjs                 → production 빌드 → dist/       (debug 화면 제외, minify)
//   node scripts/build.mjs --dev           → development 빌드 → dist-dev/  (debug 화면 포함, 개발 표시)
//   node scripts/build.mjs --dev --serve   → dist-dev/ 를 http://localhost:5173 으로 제공 (변경 시 다시 빌드)
//   --no-remote                            → Supabase 설정을 무시 (E2E 용)
//
// 공유 문구의 공개 URL 은 빌드 시 PALJA_PUBLIC_URL 환경 변수로 넣는다 (없으면 링크 없이 공유).
import * as esbuild from "esbuild";
import { writeAdsenseFiles } from "./adsense-files.mjs";
import { seoHtml, writeSeoFiles } from "./seo-files.mjs";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 어느 폴더에서 실행해도 저장소 루트 기준으로 동작
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

// .env.local (git 에 올리지 않음) 이 있으면 읽는다. 이미 설정된 환경 변수(Vercel 등)가 우선.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const dev = process.argv.includes("--dev");
const serve = process.argv.includes("--serve");
const outdir = dev ? "dist-dev" : "dist";
const publicUrl = process.env.PALJA_PUBLIC_URL || null;
// --no-remote: 자동 테스트(E2E)용. Supabase 설정이 있어도 쓰지 않는다 (테스트 기록이 DB 에 쌓이지 않게)
const noRemote = process.argv.includes("--no-remote");
// 이름 우선순위: 직접 지정(PALJA_*) → Vercel–Supabase 연동이 자동으로 만든 이름(SUPABASE_*).
// 브라우저에 들어가는 것은 URL 과 공개(anon/publishable) 키 두 개뿐이다.
// POSTGRES_* / SUPABASE_JWT_SECRET / SUPABASE_SERVICE_ROLE_KEY 같은 비밀 값은 읽지 않는다.
const pickEnv = (...names) => {
  for (const n of names) if (process.env[n]) return { name: n, value: process.env[n] };
  return null;
};
const urlEnv = noRemote ? null : pickEnv("PALJA_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const keyEnv = noRemote ? null : pickEnv("PALJA_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY");
const supabaseUrl = urlEnv?.value ?? null;
const supabaseAnonKey = keyEnv?.value ?? null;

/** 공개 키인지 확인: sb_publishable_… 이거나, JWT 이면 role 이 anon 이어야 한다 */
function isPublicKey(k) {
  if (k.startsWith("sb_publishable_")) return true;
  if (k.startsWith("sb_")) return false; // sb_secret_ 등
  try {
    const payload = JSON.parse(Buffer.from((k.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    return payload.role === "anon";
  } catch {
    return false;
  }
}
// 실수 방지: 관리자(service_role/secret) 키는 브라우저 번들에 절대 넣지 않는다
if (supabaseAnonKey && !isPublicKey(supabaseAnonKey)) {
  throw new Error(`${keyEnv.name} 가 공개(anon/publishable) 키가 아닙니다. 관리자 키는 브라우저에 넣을 수 없어 빌드를 멈춥니다.`);
}
if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  throw new Error(`${urlEnv.name} 형식이 Supabase 프로젝트 주소(https://xxxx.supabase.co)가 아닙니다.`);
}
const supabaseLabel = supabaseUrl && supabaseAnonKey ? `설정됨 (${new URL(supabaseUrl).host}, ${urlEnv.name}/${keyEnv.name})` : "미설정";

// 결제 (토스페이먼츠). 브라우저에는 결제 모드와 "클라이언트 키(test_ck/live_ck)"만 들어간다.
// TOSS_SECRET_KEY · SUPABASE_SERVICE_ROLE_KEY 는 서버 함수(api/)에서만 읽고 여기서는 절대 읽지 않는다.
const paymentUiTest = process.argv.includes("--payment-ui-test");
if (paymentUiTest && (!dev || !noRemote)) throw new Error("Payment UI fixture requires --dev --no-remote");
const paymentsMode = paymentUiTest ? "test" : noRemote ? "off" : process.env.PALJA_PAYMENTS_MODE || "off";
const tossClientKey = paymentUiTest ? "test_ck_browser_fixture" : paymentsMode === "off" ? null : process.env.PALJA_TOSS_CLIENT_KEY || null;
if (!["off", "test", "live"].includes(paymentsMode)) throw new Error(`PALJA_PAYMENTS_MODE 는 off | test | live 중 하나여야 합니다: ${paymentsMode}`);
if (tossClientKey && /_(g?sk)_/.test(tossClientKey)) throw new Error("PALJA_TOSS_CLIENT_KEY 에 시크릿 키(…_sk_…)가 들어 있습니다. 브라우저에는 클라이언트 키(…_ck_…)만 넣으세요.");
if (paymentsMode === "test" && tossClientKey && !/^test_(g?ck)_/.test(tossClientKey)) throw new Error("TEST 모드에는 test_ck_ 로 시작하는 클라이언트 키만 쓸 수 있습니다.");
if (paymentsMode === "live" && (process.env.PALJA_ALLOW_LIVE_PAYMENTS !== "yes" || !/^live_(g?ck)_/.test(tossClientKey ?? ""))) {
  throw new Error("LIVE 결제는 사용자 최종 승인(PALJA_ALLOW_LIVE_PAYMENTS=yes)과 live_ck_ 키가 있어야 빌드됩니다.");
}
// 카카오톡 공유: 카카오 JavaScript 키(공개 키, 카카오 콘솔에서 사이트 도메인 등록 필수). 없으면 카카오 버튼을 숨긴다.
// --kakao-test-key: 개발 빌드 E2E 전용 가짜 키 (카카오 버튼을 보이게 해서 SDK 에 전달되는 링크를 검사). production 빌드에서는 무시.
const kakaoJsKey = dev && process.argv.includes("--kakao-test-key") ? "0123456789abcdef0123456789abcdef" : process.env.PALJA_KAKAO_JS_KEY || null;
if (kakaoJsKey && !/^[0-9a-f]{32}$/.test(kakaoJsKey)) throw new Error("PALJA_KAKAO_JS_KEY 는 카카오 JavaScript 키(32자리 영숫자)여야 합니다. REST API·Admin 키를 넣지 마세요.");
const paymentsLabel = paymentsMode === "off" || !tossClientKey ? "off (준비 중 안내)" : `${paymentsMode} (${tossClientKey.slice(0, 8)}…)`;

rmSync(outdir, { recursive: true, force: true });
mkdirSync(`${outdir}/assets`, { recursive: true });
mkdirSync(`${outdir}/admin`, { recursive: true });
cpSync("web/admin.html", `${outdir}/admin/index.html`);
writeAdsenseFiles(outdir, seoHtml(readFileSync("web/index.html", "utf8"), { dev }), dev || noRemote ? null : process.env.PALJA_ADSENSE_PUBLISHER_ID);
cpSync('web/seo.css', `${outdir}/assets/seo.css`);
for (const [path, source] of [['/free-saju', 'web/free-saju.html'], ['/guide/saju', 'web/saju-guide.html']]) {
  const html = readFileSync(source, 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/s)[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
  mkdirSync(`${outdir}${path}`, { recursive: true });
  writeFileSync(`${outdir}${path}/index.html`, seoHtml(html, { dev, path, title, description }));
}
writeSeoFiles(outdir, { dev, paths: ['/', '/free-saju', '/guide/saju'] });
if (dev) cpSync("web/debug.html", `${outdir}/debug.html`);

const options = {
  entryPoints: dev ? { app: "web/src/main.ts", admin: "web/src/admin.ts", debug: "web/src/debug.ts" } : { app: "web/src/main.ts", admin: "web/src/admin.ts" },
  outdir: `${outdir}/assets`,
  absWorkingDir: process.cwd(),
  bundle: true,
  format: "iife",
  target: ["es2020"], // Safari 14+, Chrome/Edge 80+ 수준
  minify: !dev,
  sourcemap: dev ? "inline" : false,
  legalComments: "none",
  charset: "utf8",
  define: {
    __PALJA_ENV__: JSON.stringify(dev ? "development" : "production"),
    __PALJA_PUBLIC_URL__: JSON.stringify(publicUrl),
    __PALJA_SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __PALJA_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    __PALJA_PAYMENTS_MODE__: JSON.stringify(tossClientKey ? paymentsMode : "off"),
    __PALJA_TOSS_CLIENT_KEY__: JSON.stringify(tossClientKey),
    __PALJA_KAKAO_JS_KEY__: JSON.stringify(kakaoJsKey),
  },
  logLevel: "info",
};

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: 5173, host: "127.0.0.1" });
  console.log(`dev server: http://127.0.0.1:${port}/  (debug: /debug.html)`);
} else {
  const r = await esbuild.build({ ...options, metafile: true });
  const out = Object.entries(r.metafile.outputs).map(([f, o]) => `${f} ${(o.bytes / 1024).toFixed(1)}KB`);
  console.log(`[${dev ? "development" : "production"}] ${out.join(", ")}  supabase: ${supabaseLabel}  payments: ${paymentsLabel}  kakao: ${kakaoJsKey ? "설정됨" : "미설정(버튼 숨김)"}`);
}
