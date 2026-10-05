// 로컬 결제 테스트 서버: dist-dev(화면) + api/*(서버 함수)를 한 주소에서 실행한다.
//
//   npx tsx scripts/local-server.ts        → http://localhost:5180
//
// .env.local 에서 읽는 값 (사용자가 직접 입력, git 에 올라가지 않음)
//   PALJA_PAYMENTS_MODE=test
//   PALJA_TOSS_CLIENT_KEY=test_ck_…        (브라우저용, 빌드에 들어감)
//   TOSS_SECRET_KEY=test_sk_…              (서버 전용)
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=…            (서버 전용)
// 먼저 `node scripts/build.mjs --dev` 로 화면을 빌드한다 (같은 .env.local 을 읽음).
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
}
process.env.SUPABASE_URL ??= process.env.PALJA_SUPABASE_URL;

const routes: Record<string, () => Promise<{ POST: (r: Request) => Promise<Response> }>> = {
  "/api/orders": () => import("../api-src/orders"),
  "/api/payments/confirm": () => import("../api-src/payments/confirm"),
  "/api/payments/fail": () => import("../api-src/payments/fail"),
  "/api/premium/report": () => import("../api-src/premium/report"),
};
const ROOT = "dist-dev";
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const PORT = Number(process.env.PORT ?? 5180);

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const route = routes[url.pathname];
  if (route) {
    if (req.method !== "POST") return void res.writeHead(405).end();
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const request = new Request(url, { method: "POST", headers: req.headers as Record<string, string>, body: Buffer.concat(chunks) });
    const response = await (await route()).POST(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return void res.end(Buffer.from(await response.arrayBuffer()));
  }
  const p = join(ROOT, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) return void res.writeHead(404).end("not found");
  res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`local payment test server: http://localhost:${PORT}/  (payments mode: ${process.env.PALJA_PAYMENTS_MODE ?? "off"})`);
});
