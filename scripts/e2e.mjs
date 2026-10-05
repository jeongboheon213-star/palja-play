// 실제 브라우저 E2E (Microsoft Edge/Chrome headless + DevTools Protocol). 추가 npm 패키지 없음.
//
//   npm run e2e         (dist-dev 빌드 후 실행)
//   PALJA_BROWSER=경로  (Edge/Chrome 실행 파일 지정, 기본: Windows Edge 설치 경로)
//
// 하는 일
//  - dist-dev 를 임시 로컬 서버로 띄우고 모바일(390x844)·데스크톱(1280x900) 화면에서 실제 흐름을 클릭한다.
//  - 결과·이벤트·피드백 저장 레코드·공유 문구를 검사하고 화면 캡처를 docs/screenshots/ 에 저장한다.
//  - 실패하면 exit code 1.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = "dist-dev";
const SHOTS = "docs/screenshots";
const PROFILE = `e2e-artifacts/profile-${process.pid}`; // 실행마다 새 프로필
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

const BROWSER =
  process.env.PALJA_BROWSER ??
  ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find((p) => existsSync(p));
if (!BROWSER) throw new Error("Edge/Chrome 실행 파일을 찾지 못했습니다 (PALJA_BROWSER 로 지정).");
if (!existsSync(`${ROOT}/index.html`)) throw new Error("dist-dev 가 없습니다. npm run build:dev 먼저 실행.");

// ── 정적 서버 ───────────────────────────────────────────────
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png" };
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const p = join(ROOT, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ── 브라우저 실행 + CDP ─────────────────────────────────────
rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });
mkdirSync("e2e-artifacts", { recursive: true });
const DEBUG_PORT = 9300 + Math.floor((process.pid % 500));
const browser = spawn(BROWSER, [
  "--headless=new",
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--lang=ko-KR",
  "about:blank",
], { stdio: "ignore" });

async function waitFor(fn, ms = 15000, step = 100) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    if (Date.now() > end) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, step));
  }
}
const version = await waitFor(() => fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json()));
const target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});
let seq = 0;
const pending = new Map();
const pageErrors = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method === "Network.requestWillBeSent") {
    netLog.push(`${msg.params.request.method} ${msg.params.request.url} ${msg.params.request.postData ?? ""}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    pageErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    pageErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
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
await cdp("Network.enable");
const netLog = [];

async function evaluate(expr) {
  const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`page eval: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}\n${expr}`);
  return r.result.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
async function viewport(kind) {
  await cdp("Emulation.setUserAgentOverride", { userAgent: kind === "desktop" ? version["User-Agent"] : ANDROID_UA });
  if (kind === "mobile") await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  else if (kind === "small") await cdp("Emulation.setDeviceMetricsOverride", { width: 320, height: 640, deviceScaleFactor: 2, mobile: true });
  else await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Emulation.setTouchEmulationEnabled", { enabled: kind !== "desktop" });
}
async function open(path = "/") {
  await cdp("Page.navigate", { url: BASE + path });
  await waitFor(() => evaluate("document.readyState === 'complete' && !!window.__PALJA_DEV__"));
  // 웹폰트 로드 후 캡처 (네트워크가 없으면 시스템 글꼴로 진행)
  await evaluate("Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]).then(() => true)");
}
async function shot(name, selector = null) {
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'}); window.scrollBy(0, -64); true`);
  await sleep(250);
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, "base64"));
  shots.push(`${SHOTS}/${name}.png`);
}
const shots = [];

// ── 검사 도구 ───────────────────────────────────────────────
const results = [];
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
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const DEV_TERMS = ["SolarTermProvider", "boundaryRisk", "confidence", "verificationStatus", "engineVersion", "schemaVersion", "not-verified", "verified-internally", "uncertain", "unavailable", "undefined", "NaN", "[object Object]"];
const visibleText = () => evaluate("document.body.innerText");
async function noDevTerms() {
  const t = await visibleText();
  for (const w of DEV_TERMS) assert(!t.includes(w), `화면에 개발자 용어 노출: ${w}`);
  assert(!/\bnull\b/.test(t), "화면에 null 노출");
}
async function noOverflow() {
  const r = await evaluate("({sw: document.documentElement.scrollWidth, w: window.innerWidth})");
  assert(r.sw <= r.w, `가로 넘침: scrollWidth ${r.sw} > ${r.w}`);
}
const events = () => evaluate("window.__PALJA_DEV__.events.map(e => e.name)");
const click = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('no element ${sel.replace(/'/g, "")}'); el.click(); return true; })()`);
const clickText = (sel, text) =>
  evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => x.textContent.trim().includes(${JSON.stringify(text)})); if (!el) throw new Error('no ${text}'); el.click(); return true; })()`);
async function fill({ date, time, unknown = false, gender = "female" }) {
  await evaluate(`(() => {
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); };
    const unk = document.getElementById('unk');
    if (unk.checked !== ${unknown}) { unk.click(); }
    set(document.getElementById('dt'), ${JSON.stringify(date)});
    if (!${unknown}) set(document.getElementById('tm'), ${JSON.stringify(time ?? "")});
    ${gender ? `document.querySelector('#sex button[data-v="${gender}"]').click();` : ""}
    return true; })()`);
}
async function submitAndWaitResult() {
  await click("#calc");
  await waitFor(() => evaluate("document.getElementById('s-result').classList.contains('on')"), 8000);
  await sleep(500); // 막대 애니메이션
}
async function startFresh() {
  await open("/");
  await click("#go");
  await waitFor(() => evaluate("document.getElementById('s-input').classList.contains('on')"));
}

// ════════════════════════════════════════════════════════════
console.log(`browser: ${version.Browser}  base: ${BASE}`);

console.log("\n[모바일 390x844] 기본 흐름");
await viewport("mobile");
await open("/");
await check("Landing 표시 + landing_view 이벤트 + Beta 표시", async () => {
  const t = await visibleText();
  assert(t.includes("내 팔자") && t.includes("BETA"), "랜딩 문구");
  assert((await events()).includes("landing_view"), "landing_view");
  await noOverflow();
});
await shot("01-landing-mobile");

await click("#go");
await check("입력 화면: 음력·해외 출생 disabled, 양력 선택", async () => {
  assert(await evaluate("[...document.querySelectorAll('.seg button')].find(b => b.textContent.includes('음력')).disabled"), "음력 disabled");
  const t = await visibleText();
  assert(t.includes("음력 — Beta 준비 중") && t.includes("해외 출생 — Beta 준비 중"), "준비 중 문구");
  await noOverflow();
});
await shot("02-input-mobile");

await check("잘못된 입력: 빈 값 제출 → 안내, 결과로 넘어가지 않음", async () => {
  await click("#calc");
  const err = await evaluate("document.getElementById('err').textContent");
  assert(err.includes("생년월일") && err.includes("성별"), `에러: ${err}`);
  assert(await evaluate("document.getElementById('s-input').classList.contains('on')"), "입력 화면 유지");
});
await shot("03-input-error-mobile");

await check("잘못된 입력: 1961-12-31 → 지원 범위 안내", async () => {
  await fill({ date: "1961-12-31", time: "10:00" });
  await click("#calc");
  assert((await evaluate("document.getElementById('err').textContent")).includes("1962"), "1962 안내");
});
await check("잘못된 입력: 미래 날짜 → 안내", async () => {
  await fill({ date: "2099-01-01", time: "10:00" });
  await click("#calc");
  assert((await evaluate("document.getElementById('err').textContent")).includes("오늘 이후"), "미래 안내");
});
await check("서머타임 gap 1987-05-10 02:30 → 안내 (결과 막음)", async () => {
  await fill({ date: "1987-05-10", time: "02:30" });
  await click("#calc");
  assert((await evaluate("document.getElementById('err').textContent")).includes("서머타임"), "gap 안내");
});

await check("정상 입력 1990-05-15 14:20 → 계산 애니메이션 → 결과", async () => {
  await fill({ date: "1990-05-15", time: "14:20" });
  await click("#calc");
  await sleep(700);
  assert(await evaluate("document.getElementById('s-loading').classList.contains('on')"), "계산 화면");
  const steps = await visibleText();
  assert(steps.includes("팔자를 펼치는 중"), "애니메이션 문구");
});
await shot("04-loading-mobile");
await waitFor(() => evaluate("document.getElementById('s-result').classList.contains('on')"), 8000);
await sleep(600);

await check("결과 최상단: 캐릭터·한 줄 설명·진행 문구, 개발자 용어 없음, 가로 넘침 없음", async () => {
  const t = await visibleText();
  assert(t.includes("독립형 승부사") && t.includes("혼자서도 판을 읽고 결정하는 사람"), "캐릭터");
  assert(t.includes("나와 얼마나 비슷한지 내려가면서 확인해보세요"), "진행 문구");
  await noDevTerms();
  await noOverflow();
  const ev = await events();
  for (const n of ["input_start", "calculation_complete", "result_view"]) assert(ev.includes(n), n);
});
await shot("05-result-top-mobile");

await check("7개 능력치: 게임 스탯 막대 + '기본 운 밸런스' 명칭 + 운세 아님 안내", async () => {
  const stats = await evaluate("[...document.querySelectorAll('#stats .stat')].map(s => [s.querySelector('.nm').textContent, s.querySelector('.v').textContent, s.querySelectorAll('.blocks i.f').length])");
  assert(stats.length === 7, `stat ${stats.length}`);
  assert(stats.map((s) => s[0]).join(",") === "재물력,연애력,사업력,직업력,인간관계,실행력,기본 운 밸런스", stats.map((s) => s[0]).join(","));
  for (const [, v, f] of stats) assert(f === Math.round(Number(v) / 10), `막대 ${v} ${f}`);
  assert((await visibleText()).includes("올해·이번 달 운세가 아니에요"), "운세 아님 안내");
});
await shot("06-stats-mobile", "#stats-title");

await check("FREE 해석: 강점·주의점·오행·5개 영역·키워드", async () => {
  const t = await visibleText();
  for (const s of ["강점", "주의하면 좋은 점", "오행 밸런스", "돈에서는 이런 특징이 있어요", "연애에서는?", "직업에서는?", "사업에서는?", "사람 사이에서는?", "인생 키워드"]) assert(t.includes(s), s);
});
await shot("07-free-interpretation-mobile", ".blk");

await check("Premium: 3개 카드 2,900원 + WHY 미리보기 + 시기 준비 중", async () => {
  const cards = await evaluate("[...document.querySelectorAll('.prod')].map(p => p.innerText)");
  assert(cards.length === 3, `cards ${cards.length}`);
  for (const c of cards) assert(c.includes("2,900원") && c.includes("Beta 테스트 가격") && c.includes("준비 중"), c.slice(0, 40));
  const t = await visibleText();
  assert(t.includes("여기까지가 무료 팔자풀이"), "intro");
});
await shot("08-premium-mobile", "#premium");

await check("Premium 클릭 → 바텀시트(결제 화면 아님) + premium_money_click, 관심 버튼 → premium_money_interest", async () => {
  await evaluate("document.querySelector('.prod[data-product=premium_money] .btn').click(); true");
  await sleep(400);
  const sheet = await evaluate("({hidden: document.getElementById('sheet').hidden, text: document.getElementById('sheet').innerText, url: location.href})");
  assert(!sheet.hidden && sheet.text.includes("이 리포트는 현재 준비 중이에요") && sheet.text.includes("사주팔자PLAY Beta"), "시트 문구");
  assert(sheet.url === BASE + "/", "페이지 이동 없음");
  assert((await events()).includes("premium_money_click"), "click 이벤트");
  assert(!(await events()).includes("premium_money_interest"), "아직 관심 아님");
});
await shot("09-premium-sheet-mobile");
await check("관심 표시 이벤트 분리", async () => {
  await click("#sheet-interest");
  await sleep(1300);
  const ev = await events();
  assert(ev.includes("premium_money_interest"), "interest");
  await evaluate("document.querySelector('.prod[data-product=premium_love] .btn').click(); true");
  await sleep(300);
  await click("#sheet-close");
  await sleep(400);
  const ev2 = await events();
  assert(ev2.includes("premium_love_click") && !ev2.includes("premium_love_interest"), "love: 클릭만");
});

await check("Feedback: 1~5 이모지, 영역 복수 선택, 없음, 공유 의향, 한마디 → 저장 레코드에 개인정보 없음", async () => {
  assert(await evaluate("document.getElementById('fb-submit').disabled"), "점수 전 제출 비활성");
  await click('#feedback .emo button[data-score="5"]');
  await click('#feedback button[data-group="best"][data-area="personality"]');
  await click('#feedback button[data-group="best"][data-area="career"]');
  await click('#feedback button[data-group="worst"][data-area="wealth"]');
  await click('#feedback button[data-group="worst"][data-area="none"]');
  await click('#feedback button[data-intent="yes"]');
  await evaluate("document.getElementById('fb-comment').value = '직업 부분이 소름'; true");
});
await shot("10-feedback-mobile", "#feedback");
await check("Feedback 제출 → 감사 화면 + feedback_submit + localStorage(개발용) 레코드 검사", async () => {
  await click("#fb-submit");
  await waitFor(() => evaluate("document.getElementById('feedback').innerText.includes('고마워요')"), 3000);
  const recs = JSON.parse(await evaluate("localStorage.getItem('palja-dev-feedback-v1')"));
  assert(recs.length === 1, "레코드 1개");
  const r = recs[0];
  assert(r.similarity === 5 && r.worstMatch === "none" && r.shareIntent === "yes", "값");
  assert(r.bestMatch.join(",") === "personality,career", r.bestMatch.join(","));
  assert(/^[0-9a-f-]{36}$/.test(r.resultId) && /^[0-9a-f-]{36}$/.test(r.feedbackId), "UUID");
  for (const k of ["engineVersion", "schemaVersion", "interpretationVersion", "scoreVersion", "solarTermProviderVersion"]) assert(r.versions[k], k);
  const json = JSON.stringify(r);
  // 무작위 UUID·생성 시각은 우연히 "1990"·"14:20" 같은 숫자를 포함할 수 있다(실제 발생: resultId …419901…).
  // 그래서 이 세 필드는 형식만 검사하고, 나머지 모든 값·키 이름에서 개인정보 문자열을 찾는다.
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.createdAt), "createdAt 형식");
  const { feedbackId: _f, resultId: _r, createdAt: _c, ...rest } = r;
  const restJson = JSON.stringify(rest);
  assert(!restJson.includes("1990") && !restJson.includes("14:20") && !restJson.includes("05-15") && !restJson.includes("female") && !/gender|birth/i.test(json), `개인정보 미포함: ${restJson}`);
  assert((await events()).includes("feedback_submit"), "feedback_submit");
});
await shot("11-feedback-done-mobile", "#feedback");

let battleLink = null;
await check("친구와 배틀하기(모바일): 링크 복사 → 복사된 값이 canonical battle URL(?b=, ~·# 없음) + share_click(mode=battle)", async () => {
  const t = await visibleText();
  assert(t.includes("친구와 배틀하기") && !t.includes("내 캐릭터 자랑하기"), "섹션 제목");
  assert((await evaluate("document.getElementById('battle').dataset.device")) === "mobile", "모바일 화면으로 인식");
  await evaluate(`(() => {
    window.__copied = null;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });
    const n = document.getElementById('battle-nick'); n.value = '보헌'; n.dispatchEvent(new Event('input', {bubbles:true}));
    return true; })()`);
  await click("#copy-btn");
  await sleep(300);
  battleLink = await evaluate("window.__copied");
  assert(/^http:\/\/127\.0\.0\.1:\d+\/\?b=[A-Za-z0-9_-]+$/.test(battleLink), `복사된 값: ${battleLink}`);
  for (const bad of ["1990", "14:20", "05-15", "0515", "female", "~", "#"]) assert(!battleLink.includes(bad), `링크에 ${bad}`);
  assert((await visibleText()).includes("배틀 링크가 복사됐어요! 친구에게 보내보세요 ⚔️"), "복사 안내");
  const ev = await evaluate("window.__PALJA_DEV__.events.filter(e => e.name === 'share_click').map(e => e.props)");
  assert(ev.length && ev.at(-1).mode === "battle" && ev.at(-1).hasNickname === true && ev.at(-1).device === "mobile", JSON.stringify(ev));
});
await check("배틀 공유: 자동 복사가 모두 실패하면 링크 입력창을 보여 직접 복사 (canonical URL)", async () => {
  await evaluate("Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); document.execCommand = () => false; true");
  await click("#copy-btn");
  await sleep(200);
  assert((await evaluate("document.getElementById('battle-url-input')?.value")) === battleLink, "직접 복사용 입력창 = 같은 링크");
});
await check("문자로 배틀 신청: 안내 문구, 잘못된 번호 안내, 문자 본문의 링크 = canonical, 보낸 뒤 번호 지움, 이벤트에 번호 없음", async () => {
  const t = await visibleText();
  assert(t.includes("배틀 닉네임") && t.includes("실명 대신 별명을 추천해요."), "닉네임 안내");
  assert(t.includes("전화번호는 저장되지 않으며 개인정보보호 처리됩니다."), "전화번호 안내");
  await evaluate("document.getElementById('battle-phone').value = '02-123'; true");
  await click("#sms-btn");
  assert((await evaluate("document.getElementById('battle-err').textContent")).includes("휴대폰 번호"), "번호 오류 안내");
  await evaluate("document.getElementById('battle-phone').value = '010-9876-5432'; true");
  await click("#sms-btn");
  await sleep(500);
  const sms = netLog.filter((l) => l.includes(" sms:")).at(-1) ?? "";
  const body = decodeURIComponent((sms.split("body=")[1] ?? "").trim()); // 로그 형식상 끝에 붙는 공백 제거
  assert(body.split("\n").pop() === battleLink, `문자 본문 링크: ${body.split("\n").pop()}`);
  assert((await evaluate("document.getElementById('battle-phone')?.value ?? ''")) === "", "보낸 뒤 번호 지움");
  const ev = await evaluate("window.__PALJA_DEV__.events.filter(e => e.name === 'share_click').at(-1)");
  assert(ev.props.method === "sms", JSON.stringify(ev.props));
  assert(!JSON.stringify(ev).includes("9876") && !JSON.stringify(ev).includes("01098765432"), "이벤트에 번호 없음");
  const stored = await evaluate("JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + document.cookie");
  assert(!stored.includes("9876"), "브라우저 저장소에 번호 없음");
});
await shot("12-battle-send-mobile", "#battle");
await check("결과 하단 Beta 안내 + 콘솔/페이지 오류 없음", async () => {
  assert((await visibleText()).includes("엔터테인먼트 서비스입니다"), "안내");
  assert(pageErrors.length === 0, pageErrors.join(" | "));
});
await shot("13-result-bottom-mobile", ".note");

console.log("\n[모바일] 시간 미상 / 경계 / 입춘 당일 / 서머타임 overlap / 1962 경계");
await startFresh();
await check("시간 미상: 결과 표시 + 시간 입력 권유 + 시주 '–'", async () => {
  await fill({ date: "1995-08-20", unknown: true });
  await submitAndWaitResult();
  const t = await visibleText();
  assert(t.includes("출생 시간을 입력하면 더 세밀한 결과를 볼 수 있어요"), "권유 문구");
  assert((await evaluate("document.querySelectorAll('#stats .stat').length")) === 7, "능력치 7");
  const hour = await evaluate("[...document.querySelectorAll('.pil div')].pop().textContent"); // 접힌 details 안이라 innerText 대신 textContent
  assert(hour.includes("–") && hour.includes("시간 미상"), hour);
  await noDevTerms();
});
await shot("14-time-unknown-mobile");

await startFresh();
await check("절기 경계 출생(2020-02-04 17:50) → 자연어 경계 안내, 결과는 그대로 표시", async () => {
  await fill({ date: "2020-02-04", time: "17:50", gender: "male" });
  await submitAndWaitResult();
  const t = await visibleText();
  assert(t.includes("절기 경계와 가까워 Beta 계산 기준에 따라 일부 결과가 달라질 수 있어요"), "경계 안내");
  assert((await evaluate("document.querySelectorAll('#stats .stat').length")) === 7, "결과 표시");
  await noDevTerms();
});
await shot("15-boundary-notice-mobile");

await startFresh();
await check("입춘 당일 + 시간 미상: 연·월주 '?' (임의 선택 없음) + 안내", async () => {
  await fill({ date: "2010-02-04", unknown: true });
  await submitAndWaitResult();
  const pil = await evaluate("[...document.querySelectorAll('.pil div')].map(d => d.querySelector('b').textContent)");
  assert(pil[0] === "?" && pil[1] === "?" && pil[3] === "–", pil.join(","));
  assert((await visibleText()).includes("일부 기둥을 하나로 정할 수 없어요"), "안내");
  await noDevTerms();
});

await startFresh();
await check("서머타임 overlap 1987-10-11 02:30 → 선택지 표시 → 선택 후 결과", async () => {
  await fill({ date: "1987-10-11", time: "02:30" });
  await click("#calc");
  assert(await evaluate("!document.getElementById('overlap').hidden"), "선택지");
  await shot("16-dst-overlap-choice-mobile");
  await clickText("#overlap button", "표준시");
  await waitFor(() => evaluate("document.getElementById('s-result').classList.contains('on')"), 8000);
});

await startFresh();
await check("1962-01-01 (지원 시작일) 계산 가능", async () => {
  await fill({ date: "1962-01-01", time: "00:00" });
  await submitAndWaitResult();
  assert((await evaluate("document.querySelectorAll('#stats .stat').length")) === 7, "결과");
});
await check("새로고침하면 처음 화면으로 (입력 정보 남지 않음)", async () => {
  await open("/");
  assert(await evaluate("document.getElementById('s-landing').classList.contains('on')"), "랜딩");
  assert((await evaluate("document.getElementById('dt').value")) === "", "날짜 비어 있음");
});

console.log("\n[모바일] 친구와 배틀: 링크로 들어온 친구");
await check("배틀 링크로 입장(새 탭) → 'OOO님의 배틀 신청이 도착했어요' + 도전자 캐릭터 + landing_view(via=battle)", async () => {
  assert(battleLink, "앞 단계에서 만든 배틀 링크");
  await cdp("Page.navigate", { url: "about:blank" });
  await cdp("Page.navigate", { url: battleLink });
  await waitFor(() => evaluate("document.readyState === 'complete' && !!window.__PALJA_DEV__"));
  await sleep(300);
  const t = await visibleText();
  assert(t.includes("보헌님의 배틀 신청이 도착했어요") && t.includes("도전자 캐릭터: 독립형 승부사"), "초대 배너");
  assert(t.includes("내 팔자로 도전하기"), "CTA 문구");
  const lv = await evaluate("window.__PALJA_DEV__.events.find(e => e.name === 'landing_view').props.via");
  assert(lv === "battle", lv);
  await noOverflow();
});
await shot("21-battle-invite-mobile");
await check("친구가 자기 팔자 입력 → 결과 상단에 배틀 결과(VS, 7라운드, 승패, 총점) + result_view.battleOutcome", async () => {
  await click("#go");
  await fill({ date: "1988-08-08", time: "08:08", gender: "male" });
  await submitAndWaitResult();
  const box = await evaluate("document.getElementById('battle-result')?.innerText ?? ''");
  assert(box.includes("보헌과의 배틀") && /승리|패배|무승부/.test(box), box.slice(0, 80));
  assert((await evaluate("document.querySelectorAll('#battle-result .round').length")) === 7, "7라운드");
  assert(box.includes("기본 운 밸런스") && box.includes("총점"), "라운드 이름/총점");
  const outcome = await evaluate("window.__PALJA_DEV__.events.find(e => e.name === 'result_view').props.battleOutcome");
  assert(["win", "lose", "draw"].includes(outcome), String(outcome));
  await noDevTerms();
  await noOverflow();
});
await shot("22-battle-result-mobile", "#battle-result");
await check("리매치: 친구도 배틀 섹션에서 다시 도전장 (새 canonical 링크, share_click.rematch=true)", async () => {
  await evaluate(`(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); return true; })()`);
  await click("#copy-btn");
  await sleep(300);
  const rematch = await evaluate("window.__copied");
  assert(/\?b=[A-Za-z0-9_-]+$/.test(rematch) && rematch !== battleLink, `리매치 링크: ${rematch}`);
  const last = await evaluate("window.__PALJA_DEV__.events.filter(e => e.name === 'share_click').at(-1).props");
  assert(last.rematch === true, JSON.stringify(last));
});
await check("이미 사이트가 열린 탭에서 배틀 링크로 이동 → 배틀 초대 (새 형식 query / 예전 형식 hash 모두)", async () => {
  await open("/");
  await cdp("Page.navigate", { url: battleLink });
  await waitFor(() => evaluate("document.readyState === 'complete' && !!window.__PALJA_DEV__ && !!document.getElementById('battle-invite')"), 8000);
  // 예전 형식: 같은 탭에서 # 만 바뀌는 이동
  await open("/");
  await evaluate("location.hash = '#b=b1~gyeong-challenger~40_65_55_80_89_80_68~67O07ZeM'; true");
  await waitFor(() => evaluate("!!document.getElementById('battle-invite')"), 8000);
});
await check("조작·손상된 배틀 링크 → 배틀 없이 평소 랜딩 + '배틀 링크가 올바르지 않아요' 안내 (새·예전 형식)", async () => {
  for (const bad of ["/?b=AAAAhackAAAA", "/?b=" + battleLink.split("?b=")[1].slice(0, 20), "/#b=b1~hacker~999_1_1_1_1_1_1"]) {
    await cdp("Page.navigate", { url: "about:blank" });
    await cdp("Page.navigate", { url: BASE + bad });
    await waitFor(() => evaluate("document.readyState === 'complete' && !!window.__PALJA_DEV__"));
    await sleep(600);
    const t = await visibleText();
    assert(!t.includes("배틀 신청이 도착했어요") && t.includes("내 팔자 보기"), `평소 랜딩: ${bad}`);
    assert(t.includes("배틀 링크가 올바르지 않아요"), `안내: ${bad}`);
    const via = await evaluate("window.__PALJA_DEV__.events.find(e => e.name === 'landing_view').props.via");
    assert(via === "battle-invalid", via);
  }
  assert(pageErrors.length === 0, pageErrors.join(" | "));
});

console.log("\n[작은 폰 320x640]");
await viewport("small");
await check("320px: 랜딩·입력·결과·배틀 결과 모두 가로 넘침 없음", async () => {
  await open("/");
  await noOverflow();
  await click("#go");
  await noOverflow();
  await fill({ date: "1977-07-07", time: "19:30", gender: "female" });
  await submitAndWaitResult();
  await noOverflow();
  assert(battleLink, "배틀 링크");
  await cdp("Page.navigate", { url: "about:blank" });
  await cdp("Page.navigate", { url: battleLink });
  await waitFor(() => evaluate("document.readyState === 'complete' && !!window.__PALJA_DEV__"));
  await noOverflow();
  await click("#go");
  await fill({ date: "2001-01-01", unknown: true, gender: "male" });
  await submitAndWaitResult();
  assert(await evaluate("!!document.getElementById('battle-result')"), "배틀 결과");
  await noOverflow();
});
await shot("23-battle-result-320", "#battle-result");

console.log("\n[데스크톱 1280x900]");
await viewport("desktop");
await open("/");
await shot("17-landing-desktop");
await check("데스크톱 결과: 가로 넘침 없음, 중앙 정렬 카드", async () => {
  await click("#go");
  await fill({ date: "1984-03-08", time: "07:15", gender: "male" });
  await submitAndWaitResult();
  await noOverflow();
  await noDevTerms();
  const w = await evaluate("document.querySelector('main').getBoundingClientRect().width");
  assert(w <= 540, `본문 폭 ${w}`);
});
await shot("18-result-desktop");
await shot("19-premium-desktop", "#premium");

console.log("\n[debug 화면 (개발 빌드 전용)]");
await check("debug 화면: SajuData·기둥·Signals·Scores·provenance 표시", async () => {
  await cdp("Page.navigate", { url: BASE + "/debug.html" });
  await waitFor(() => evaluate("document.querySelectorAll('details').length > 5"));
  const t = await visibleText();
  for (const s of ["provenance", "Signals", "Scores", "Raw SajuData", "boundaryRisk", "confidence"]) assert(t.includes(s), s);
});
await shot("20-debug-desktop");
await check("production 빌드(dist)에는 debug 화면·개발 hook 이 없다", async () => {
  if (!existsSync("dist/index.html")) throw new Error("dist 없음 (npm run build 필요)");
  assert(!existsSync("dist/debug.html") && !existsSync("dist/assets/debug.js"), "debug 파일");
  const js = readFileSync("dist/assets/app.js", "utf8");
  assert(!js.includes("__PALJA_DEV__") && !js.includes("Raw SajuData"), "개발 hook");
  assert(!js.includes("개발 환경"), "production 화면에 '개발 환경' 문구 없음");
  const html = readFileSync("dist/index.html", "utf8");
  assert(!/id="devflag"/.test(html), "production HTML 에 개발 환경 배지 요소 없음");
});

await check("네트워크: 생년월일·출생시간·성별·전화번호·기둥이 어떤 요청에도 실리지 않음", async () => {
  const bad = ["1990-05-15", "19900515", "14:20", "1988-08-08", "08:08", "010-9876-5432", "01098765432", "9876-5432", "gender", "birthDate", "birthTime", "pillars", "rawInput", "female", "경오", "경진"];
  // 인터넷(http/https) 요청만 검사한다. sms: 는 서버로 가지 않고 휴대폰 문자 앱으로 넘겨지는 링크다.
  const web = netLog.filter((l) => /^\S+ https?:/.test(l));
  assert(web.length > 5, `검사한 인터넷 요청 수가 너무 적음: ${web.length}`); // 헛통과 방지
  const hits = web.filter((l) => bad.some((b) => l.includes(b)) && !l.startsWith("GET " + BASE));
  assert(netLog.some((l) => l.includes(" sms:")), "문자 앱 열기(sms:) 확인");
  assert(netLog.length > 0, "요청 기록");
  assert(hits.length === 0, hits.slice(0, 3).join(" | "));
});

// ── 마무리 ──────────────────────────────────────────────────
ws.close();
killTree(browser);
rmSync(PROFILE, { recursive: true, force: true, maxRetries: 5 });
server.close();
const failed = results.filter((r) => !r.ok);
writeFileSync("e2e-artifacts/e2e-result.json", JSON.stringify({ browser: version.Browser, results, shots, pageErrors }, null, 2));
console.log(`\nE2E: ${results.length - failed.length}/${results.length} 통과, 화면 캡처 ${shots.length}장 → ${SHOTS}/`);
process.exit(failed.length ? 1 : 0);
