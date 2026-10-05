// 서버 함수 번들: api-src/**/*.ts → api/**/*.js (파일 하나에 필요한 코드 전부 포함).
// Vercel 의 Node 실행 환경은 확장자 없는 import 를 찾지 못하므로, 미리 하나로 묶어 둔다.
// 생성 파일은 git 에 커밋한다 (Vercel 이 함수를 찾을 때 바로 보이도록). 직접 수정 금지 → api-src 를 고친 뒤 다시 실행.
//
//   node scripts/build-api.mjs           생성
//   node scripts/build-api.mjs --check   생성 결과가 커밋된 파일과 같은지 검사 (다르면 실패)
import * as esbuild from "esbuild";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const check = process.argv.includes("--check");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith(".ts") ? [join(d, f)] : []));
const entries = walk("api-src");
const result = await esbuild.build({
  entryPoints: entries,
  outbase: "api-src",
  outdir: "api",
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node20"],
  absWorkingDir: process.cwd(),
  write: !check,
  legalComments: "none",
  charset: "utf8",
  banner: { js: "// 자동 생성 파일 (scripts/build-api.mjs). 직접 고치지 말고 api-src/ 를 수정하세요." },
  logLevel: "warning",
});
if (check) {
  const stale = result.outputFiles.filter((o) => {
    try {
      return readFileSync(o.path, "utf8") !== o.text;
    } catch {
      return true;
    }
  });
  if (stale.length) {
    console.error(`api/ 가 api-src/ 와 다릅니다. node scripts/build-api.mjs 를 실행하세요: ${stale.map((o) => o.path).join(", ")}`);
    process.exit(1);
  }
  console.log(`api/ 최신 (${result.outputFiles.length}개)`);
} else {
  console.log(`api/ 생성: ${entries.map((e) => e.replace(/^api-src[\/]/, "api/").replace(/\.ts$/, ".js")).join(", ")}`);
}
