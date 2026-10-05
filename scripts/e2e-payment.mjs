// Browser flow with fake local APIs only. Does NOT verify Toss or real Supabase.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
const build = spawnSync(process.execPath, ["scripts/build.mjs", "--dev", "--no-remote", "--payment-ui-test"], {
  stdio: "inherit",
});
if (build.status !== 0) process.exit(1);
const root = resolve("dist-dev");
const calls = [];
let denyReport = false;
let confirmPending = false;
const report = { productId: "premium_money", title: "재물 심층 리포트", summary: ["브라우저 테스트"], why: [], how: [], reversal: null, checklist: [], notIncluded: ["시기 미포함"] };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    let text = ""; for await (const chunk of req) text += chunk;
    const body = JSON.parse(text || "{}"); calls.push({ path: url.pathname, body });
    const data = url.pathname.endsWith("confirm")
      ? confirmPending ? { code: "PAYMENT_PROCESSING", message: "확인 중" } : { status: "PAID" }
      : url.pathname.endsWith("report") ? denyReport ? { code: "TOO_MANY_ATTEMPTS", message: "10분 뒤 다시 시도해 주세요." } : { report }
      : { status: "REFUNDED" };
    res.writeHead(url.pathname.endsWith("report") && denyReport ? 429 : url.pathname.endsWith("confirm") && confirmPending ? 409 : 200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
    return;
  }
  const path = resolve(root, url.pathname === "/" ? "index.html" : `.${url.pathname}`);
  if (!path.startsWith(root + "\\") && !path.startsWith(root + "/")) return void res.writeHead(404).end();
  if (!existsSync(path)) return void res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": extname(path) === ".js" ? "text/javascript" : "text/html" }).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browserPath = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!browserPath) throw new Error("Edge unavailable");
mkdirSync("e2e-artifacts", { recursive: true });
const port = 9700 + process.pid % 250;
const profile = resolve(`e2e-artifacts/payment-profile-${process.pid}`);
const browser = spawn(browserPath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-extensions", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wait(fn) { for (let i = 0; i < 150; i++) { try { if (await fn()) return; } catch {} await sleep(100); } throw new Error("timeout"); }
let ws;
const results = [];
try {
  await wait(() => fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.ok));
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (message) => { const data = JSON.parse(message.data); const promise = pending.get(data.id); if (promise) { pending.delete(data.id); data.error ? promise.reject(new Error(data.error.message)) : promise.resolve(data.result); } };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evalPage = async (expression) => { const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  await cdp("Page.enable"); await cdp("Runtime.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const purchase = { orderId: "sp-browser-fixture", productId: "premium_money", purchaseCode: "ABCD-EFGH-JKLM-NPQR", signalIds: ["wealth.jae.strong"], characterName: "테스트 캐릭터" };
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem('sp-pending-order', ${JSON.stringify(JSON.stringify(purchase))});` });
  const navigate = async () => { calls.length = 0; await cdp("Page.navigate", { url: `${base}/?pay=success&paymentKey=fixture&orderId=sp-browser-fixture&amount=2900` }); await wait(() => evalPage("!!document.querySelector('#paid-unopened')")); };
  const check = (name, condition) => { if (!condition) throw new Error(name); results.push({ name, ok: true }); console.log(`PASS ${name}`); };
  await navigate();
  check("confirm does not request report", calls.filter((c) => c.path.endsWith("report")).length === 0);
  check("open and unopened cancellation buttons present", await evalPage("!!document.querySelector('#paid-open-report') && !!document.querySelector('#paid-cancel-unopened')"));
  check("success URL stripped after confirmation", await evalPage("!location.search.includes('paymentKey')"));
  await evalPage("document.querySelector('#paid-open-report').click()");
  await wait(() => evalPage("!!document.querySelector('#s-report h1')"));
  check("click explicitly requests content", calls.filter((c) => c.path.endsWith("report")).length === 1 && calls.find((c) => c.path.endsWith("report")).body.openContent === true);
  await navigate(); denyReport = true;
  await evalPage("document.querySelector('#paid-open-report').click()");
  await wait(() => evalPage("document.querySelector('#paid-unopened .err').textContent.includes('10분')"));
  check("rate limit error shown and retry enabled", await evalPage("!document.querySelector('#paid-open-report').disabled"));
  denyReport = false;
  await navigate();
  await evalPage("document.querySelector('#paid-cancel-unopened').click()");
  await wait(() => calls.some((c) => c.path.endsWith("refund-unopened")));
  check("cancel never requests report", !calls.some((c) => c.path.endsWith("report")));
  confirmPending = true; calls.length = 0;
  await cdp("Page.navigate", { url: `${base}/?pay=success&paymentKey=fixture&orderId=sp-browser-fixture&amount=2900` });
  await wait(() => evalPage("document.querySelector('#s-report')?.innerText.includes('결제 확인 중')"));
  check("uncertain confirmation cannot open content and retains retry URL", !calls.some((c) => c.path.endsWith("report")) && await evalPage("location.search.includes('paymentKey') && !document.querySelector('#paid-open-report')"));
} finally {
  ws?.close();
  spawnSync("taskkill", ["/PID", String(browser.pid), "/T", "/F"], { stdio: "ignore" });
  server.close();
  writeFileSync("e2e-artifacts/payment-browser-result.json", JSON.stringify({ mode: "local fake APIs, no Toss/Supabase", results }, null, 2));
}
console.log(`Payment browser ${results.length}/${results.length}`);
