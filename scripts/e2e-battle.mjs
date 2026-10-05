// 배틀 공유 매트릭스 E2E: 공유 방식 × 기기 크기마다
//   링크 생성 → 완전히 새 브라우저 컨텍스트(다른 사람 브라우저처럼 격리) → 배틀 초대 → 친구 입력 → 계산 → VS(7라운드)
// 까지 실제로 확인한다. "복사됐다"·"SDK 호출됐다" 만으로 통과시키지 않는다.
//
//   node scripts/e2e-battle.mjs                       로컬 dist-dev (먼저 build --dev --no-remote --kakao-test-key)
//   node scripts/e2e-battle.mjs https://palja-play.vercel.app   Production (개발 hook 없이 동작)
//
// 카카오: 실제 카카오톡 앱은 자동화할 수 없다 → SDK 에 전달된 링크를 가로채 그 링크로 VS 까지 확인 (Kakao actual app: NOT TESTED).
// QR: 화면에 그려진 QR(SVG)을 실제 픽셀로 바꿔 디코더(jsQR)로 읽은 값으로 VS 까지 확인.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const REMOTE = process.argv[2] ?? null;
const ROOT = "dist-dev";
const BROWSER = process.env.PALJA_BROWSER ?? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find((p) => existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 15000, step = 150) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    if (Date.now() > end) throw new Error("timeout");
    await sleep(step);
  }
}

// ── 대상 주소 ────────────────────────────────────────────────
let BASE = REMOTE?.replace(/\/+$/, "");
let server = null;
if (!BASE) {
  if (!existsSync(`${ROOT}/index.html`)) throw new Error("dist-dev 없음: node scripts/build.mjs --dev --no-remote --kakao-test-key");
  const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
  server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const p = join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
    if (!p.startsWith(ROOT) || !existsSync(p)) return void res.writeHead(404).end();
    res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  BASE = `http://127.0.0.1:${server.address().port}`;
}

// ── 브라우저 (컨텍스트 분리 가능한 browser-level CDP) ─────────
mkdirSync("e2e-artifacts", { recursive: true });
const PROFILE = `e2e-artifacts/battle-profile-${process.pid}`;
const PORT = 9500 + (process.pid % 400);
const proc = spawn(BROWSER, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check", "--lang=ko-KR", "about:blank"], { stdio: "ignore" });
const version = await waitFor(() => fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()));
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
let seq = 0;
const pending = new Map();
const listeners = new Map(); // sessionId → fn(msg)
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.sessionId && listeners.has(msg.sessionId)) listeners.get(msg.sessionId)(msg);
};
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SIZES = { m320: { w: 320, h: 640, mobile: true }, m390: { w: 390, h: 844, mobile: true }, d1280: { w: 1280, h: 720, mobile: false }, d1920: { w: 1920, h: 1080, mobile: false } };

/** 새 브라우저 컨텍스트(격리) + 탭 하나 */
async function newPage(sizeKey) {
  const { browserContextId } = await send("Target.createBrowserContext", { disposeOnDetach: true });
  const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const net = [];
  const errors = [];
  listeners.set(sessionId, (msg) => {
    if (msg.method === "Network.requestWillBeSent") net.push(msg.params.request.url);
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  });
  const s = SIZES[sizeKey];
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Network.enable", {}, sessionId);
  await send("Emulation.setUserAgentOverride", { userAgent: s.mobile ? ANDROID_UA : version["User-Agent"] }, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width: s.w, height: s.h, deviceScaleFactor: s.mobile ? 2 : 1, mobile: s.mobile }, sessionId);
  await send("Emulation.setTouchEmulationEnabled", { enabled: s.mobile }, sessionId);
  const ev = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const go = async (url) => {
    await send("Page.navigate", { url }, sessionId);
    await waitFor(() => ev("document.readyState === 'complete' && !!document.getElementById('go')"));
    await sleep(300);
  };
  const shot = async (file, selector) => {
    if (selector) {
      await ev(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start'}); window.scrollBy(0,-60); true`);
      await sleep(300);
    }
    const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
    writeFileSync(`docs/screenshots/${file}.png`, Buffer.from(data, "base64"));
  };
  const close = async () => {
    listeners.delete(sessionId);
    await send("Target.closeTarget", { targetId }).catch(() => {});
    await send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  };
  return { ev, go, net, errors, shot, close };
}

async function fillAndCalc(p, { date, time, gender }) {
  await p.ev(`(() => {
    document.getElementById('go').click();
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); };
    set(document.getElementById('dt'), ${JSON.stringify(date)});
    ${time ? `set(document.getElementById('tm'), ${JSON.stringify(time)});` : "document.getElementById('unk').click();"}
    document.querySelector('#sex button[data-v="${gender}"]').click();
    document.getElementById('calc').click(); return true; })()`);
  await waitFor(() => p.ev("document.getElementById('s-result').classList.contains('on')"), 10000);
  await sleep(500);
}

const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`  ✔ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e?.message ?? e) });
    console.log(`  ✖ ${name}\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}

/** 받은 링크를 완전히 새 컨텍스트에서 열어 초대 → 친구 입력 → VS 7라운드까지 */
async function friendOpens(url, sizeKey, expectNick) {
  const f = await newPage(sizeKey);
  try {
    await f.go(url);
    const banner = await f.ev("document.getElementById('battle-invite')?.innerText ?? ''");
    assert(banner.includes(`${expectNick}님의 배틀 신청이 도착했어요`), `초대 배너 없음 (일반 첫 화면?): "${banner.slice(0, 60)}" url=${url}`);
    assert((await f.ev("document.getElementById('go').textContent")) === "내 팔자로 도전하기", "CTA");
    await fillAndCalc(f, { date: "1988-08-08", time: "08:08", gender: "male" });
    const rounds = await f.ev("document.querySelectorAll('#battle-result .round').length");
    const box = await f.ev("document.getElementById('battle-result')?.innerText ?? ''");
    assert(rounds === 7 && /승리|패배|무승부/.test(box), `VS 결과 rounds=${rounds}`);
    if (isLocal) {
      assert(await f.ev("document.querySelectorAll('#battle-result .battle-tier').length === 2"), "두 참가자 티어");
      assert(box.includes("사주팔자PLAY 기준 상위"), "PLAY 기준 문구");
    }
    const o = await f.ev("({sw: document.documentElement.scrollWidth, w: innerWidth})");
    assert(o.sw <= o.w, `가로 넘침 ${o.sw}>${o.w}`);
    assert(f.errors.length === 0, f.errors.join(" | "));
    return box.match(/승리|패배|무승부/)[0];
  } finally {
    await f.close();
  }
}

/** QR SVG → 픽셀 → jsQR. qrcode-generator 의 SVG 는 칸마다 "Mx,y l w,0 0,h -w,0 0,-h z" 사각형 (좌표는 이미 cellSize 배율) */
function decodeQrSvg(svg) {
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  if (!vb) return null;
  const n = Number(vb[1]);
  const pad = 16; // 디코더가 찾기 쉽도록 흰 여백 추가
  const scale = 2;
  const size = (n + pad * 2) * scale;
  const px = new Uint8ClampedArray(size * size * 4).fill(255);
  const d = /<path d="([^"]+)"/.exec(svg)?.[1] ?? "";
  const re = /M(\d+),(\d+)l(\d+),0 0,(\d+)/g;
  let m;
  while ((m = re.exec(d))) {
    const [x, y, w, h] = [m[1], m[2], m[3], m[4]].map(Number);
    for (let yy = (y + pad) * scale; yy < (y + h + pad) * scale; yy++) {
      for (let xx = (x + pad) * scale; xx < (x + w + pad) * scale; xx++) {
        const i = (yy * size + xx) * 4;
        px[i] = px[i + 1] = px[i + 2] = 0;
      }
    }
  }
  return jsQR(px, size, size)?.data ?? null;
}

const SENDER = { date: "1990-05-15", time: "14:20", gender: "female" };
const NICK = "보헌";
const table = [];

/** 보내는 사람: 결과까지 만들고 닉네임 입력. 공유 API 는 가로채서 실제로 넘어가는 값을 기록 */
async function senderPage(sizeKey) {
  const p = await newPage(sizeKey);
  await p.go(`${BASE}/`);
  // 공유 시트·클립보드·카카오 SDK 가로채기 (결과 화면을 그리기 전에 설치해야 버튼이 보임)
  await p.ev(`(() => {
    window.__shared = null; window.__copied = null; window.__kakao = null;
    Object.defineProperty(navigator, 'share', { value: async (d) => { window.__shared = d; }, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });
    window.Kakao = { isInitialized: () => true, init() {}, Share: { sendDefault: (a) => { window.__kakao = a; } } };
    return true; })()`);
  await fillAndCalc(p, SENDER);
  await p.ev(`(() => { const n = document.getElementById('battle-nick'); n.value = ${JSON.stringify(NICK)}; n.dispatchEvent(new Event('input', {bubbles:true})); return true; })()`);
  return p;
}

// 메신저 자동 링크 인식 흉내 (영문·숫자·포트 콜론·-._/?#=&%). 물결표(~)는 링크로 보지 않는다
const linkInText = (t) => (/https?:\/\/[A-Za-z0-9\-._:\/?#=&%]+/.exec(t ?? "") ?? [null])[0];

console.log(`browser: ${version.Browser}  base: ${BASE}`);
const isLocal = !REMOTE;
const sizes = ["m390", "m320", "d1280", "d1920"];
for (const sizeKey of sizes) {
  const mobile = SIZES[sizeKey].mobile;
  console.log(`\n[${sizeKey} ${mobile ? "모바일" : "PC"}]`);
  const p = await senderPage(sizeKey);
  const device = await p.ev("document.getElementById('battle').dataset.device");
  await check(`${sizeKey}: 기기 화면 구분 (${mobile ? "mobile" : "pc"})`, async () => assert(device === (mobile ? "mobile" : "pc"), device));
  const buttons = await p.ev("[...document.querySelectorAll('#battle button')].map(b => b.id)");
  await check(`${sizeKey}: 보이는 버튼 = 지원하는 방식만 ${JSON.stringify(buttons)}`, async () => {
    const want = mobile ? ["sms-btn", "kakao-btn", "webshare-btn", "copy-btn"] : ["kakao-btn", "copy-btn", "phone-btn", "webshare-btn"];
    for (const id of want) if (id !== "kakao-btn" || isLocal) assert(buttons.includes(id), `${id} 없음`);
    if (!mobile) assert(!buttons.includes("sms-btn") && !(await p.ev("!!document.getElementById('battle-phone')")), "PC 에 문자 버튼/전화번호 칸이 보임");
  });
  if (sizeKey === "m390" || sizeKey === "d1280") await p.shot(`24-battle-share-${sizeKey}`, "#battle");

  const urls = {};
  // 링크 복사
  await p.ev("document.getElementById('copy-btn').click(); true");
  await sleep(300);
  urls.copy = await p.ev("window.__copied");
  // 공유 시트 (Web Share)
  await p.ev("document.getElementById('webshare-btn')?.click(); true");
  await sleep(300);
  const shared = await p.ev("window.__shared");
  urls.webshare = linkInText(shared?.text);
  // 카카오 (SDK 에 전달된 값)
  if (buttons.includes("kakao-btn")) {
    await p.ev("document.getElementById('kakao-btn').click(); true");
    await sleep(300);
    const k = await p.ev("window.__kakao");
    urls.kakao = k?.link?.mobileWebUrl ?? null;
    await check(`${sizeKey}: 카카오 SDK 전달값 — link·webUrl·버튼 링크 모두 같은 링크`, async () => assert(k && k.link.webUrl === urls.kakao && k.buttons[0].link.mobileWebUrl === urls.kakao, JSON.stringify(k)));
  }
  // 문자 (모바일): sms: 본문의 링크
  if (mobile) {
    await p.ev("document.getElementById('battle-phone').value = '010-9876-5432'; document.getElementById('sms-btn').click(); true");
    await sleep(600);
    const sms = p.net.find((u) => u.startsWith("sms:"));
    urls.sms = linkInText(decodeURIComponent((sms ?? "").split("body=")[1] ?? ""));
  } else {
    // QR (PC: 휴대폰으로 보내기)
    await p.ev("document.getElementById('phone-btn').click(); true");
    await sleep(300);
    const panel = await p.ev("document.getElementById('qr-panel').innerText");
    await check(`${sizeKey}: PC 문자 안내 문구 + QR 표시`, async () => assert(panel.includes("PC에서는 문자 앱이 연결되어 있지 않을 수 있어요."), panel.slice(0, 50)));
    const svg = await p.ev("document.querySelector('#battle-qr svg')?.outerHTML ?? ''");
    urls.qr = decodeQrSvg(svg);
    if (sizeKey === "d1280") await p.shot("25-battle-qr-d1280", "#qr-panel");
  }
  await p.close();

  const canonical = urls.copy;
  await check(`${sizeKey}: 모든 방식의 링크가 같은 canonical battle URL ${JSON.stringify(Object.keys(urls))}`, async () => {
    assert(/\?b=[A-Za-z0-9_-]+$/.test(canonical ?? ""), `복사된 링크 형식: ${canonical}`);
    assert(canonical.startsWith(BASE + "/?b="), `기준 주소: ${canonical}`);
    assert(!/localhost|127\.0\.0\.1/.test(canonical) || isLocal, "Production 링크에 localhost");
    for (const [k, v] of Object.entries(urls)) assert(v === canonical, `${k} 링크가 다름: ${v}`);
  });
  for (const [method, url] of Object.entries(urls)) {
    await check(`${sizeKey}: [${method}] 새 브라우저 컨텍스트에서 링크 열기 → 초대 → 친구 계산 → VS 7라운드`, async () => {
      const outcome = await friendOpens(url, sizeKey, NICK);
      table.push({ size: sizeKey, method, url, outcome });
      return outcome;
    });
  }
}

killTree();
server?.close();
const failed = results.filter((r) => !r.ok);
writeFileSync(`e2e-artifacts/battle-matrix-${REMOTE ? "prod" : "local"}.json`, JSON.stringify({ base: BASE, browser: version.Browser, table, results }, null, 2));
console.log(`\n공유 매트릭스 (자동, ${version.Browser}):`);
for (const r of table) console.log(`  ${r.size.padEnd(6)} ${r.method.padEnd(9)} → VS ${r.outcome}`);
console.log(`\nBattle E2E: ${results.length - failed.length}/${results.length} 통과`);
process.exit(failed.length ? 1 : 0);

function killTree() {
  ws.close();
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
    spawnSync("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'battle-profile-${process.pid}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" });
  } else proc.kill("SIGKILL");
  rmSync(PROFILE, { recursive: true, force: true, maxRetries: 5 });
}
