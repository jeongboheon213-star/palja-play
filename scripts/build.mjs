// 브라우저 빌드 (esbuild). Next.js 등 프레임워크 없이 정적 파일을 만든다.
//
//   node scripts/build.mjs                 → production 빌드 → dist/       (debug 화면 제외, minify)
//   node scripts/build.mjs --dev           → development 빌드 → dist-dev/  (debug 화면 포함, 개발 표시)
//   node scripts/build.mjs --dev --serve   → dist-dev/ 를 http://localhost:5173 으로 제공 (변경 시 다시 빌드)
//
// 공유 문구의 공개 URL 은 빌드 시 PALJA_PUBLIC_URL 환경 변수로 넣는다 (없으면 링크 없이 공유).
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 어느 폴더에서 실행해도 저장소 루트 기준으로 동작
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const dev = process.argv.includes("--dev");
const serve = process.argv.includes("--serve");
const outdir = dev ? "dist-dev" : "dist";
const publicUrl = process.env.PALJA_PUBLIC_URL || null;

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
  console.log(`[${dev ? "development" : "production"}] ${out.join(", ")}`);
}
