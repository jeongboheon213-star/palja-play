// 브라우저 빌드 (esbuild). Next.js 등 프레임워크 없이 정적 파일을 만든다.
//
//   node scripts/build.mjs                 → production 빌드 → dist/       (debug 화면 제외, minify)
//   node scripts/build.mjs --dev           → development 빌드 → dist-dev/  (debug 화면 포함, 개발 표시)
//   node scripts/build.mjs --dev --serve   → dist-dev/ 를 http://localhost:5173 으로 제공 (변경 시 다시 빌드)
//
// 공유 문구의 공개 URL 은 빌드 시 PALJA_PUBLIC_URL 환경 변수로 넣는다 (없으면 링크 없이 공유).
import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
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
const supabaseUrl = process.env.PALJA_SUPABASE_URL || null;
const supabaseAnonKey = process.env.PALJA_SUPABASE_ANON_KEY || null;
// 실수 방지: 관리자(service_role/secret) 키는 브라우저 번들에 넣지 않는다
if (supabaseAnonKey && (/^sb_secret_/.test(supabaseAnonKey) || /service_role/.test(Buffer.from(supabaseAnonKey.split(".")[1] ?? "", "base64").toString()))) {
  throw new Error("PALJA_SUPABASE_ANON_KEY 에 관리자(service_role/secret) 키가 들어 있습니다. 브라우저에는 anon(공개) 키만 넣으세요.");
}

rmSync(outdir, { recursive: true, force: true });
mkdirSync(`${outdir}/assets`, { recursive: true });
cpSync("web/index.html", `${outdir}/index.html`);
if (dev) cpSync("web/debug.html", `${outdir}/debug.html`);

const options = {
  entryPoints: dev ? { app: "web/src/main.ts", debug: "web/src/debug.ts" } : { app: "web/src/main.ts" },
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
  console.log(`[${dev ? "development" : "production"}] ${out.join(", ")}  supabase: ${supabaseUrl && supabaseAnonKey ? "설정됨" : "미설정"}`);
}
