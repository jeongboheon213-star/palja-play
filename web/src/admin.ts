// 운영자 통계 화면 (/admin.html). 서버(/api/admin/stats)가 집계한 숫자만 받아 그린다.
// 운영자 비밀번호는 이 탭의 sessionStorage 에만 둔다 (탭을 닫으면 사라짐). 사용자 글(의견)은 textContent 로만 넣는다.

// 서버 응답 모양 (서버 통계 모듈의 Dashboard 와 같은 모양. 브라우저 코드는 서버 코드를 import 하지 않는다)
interface Count { key: string; label: string; count: number }
interface Group { key: string; label: string; count: number; avgSimilarity: number | null }
interface Dashboard {
  generatedAt: string;
  period: { from: string; to: string; days: number; source: string };
  totals: { visitors: number; results: number; feedback: number; feedbackRate: number | null; avgSimilarity: number | null; shareSessions: number; shareRate: number | null; premiumInterestSessions: number };
  funnel: { key: string; label: string; sessions: number; ofTop: number | null; ofPrev: number | null }[];
  daily: { date: string; visitors: number; results: number; feedback: number; shares: number }[];
  landingVia: Count[];
  shareMethods: Count[];
  shareDevices: Count[];
  battleOutcomes: Count[];
  premium: { productId: string; label: string; clickSessions: number; interestSessions: number }[];
  feedback: {
    count: number; similarity: Count[]; shareIntent: Count[]; bestMatch: Count[]; worstMatch: Count[]; worstNone: number;
    byCharacter: Group[]; byTimeKnown: Group[]; byBoundary: Group[]; byVersion: Group[]; withComment: number;
  };
  comments: { date: string; similarity: number; character: string; shareIntent: string | null; comment: string }[];
  characters: Count[];
  notes: string[];
}

const TOKEN_KEY = "palja.admin.token";
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const state = { days: 30, source: "production" };

function getToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(t: string | null): void {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* 저장 불가: 이번 화면에서만 사용 */ }
}
let memToken: string | null = getToken();

type El = HTMLElement;
function h(tag: string, attrs: Record<string, string> = {}, ...kids: (El | string | null | false)[]): El {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const k of kids) if (k !== null && k !== false) e.append(k);
  return e;
}
const fmt = (n: number) => n.toLocaleString("ko-KR");
const pctText = (v: number | null) => (v === null ? "–" : `${v}%`);

async function api<T>(body: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  try {
    const r = await fetch("/api/admin/stats", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${memToken ?? ""}` }, body: JSON.stringify(body) });
    const data = (await r.json().catch(() => ({}))) as { message?: string };
    return r.ok ? { ok: true, data: data as T } : { ok: false, status: r.status, message: data.message ?? `오류 (${r.status})` };
  } catch {
    return { ok: false, status: 0, message: "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요." };
  }
}

// ── 그리기 도우미 ───────────────────────────────────────────────

function bars(rows: readonly Count[], tone = "", total?: number): El {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const sum = total ?? rows.reduce((a, r) => a + r.count, 0);
  if (!rows.length || rows.every((r) => r.count === 0)) return h("p", { class: "mute small" }, "아직 데이터가 없어요.");
  return h(
    "div",
    { class: "bars" },
    ...rows.map((r) => {
      const fill = h("div", { class: "f" });
      fill.style.width = `${(r.count / max) * 100}%`;
      const share = sum > 0 ? ` (${Math.round((r.count / sum) * 1000) / 10}%)` : "";
      return h("div", { class: `bar ${tone}` }, h("span", { class: "k", title: r.label }, r.label), h("div", { class: "t" }, fill), h("span", { class: "n" }, `${fmt(r.count)}${share}`));
    }),
  );
}

function groupTable(rows: readonly Group[], first: string): El {
  if (!rows.length) return h("p", { class: "mute small" }, "아직 데이터가 없어요.");
  return h(
    "div",
    { class: "scroll" },
    h(
      "table",
      {},
      h("thead", {}, h("tr", {}, h("th", {}, first), h("th", { class: "num" }, "피드백"), h("th", { class: "num" }, "평균 공감(5점)"))),
      h("tbody", {}, ...rows.map((g) => h("tr", {}, h("td", {}, g.label), h("td", { class: "num" }, fmt(g.count)), h("td", { class: "num" }, g.avgSimilarity === null ? "–" : g.avgSimilarity.toFixed(2))))),
    ),
  );
}

function card(title: string, hint: string, ...body: El[]): El {
  return h("div", { class: "card" }, h("h2", {}, title), h("p", { class: "hint" }, hint), ...body);
}

function kpi(label: string, value: string, unit = "", sub = ""): El {
  return h("div", { class: "card kpi" }, h("div", { class: "l" }, label), h("div", { class: "v" }, value, unit ? h("small", {}, ` ${unit}`) : null), sub ? h("div", { class: "l small" }, sub) : null);
}

function dailyChart(rows: Dashboard["daily"]): El {
  const W = 720, H = 200, P = 26;
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  const n = Math.max(1, rows.length);
  const bw = (W - P * 2) / n;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H + 24}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "날짜별 방문자·결과·피드백");
  const add = (tag: string, a: Record<string, string | number>, text?: string) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
    if (text) e.textContent = text;
    svg.append(e);
    return e;
  };
  add("line", { x1: P, y1: H, x2: W - P, y2: H, stroke: "#3a3e72" });
  add("text", { x: 2, y: 12, fill: "#A9A8C9", "font-size": 11 }, fmt(max));
  rows.forEach((r, i) => {
    const x = P + i * bw;
    const hv = (r.visitors / max) * (H - 20);
    const hr = (r.results / max) * (H - 20);
    const w = Math.max(1, bw * 0.8);
    const tip = `${r.date} · 방문 ${r.visitors} · 결과 ${r.results} · 피드백 ${r.feedback} · 공유 ${r.shares}`;
    add("rect", { x, y: H - hv, width: w, height: hv, fill: "#3a3e72", rx: 2 }).append(Object.assign(document.createElementNS(NS, "title"), { textContent: tip }));
    add("rect", { x: x + w * 0.2, y: H - hr, width: w * 0.6, height: hr, fill: "#FFB347", rx: 2 }).append(Object.assign(document.createElementNS(NS, "title"), { textContent: tip }));
    if (r.feedback > 0) add("circle", { cx: x + w / 2, cy: H - hr - 6, r: 3, fill: "#4ED1B0" }).append(Object.assign(document.createElementNS(NS, "title"), { textContent: tip }));
    const every = Math.ceil(n / 8);
    if (i % every === 0 || i === n - 1) add("text", { x: x + w / 2, y: H + 16, fill: "#A9A8C9", "font-size": 11, "text-anchor": "middle" }, r.date.slice(5));
  });
  const legend = h("div", { class: "legend" });
  for (const [c, t] of [["#3a3e72", "방문자"], ["#FFB347", "결과 본 수"], ["#4ED1B0", "피드백 있는 날"]] as const) {
    const i = h("i");
    i.style.background = c;
    legend.append(h("span", {}, i, t));
  }
  const wrap = h("div", { class: "chart" });
  wrap.append(svg, legend);
  return wrap;
}

function summary(d: Dashboard): El {
  const t = d.totals;
  const items: string[] = [];
  items.push(`이 기간에 ${fmt(t.visitors)}명이 들어와 ${fmt(t.results)}번 결과를 봤어요.`);
  const top = d.funnel[0]?.sessions ?? 0;
  const res = d.funnel.find((f) => f.key === "result_view")?.sessions ?? 0;
  if (top > 0) items.push(`첫 화면에 온 사람 중 ${pctText(Math.round((res / top) * 1000) / 10)}가 결과까지 봤어요.`);
  if (t.avgSimilarity !== null) items.push(`"나와 얼마나 비슷한가" 평균은 5점 중 ${t.avgSimilarity.toFixed(2)}점이에요.`);
  const worst = [...d.feedback.worstMatch].sort((a, b) => b.count - a.count)[0];
  if (worst && worst.count > 0) items.push(`가장 안 맞는다고 한 영역은 "${worst.label}"(${fmt(worst.count)}번)이에요.`);
  const best = [...d.feedback.bestMatch].sort((a, b) => b.count - a.count)[0];
  if (best && best.count > 0) items.push(`가장 잘 맞는다고 한 영역은 "${best.label}"(${fmt(best.count)}번)이에요.`);
  const interest = [...d.premium].sort((a, b) => b.interestSessions + b.clickSessions - (a.interestSessions + a.clickSessions))[0];
  if (interest && interest.clickSessions > 0) items.push(`유료 리포트 중 가장 관심이 많은 것: ${interest.label} (열어본 사람 ${fmt(interest.clickSessions)}명).`);
  return card("한눈에 요약", "숫자를 문장으로 풀어 쓴 요약이에요.", h("ul", { class: "sum" }, ...items.map((s) => h("li", {}, s))), ...d.notes.map((n) => h("div", { class: "note" }, n)));
}

function render(d: Dashboard): void {
  const out = $("out");
  out.replaceChildren();
  const t = d.totals;
  const fb = d.feedback;
  const from = new Date(d.period.from).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
  const to = new Date(d.period.to).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
  out.append(h("p", { class: "mute small" }, `${from} ~ ${to} (한국 시간) · 대상: ${d.period.source === "production" ? "실제 사용자" : d.period.source === "development" ? "개발·테스트" : "전체"}`));

  out.append(
    h("section", {}, h("div", { class: "grid kpis" },
      kpi("방문자", fmt(t.visitors), "명", "다른 기기·브라우저는 다른 사람으로 셈"),
      kpi("결과 본 수", fmt(t.results), "번"),
      kpi("피드백", fmt(t.feedback), "건", `결과 본 사람 중 ${pctText(t.feedbackRate)}`),
      kpi("평균 공감도", t.avgSimilarity === null ? "–" : t.avgSimilarity.toFixed(2), "/ 5", "나와 얼마나 비슷했나"),
      kpi("배틀 공유", fmt(t.shareSessions), "명", `결과 본 사람 중 ${pctText(t.shareRate)}`),
      kpi("유료 리포트 관심", fmt(t.premiumInterestSessions), "명", "'관심 있어요'를 누른 사람"),
    )),
  );
  out.append(h("section", {}, summary(d)));

  const funnelRows: Count[] = d.funnel.map((f) => ({ key: f.key, label: `${f.label}${f.ofPrev === null ? "" : ` · 앞 단계의 ${pctText(f.ofPrev)}`}`, count: f.sessions }));
  out.append(
    h("section", { class: "grid two" },
      card("방문 → 결과 흐름", "각 단계까지 온 사람 수예요. 갑자기 크게 줄어드는 단계가 개선할 곳이에요. (공유·피드백은 결과 본 사람 대비)", bars(funnelRows, "", d.funnel[0]?.sessions ?? 0)),
      card("날짜별 추이", "막대에 손가락이나 마우스를 올리면 그날 숫자가 보여요.", dailyChart(d.daily)),
    ),
  );

  out.append(
    h("section", { class: "grid two" },
      card("나와 얼마나 비슷했나 (공감도)", `피드백 ${fmt(fb.count)}건의 점수 분포예요. 4~5점이 많을수록 해석이 잘 맞는다는 뜻이에요.`, bars(fb.similarity)),
      card("친구에게 공유할 생각", "피드백에서 '공유하고 싶다'고 답한 비율이에요.", bars(fb.shareIntent, "j")),
      card("잘 맞은 영역", "여러 개 고를 수 있어서 합계가 피드백 수보다 클 수 있어요.", bars(fb.bestMatch, "j", fb.count)),
      card("안 맞은 영역", `해석 문구를 먼저 손볼 곳이에요. '안 맞는 곳 없음'은 ${fmt(fb.worstNone)}건이에요.`, bars(fb.worstMatch, "r", fb.count)),
    ),
  );

  out.append(
    h("section", { class: "grid two" },
      card("캐릭터별 공감도", "어떤 캐릭터의 해석이 잘 맞고 덜 맞는지 비교해요. 피드백이 적은 캐릭터는 참고만 하세요.", groupTable(fb.byCharacter, "캐릭터")),
      card("나온 캐릭터 분포", "결과 화면에 나온 캐릭터 횟수예요.", bars(d.characters)),
    ),
  );

  out.append(
    h("section", { class: "grid two" },
      card("출생시간 입력 여부", "출생시간을 모를 때 공감도가 크게 낮다면 안내 문구를 보완할 곳이에요.", groupTable(fb.byTimeKnown, "구분")),
      card("절기 경계 안내", "생일이 절기 경계 근처라 안내를 받은 사람의 공감도예요.", groupTable(fb.byBoundary, "구분")),
    ),
  );

  out.append(
    h("section", { class: "grid two" },
      card("어디서 들어왔나", "'배틀 링크'가 많을수록 친구 초대가 잘 퍼지고 있다는 뜻이에요.", bars(d.landingVia, "j")),
      card("배틀 공유 방법", "어떤 버튼으로 링크를 보냈는지예요. '실패'가 많으면 그 방법을 점검해야 해요.", bars(d.shareMethods)),
      card("공유한 기기", "휴대폰과 PC 중 어디서 공유했는지예요.", bars(d.shareDevices, "j")),
      card("배틀 결과", "배틀 링크로 들어온 친구가 결과를 봤을 때의 승패예요.", bars(d.battleOutcomes)),
    ),
  );

  out.append(
    h("section", {},
      card(
        "유료 리포트 관심도",
        "결제 전 단계의 관심이에요 (실제 결제 수가 아니에요). 사람 수 기준이에요.",
        h("div", { class: "scroll" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", {}, "리포트"), h("th", { class: "num" }, "열어본 사람"), h("th", { class: "num" }, "관심 있어요"))),
          h("tbody", {}, ...d.premium.map((p) => h("tr", {}, h("td", {}, p.label), h("td", { class: "num" }, fmt(p.clickSessions)), h("td", { class: "num" }, fmt(p.interestSessions))))),
        )),
      ),
    ),
  );

  // 의견
  const list = h("div", {});
  const search = h("input", { type: "search", placeholder: "의견 검색 (예: 연애, 틀려요)", "aria-label": "의견 검색" }) as HTMLInputElement;
  const draw = () => {
    const q = search.value.trim();
    const rows = d.comments.filter((c) => !q || c.comment.includes(q) || c.character.includes(q));
    list.replaceChildren(
      ...(rows.length
        ? rows.map((c) => {
            const p = h("p");
            p.textContent = c.comment;
            return h("div", { class: "comment" }, h("span", { class: "pill" }, c.date), h("span", { class: "pill" }, `공감 ${c.similarity}/5`), h("span", { class: "pill" }, c.character), c.shareIntent ? h("span", { class: "pill" }, { yes: "공유할래요", maybe: "고민 중", no: "공유 안 함" }[c.shareIntent] ?? c.shareIntent) : null, p);
          })
        : [h("p", { class: "mute small" }, q ? "검색 결과가 없어요." : "아직 남긴 의견이 없어요.")]),
    );
  };
  search.addEventListener("input", draw);
  draw();
  out.append(h("section", {}, card(`사용자 의견 (${fmt(fb.withComment)}건, 최신순 최대 200건)`, "사용자가 직접 쓴 글이에요. 개인정보가 적혀 있으면 외부에 공유하지 마세요.", search, h("div", { style: "margin-top:10px" }, list))));

  out.append(h("section", {}, card("해석 버전별 공감도", "문구나 점수 규칙을 바꾼 뒤 공감도가 올랐는지 비교할 때 봐요.", groupTable(fb.byVersion, "해석 / 점수 버전"))));
  out.append(h("p", { class: "mute small" }, `집계 시각 ${new Date(d.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 이 화면에는 생년월일·출생시간·성별·이름·전화번호가 없어요 (저장하지 않음).`));
}

// ── 흐름 ───────────────────────────────────────────────────────

function showLogin(message = ""): void {
  $("app").hidden = true;
  $("logout").hidden = true;
  $("login").hidden = false;
  $("login-err").textContent = message;
}

async function load(): Promise<void> {
  const btn = $<HTMLButtonElement>("reload");
  btn.disabled = true;
  btn.textContent = "불러오는 중…";
  $("err").textContent = "";
  const r = await api<Dashboard>({ days: state.days, source: state.source });
  btn.disabled = false;
  btn.textContent = "새로고침";
  if (!r.ok) {
    if (r.status === 401 || (r.status === 503 && /운영자/.test(r.message))) {
      memToken = null;
      setToken(null);
      return showLogin(r.message);
    }
    $("err").textContent = r.message;
    return;
  }
  $("login").hidden = true;
  $("app").hidden = false;
  $("logout").hidden = false;
  render(r.data);
}

function segment(id: string, key: "days" | "source"): void {
  $(id).addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    for (const x of $(id).querySelectorAll("button")) x.classList.toggle("on", x === b);
    state[key] = (key === "days" ? Number(b.dataset.v) : b.dataset.v) as never;
    void load();
  });
}

$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $<HTMLInputElement>("token").value.trim();
  if (!v) return void ($("login-err").textContent = "비밀번호를 입력해 주세요.");
  memToken = v;
  setToken(v);
  $<HTMLInputElement>("token").value = "";
  void load();
});
$("logout").addEventListener("click", () => {
  memToken = null;
  setToken(null);
  $("out").replaceChildren();
  showLogin("잠갔어요.");
});
$("reload").addEventListener("click", () => void load());
$("csv").addEventListener("click", async () => {
  const r = await api<{ csv: string; count: number }>({ days: state.days, source: state.source, csv: true });
  if (!r.ok) return void ($("err").textContent = r.message);
  const blob = new Blob(["﻿", r.data.csv], { type: "text/csv;charset=utf-8" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `palja-feedback-${state.source}-${state.days}d.csv` }) as HTMLAnchorElement;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});
segment("days", "days");
segment("source", "source");

if (memToken) void load();
else showLogin();
