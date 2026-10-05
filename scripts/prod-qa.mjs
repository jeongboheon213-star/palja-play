// 실제 공개 사이트(Production) QA. localhost 가 아니라 공개 URL 에서 실행한다.
//
//   node scripts/prod-qa.mjs [https://palja-play.vercel.app]
//
// - 사용자 A(나): 랜딩 → 입력 → 계산 → 결과 → Premium(클릭·관심) → 피드백 → 배틀 링크 생성(문자 앱 + 링크 복사)
// - 사용자 B(친구): 완전히 별도의 브라우저(프로필 분리)에서 배틀 링크 → 초대 → 입력 → 계산 → VS 결과
// - 모든 인터넷 요청을 기록해 생년월일·시간·성별·전화번호·기둥이 나가지 않는지 검사
// - Supabase 저장 요청(201) 확인. QA 기록 식별: 피드백 comment "[PROD QA]" + 기록된 session_id 목록
import { spawn, spawnSync } from "node:child_process";
/** 브라우저 프로세스 트리 전체 종료 (Windows 는 자식 프로세스가 남아 다음 실행을 막는다) */
function killTree(proc) {
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
      // 트리에서 떨어져 나간 보조 프로세스도 이 실행의 테스트 프로필 경로로 찾아 종료
      const tag = String(proc.spawnargs.find((x) => x.startsWith("--user-data-dir=")) ?? "").split("=")[1]?.split("/").pop();
      if (tag) spawnSync("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match '${tag}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" });
    }
    else proc.kill("SIGKILL");
  } catch {}
}

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const BASE = (process.argv[2] ?? "https://palja-play.vercel.app").replace(/\/+$/, "");
const SHOTS = "docs/screenshots";
mkdirSync(SHOTS, { recursive: true });
mkdirSync("e2e-artifacts", { recursive: true });
const BROWSER = process.env.PALJA_BROWSER ?? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 20000, step = 150) {
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

/** 별도 프로필의 브라우저 하나 = 독립된 사용자 */
async function launch(name, port) {
  const profile = `e2e-artifacts/prod-profile-${name}-${process.pid}`;
  rmSync(profile, { recursive: true, force: true });
  const proc = spawn(BROWSER, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--lang=ko-KR", "about:blank"], { stdio: "ignore" });
  await waitFor(() => fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()));
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  let seq = 0;
  const pending = new Map();
  const net = []; // { id, method, url, body, status }
  const errors = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method === "Network.requestWillBeSent") {
      net.push({ id: msg.params.requestId, method: msg.params.request.method, url: msg.params.request.url, body: msg.params.request.postData ?? "", status: null });
    } else if (msg.method === "Network.responseReceived") {
      const r = net.find((x) => x.id === msg.params.requestId);
      if (r) r.status = msg.params.response.status;
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    }
  };
  const cdp = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Network.enable", { maxPostDataSize: 65536 });
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });
  await cdp("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" });
  const evaluate = async (expr) => {
    const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const shot = async (file, selector) => {
    if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start'}); window.scrollBy(0,-64); true`);
    await sleep(300);
    const { data } = await cdp("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${SHOTS}/${file}.png`, Buffer.from(data, "base64"));
    return `${SHOTS}/${file}.png`;
  };
  const open = async (url) => {
    await cdp("Page.navigate", { url });
    await waitFor(() => evaluate("document.readyState === 'complete' && !!document.getElementById('go')"));
    await evaluate("Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]).then(() => true)");
  };
  return { name, proc, ws, cdp, evaluate, shot, open, net, errors };
}

const results = [];
const shots = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✔ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e?.message ?? e) });
    console.log(`  ✖ ${name}\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const DEV_TERMS = ["SolarTermProvider", "boundaryRisk", "confidence", "verificationStatus", "engineVersion", "schemaVersion", "not-verified", "verified-internally", "uncertain", "unavailable", "undefined", "NaN", "[object Object]"];

async function fill(u, { date, time, gender }) {
  await u.evaluate(`(() => {
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); };
    set(document.getElementById('dt'), ${JSON.stringify(date)});
    set(document.getElementById('tm'), ${JSON.stringify(time)});
    document.querySelector('#sex button[data-v="${gender}"]').click();
    return true; })()`);
}
async function calc(u) {
  await u.evaluate("document.getElementById('calc').click(); true");
  await waitFor(() => u.evaluate("document.getElementById('s-result').classList.contains('on')"), 10000);
  await sleep(600);
}

console.log(`Production QA → ${BASE}`);
const A = await launch("me", 9411);
const B = await launch("friend", 9412);
const ME = { date: "1990-05-15", time: "14:20", gender: "female" };
const FRIEND = { date: "1988-08-08", time: "08:08", gender: "male" };
const PHONE = "010-9876-5432";
let battleLink = null;

console.log("\n[사용자 A: 나]");
await A.open(`${BASE}/`);
shots.push(await A.shot("prod-01-landing"));
await check("공개 URL 랜딩: 사주팔자PLAY, BETA, 개발 표시 없음", async () => {
  const t = await A.evaluate("document.body.innerText");
  assert(t.includes("내 팔자") && t.includes("BETA") && (await A.evaluate("document.getElementById('home').textContent")) === "사주팔자PLAY", "브랜드");
  assert(await A.evaluate("document.getElementById('devflag') === null && !document.body.innerText.includes('개발 환경')"), "개발 환경 배지·문구 없음");
  assert((await A.evaluate("typeof window.__PALJA_DEV__")) === "undefined", "개발 hook 없음");
});
await check("입력 → 계산 애니메이션 → 결과 (독립형 승부사), 가로 넘침·개발자 용어 없음", async () => {
  await A.evaluate("document.getElementById('go').click(); true");
  await fill(A, ME);
  await calc(A);
  const t = await A.evaluate("document.body.innerText");
  assert(t.includes("독립형 승부사"), "캐릭터");
  for (const w of DEV_TERMS) assert(!t.includes(w), `개발자 용어: ${w}`);
  const o = await A.evaluate("({sw: document.documentElement.scrollWidth, w: innerWidth})");
  assert(o.sw <= o.w, `넘침 ${o.sw}>${o.w}`);
});
shots.push(await A.shot("prod-02-result-top"));
await check("Premium: 2,900원 카드 3개, 클릭 → 준비 중 안내, 관심 남기기", async () => {
  const cards = await A.evaluate("[...document.querySelectorAll('.prod')].map(p => p.innerText)");
  assert(cards.length === 3 && cards.every((c) => c.includes("2,900원")), "가격");
  await A.evaluate("document.querySelector('.prod[data-product=premium_money] .btn').click(); true");
  await sleep(500);
  assert((await A.evaluate("document.getElementById('sheet').innerText")).includes("이 리포트는 현재 준비 중이에요"), "시트");
  await A.evaluate("document.getElementById('sheet-interest').click(); true");
  await sleep(1300);
});
shots.push(await A.shot("prod-03-premium", "#premium"));
await check("피드백 제출 → 감사 화면 (Supabase 저장 성공해야 표시됨)", async () => {
  await A.evaluate(`(() => {
    document.querySelector('#feedback .emo button[data-score="5"]').click();
    document.querySelector('#feedback button[data-group="best"][data-area="personality"]').click();
    document.querySelector('#feedback button[data-group="worst"][data-area="none"]').click();
    document.querySelector('#feedback button[data-intent="yes"]').click();
    document.getElementById('fb-comment').value = '[PROD QA] 자동 점검 기록 - 삭제해도 됨';
    document.getElementById('fb-submit').click(); return true; })()`);
  await waitFor(() => A.evaluate("document.getElementById('feedback').innerText.includes('고마워요')"), 10000);
});
shots.push(await A.shot("prod-04-feedback-done", "#feedback"));
await check("배틀: 닉네임·전화번호 안내, 문자 앱 열기(번호 지움), 링크는 공개 URL", async () => {
  const t = await A.evaluate("document.body.innerText");
  assert(t.includes("배틀 닉네임") && t.includes("실명 대신 별명을 추천해요.") && t.includes("전화번호는 저장되지 않으며 개인정보보호 처리됩니다."), "안내 문구");
  await A.evaluate(`(() => { document.getElementById('battle-nick').value = 'QA봇'; document.getElementById('battle-phone').value = '${PHONE}'; document.getElementById('sms-btn').click(); return true; })()`);
  await sleep(800);
  assert((await A.evaluate("document.getElementById('battle-phone').value")) === "", "번호 지움");
  await A.evaluate(`(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    window.__copied = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });
    document.getElementById('copy-btn').click(); return true; })()`);
  await sleep(500);
  const text = await A.evaluate("window.__copied");
  battleLink = text.trim();
  assert(/^https:\/\/palja-play\.vercel\.app\/\?b=[A-Za-z0-9_-]+$/.test(battleLink) && battleLink.startsWith(`${BASE}/?b=`), `링크: ${battleLink}`);
  assert(!/localhost|127\.0\.0\.1/.test(text), "localhost 없음");
  for (const bad of ["1990", "0515", "05-15", "14:20", "1420", "female", "9876"]) assert(!text.includes(bad), `링크/문구에 ${bad}`);
});
shots.push(await A.shot("prod-05-battle-send", "#battle"));

console.log("\n[사용자 B: 친구, 별도 브라우저]");
await check("배틀 링크 열기 → 초대 배너", async () => {
  assert(battleLink, "링크");
  await B.open(battleLink);
  await sleep(500);
  const t = await B.evaluate("document.body.innerText");
  assert(t.includes("배틀 신청이 도착했어요") && t.includes("QA봇님의 배틀 신청이 도착했어요") && t.includes("도전자 캐릭터: 독립형 승부사") && t.includes("내 팔자로 도전하기"), t.slice(0, 120));
});
shots.push(await B.shot("prod-06-battle-invite"));
await check("친구 입력 → 계산 → VS 결과(7라운드)", async () => {
  await B.evaluate("document.getElementById('go').click(); true");
  await fill(B, FRIEND);
  await calc(B);
  const box = await B.evaluate("document.getElementById('battle-result')?.innerText ?? ''");
  assert(box.includes("QA봇과의 배틀") && /승리|패배|무승부/.test(box), box.slice(0, 80));
  assert((await B.evaluate("document.querySelectorAll('#battle-result .round').length")) === 7, "7라운드");
  const o = await B.evaluate("({sw: document.documentElement.scrollWidth, w: innerWidth})");
  assert(o.sw <= o.w, "넘침");
});
shots.push(await B.shot("prod-07-battle-result", "#battle-result"));

console.log("\n[공통 점검]");
await check("/debug.html 차단 (404)", async () => {
  const s = await A.evaluate(`fetch('${BASE}/debug.html').then(r => r.status)`);
  const s2 = await A.evaluate(`fetch('${BASE}/assets/debug.js').then(r => r.status)`);
  assert(s === 404 && s2 === 404, `${s} ${s2}`);
});
// 브라우저가 먼저 보내는 CORS 확인 요청(OPTIONS, 본문 없음)은 제외하고 실제 저장(POST)만 센다
const supa = [...A.net, ...B.net].filter((r) => r.url.includes(".supabase.co/rest/v1/") && r.method === "POST");
await check("Supabase 저장: 피드백 1건 + 이벤트(클릭·관심 포함) 모두 201", async () => {
  const fb = supa.filter((r) => r.url.endsWith("/beta_feedback"));
  const ev = supa.filter((r) => r.url.endsWith("/beta_events"));
  assert(fb.length === 1 && fb[0].status === 201, `feedback ${fb.length} ${fb[0]?.status}`);
  const names = ev.map((r) => JSON.parse(r.body).name);
  for (const n of ["landing_view", "input_start", "calculation_complete", "result_view", "premium_money_click", "premium_money_interest", "feedback_submit", "share_click"]) assert(names.includes(n), `이벤트 ${n}`);
  assert(ev.every((r) => r.status === 201), `이벤트 응답 ${ev.map((r) => r.status).join(",")}`);
  assert(supa.every((r) => JSON.parse(r.body).source === "production"), "source=production");
});
await check("개인정보 네트워크 검사: 생년월일·출생시간·성별·전화번호·rawInput·pillars 가 어떤 인터넷 요청에도 없음", async () => {
  const web = [...A.net, ...B.net].filter((r) => /^https?:/.test(r.url));
  assert(web.length > 10, `요청 수 ${web.length}`);
  const bad = ["1990-05-15", "19900515", "14:20", "1988-08-08", "19880808", "08:08", "female", "\"male\"", "gender", "birthDate", "birthTime", "birth_date", "rawInput", "pillars", "경오", "신사", "경진", "계미", "010-9876-5432", "01098765432", "9876"];
  const hits = web.filter((r) => bad.some((b) => r.url.includes(b) || r.body.includes(b)));
  assert(hits.length === 0, hits.slice(0, 3).map((h) => `${h.method} ${h.url} ${h.body.slice(0, 80)}`).join(" | "));
});
await check("페이지 오류 없음", async () => {
  assert(A.errors.length === 0 && B.errors.length === 0, [...A.errors, ...B.errors].join(" | "));
});

const hosts = [...new Set([...A.net, ...B.net].filter((r) => /^https?:/.test(r.url)).map((r) => new URL(r.url).host))].sort();
const sessionIds = [...new Set(supa.filter((r) => r.url.endsWith("/beta_events")).map((r) => JSON.parse(r.body).session_id))];
const resultIds = [...new Set(supa.map((r) => JSON.parse(r.body).result_id).filter(Boolean))];
for (const u of [A, B]) {
  u.ws.close();
  killTree(u.proc);
}
const failed = results.filter((r) => !r.ok);
const report = { base: BASE, at: new Date().toISOString(), results, shots, hosts, qaSessionIds: sessionIds, qaResultIds: resultIds, supabaseRequests: supa.map((r) => ({ table: r.url.split("/").pop(), status: r.status, name: JSON.parse(r.body).name ?? "feedback" })) };
writeFileSync("e2e-artifacts/prod-qa-result.json", JSON.stringify(report, null, 2));
console.log(`\n접속한 외부 호스트: ${hosts.join(", ")}`);
console.log(`QA 세션 id (Supabase 에서 식별용): ${sessionIds.join(", ")}`);
console.log(`\nProduction QA: ${results.length - failed.length}/${results.length} 통과, 캡처 ${shots.length}장`);
process.exit(failed.length ? 1 : 0);
