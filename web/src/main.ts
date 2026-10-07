// 사주팔자PLAY Beta 화면. 계산은 전부 엔진(computeBetaResult)이 하고, 여기서는 보여주기만 한다.
// 화면에 쓰는 사주 결과는 전부 엔진 결과다 (가짜 데이터 없음). 사주 계산에 난수를 쓰지 않는다 (UUID 는 레코드 구분용, runtime.ts 참고).

import { computeBetaResult, type BetaResult } from "../../src/lib/engine";
import { tiersForScores, type TierResult } from "../../src/lib/tier";
import { resultCardModel, isResultCardVisit } from "../../src/lib/share/resultCard";
import { openResultCard } from "./resultCard";
import { validateSajuInput } from "../../src/lib/validation";
import { toResultView, RESULT_ERROR_TEXT, type ResultView, type PremiumCardView } from "../../src/lib/ui/resultView";
import { deriveSignals } from "../../src/lib/interpretation";
import { PREMIUM_SPECS } from "../../src/lib/engine";
import { PAYMENTS_ENABLED, PAYMENTS_MODE, startCheckout, handlePaymentReturn, fetchReport, cancelUnopenedPurchase, findStoredPurchase, rememberRestoredPurchase, type PremiumReport, type StoredPurchase } from "./payments";
import { battleCardFrom, characterById, compareBattle, sanitizeNickname, withJosa, normalizeKoreanMobile, buildSmsUri, NICKNAME_MAX, type BattleCard } from "../../src/lib/battle/battle";
import { battleFromLocation, createBattleShare, type BattleShare } from "../../src/lib/battle/share";
import { copyText, hasWebShare, isMobileDevice, qrSvg, shareKakao, KAKAO_ENABLED } from "./shareTools";
import { buildFeedbackRecord, FEEDBACK_AREAS, FEEDBACK_AREA_LABELS, type FeedbackArea, type FeedbackDraft, type ShareIntent } from "../../src/lib/feedback/feedback";
import type { EventName } from "../../src/lib/analytics/events";
import type { OverlapChoice } from "../../src/lib/saju/providers";
import { APP_CONFIG } from "./config";
import { createRuntime, randomId, nowIso, todayKst } from "./runtime";

const rt = createRuntime();
const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;

type Child = Node | string | null | undefined | false;
type Children = Child | readonly Children[];
function h(tag: string, attrs: Record<string, string | boolean | ((e: Event) => void)> = {}, ...children: Children[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v as EventListener);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const c of (children as unknown[]).flat(Infinity) as Child[]) if (c !== null && c !== undefined && c !== false) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}

// ── 화면 전환 ──────────────────────────────────────────────
const SCREENS = ["s-landing", "s-input", "s-loading", "s-result", "s-report"] as const;
type Screen = (typeof SCREENS)[number];
function show(id: Screen): void {
  for (const s of SCREENS) document.getElementById(s)!.classList.toggle("on", s === id);
  window.scrollTo(0, 0);
}

let toastTimer = 0;
function toast(text: string): void {
  const t = $("#toast");
  t.textContent = text;
  t.style.display = "block";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.style.display = "none"), 2400);
}

// ── 상태 ──────────────────────────────────────────────────
interface Current {
  readonly resultId: string;
  readonly result: Extract<BetaResult, { ok: true }>;
  readonly view: ResultView;
}
let current: Current | null = null;
let gender: "male" | "female" | null = null;
let inputStarted = false;

// ── 랜딩 ──────────────────────────────────────────────────
// 개발 빌드에서만 "개발 환경" 표시 (production 빌드에는 이 코드도, 표시 요소도 없다)
declare const __PALJA_ENV__: "development" | "production";
if (__PALJA_ENV__ === "development") {
  const flag = h("span", { class: "devflag", id: "devflag" }, "개발 환경");
  document.querySelector(".top .in")?.appendChild(flag);
}

// 배틀 링크(?b=… 새 형식 / #b=… 예전 형식)로 들어왔는가. 잘못된 링크면 배틀 없이 평소처럼 진행한다.
const battleLink = battleFromLocation(location.search, location.hash);
const challenger: BattleCard | null = battleLink.kind === "valid" ? battleLink.card : null;
rt.track("landing_view", { via: battleLink.kind === "valid" ? (battleLink.legacy ? "battle-legacy" : "battle") : battleLink.kind === "invalid" ? "battle-invalid" : isResultCardVisit(location.search) ? "result_card" : "direct" });
if (challenger) renderBattleInvite(challenger);
else if (battleLink.kind === "invalid") window.setTimeout(() => toast("배틀 링크가 올바르지 않아요. 내 팔자부터 확인해 보세요!"), 300);
// 이미 열린 탭에서 예전 형식(#b=) 링크로 이동하면 페이지가 다시 시작되지 않는다 → 새로 시작.
// 새 형식(?b=)은 주소의 query 가 바뀌므로 브라우저가 항상 페이지를 새로 연다.
window.addEventListener("hashchange", () => {
  if (/^#b=/.test(location.hash)) location.reload();
});
window.addEventListener("popstate", () => {
  if (new URLSearchParams(location.search).has("b")) location.reload();
});

function renderBattleInvite(c: BattleCard): void {
  const ch = characterById(c.characterId)!;
  const who = c.nickname ? `${c.nickname}님` : "친구";
  const box = h(
    "div",
    { class: "invite", id: "battle-invite" },
    h("p", { class: "invite-tag" }, `⚔️ ${who}의 배틀 신청이 도착했어요`),
    h("div", { class: "invite-row" }, h("span", { class: "em", "aria-hidden": "true" }, ch.emoji), h("div", {}, h("b", {}, `도전자 캐릭터: ${ch.name}`), h("p", { class: "mute small", style: "margin:2px 0 0" }, "능력치는 대결에서 공개돼요. 내 팔자로 이겨 보세요!"))),
  );
  const landing = $("#s-landing");
  landing.insertBefore(box, landing.firstChild);
  $("#go").textContent = "내 팔자로 도전하기";
}
$("#go").addEventListener("click", () => {
  show("s-input");
  ($("#dt") as HTMLInputElement).focus({ preventScroll: true });
});
$("#home").addEventListener("click", () => show("s-landing"));

// ── 입력 ──────────────────────────────────────────────────
const dt = $<HTMLInputElement>("#dt");
const tm = $<HTMLInputElement>("#tm");
const unk = $<HTMLInputElement>("#unk");
dt.max = todayKst();

function markInputStart(): void {
  if (inputStarted) return;
  inputStarted = true;
  rt.track("input_start");
}
for (const el of [dt, tm, unk]) {
  el.addEventListener("focus", markInputStart);
  el.addEventListener("change", markInputStart);
}
unk.addEventListener("change", () => {
  tm.disabled = unk.checked;
  if (unk.checked) tm.value = "";
});
for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>("#sex button"))) {
  b.addEventListener("click", () => {
    markInputStart();
    gender = b.dataset.v as "male" | "female";
    for (const x of Array.from(document.querySelectorAll<HTMLButtonElement>("#sex button"))) {
      x.classList.toggle("on", x === b);
      x.setAttribute("aria-checked", String(x === b));
    }
  });
}

function setError(msg: string): void {
  $("#err").textContent = msg;
}

$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  run();
});

function run(overlapChoice?: OverlapChoice): void {
  setError("");
  $("#overlap").hidden = true;
  const raw = {
    birthDate: dt.value,
    birthTime: unk.checked ? null : tm.value === "" ? undefined : tm.value,
    gender,
    calendar: "solar",
    birthCountry: "KR",
  };
  const v = validateSajuInput(raw, { todayKst: todayKst() });
  if (!v.ok) {
    setError(v.errors.map((x) => x.message).filter((m, i, a) => a.indexOf(m) === i).join(" "));
    return;
  }
  const r = computeBetaResult(v.value, overlapChoice ? { overlapChoice } : {});
  if (!r.ok) {
    setError(RESULT_ERROR_TEXT[r.code] ?? "계산할 수 없는 입력이에요. 다시 확인해 주세요.");
    if (r.code === "AMBIGUOUS_LOCAL_TIME") showOverlapChoice();
    return;
  }
  const resultId = randomId();
  current = { resultId, result: r, view: toResultView(r.free, r.premium) };
  rt.track(
    "calculation_complete",
    { timeKnown: v.value.birthTime !== null, boundaryNotice: r.free.boundaryRisk, ...r.free.versions },
    resultId,
  );
  playLoading(() => {
    renderResult(current!);
    show("s-result");
    const battleOutcome = challenger ? compareBattle(battleCardFrom(r.free, null), challenger).outcome : null;
    rt.track("result_view", { characterId: r.free.character.id, battleOutcome }, resultId);
  });
}

function showOverlapChoice(): void {
  const box = $("#overlap");
  box.replaceChildren(
    h("button", { type: "button", class: "btn ghost", onclick: () => run("earlier") }, "서머타임 시각이었어요 (먼저)"),
    h("button", { type: "button", class: "btn ghost", onclick: () => run("later") }, "표준시 시각이었어요 (나중)"),
  );
  box.hidden = false;
}

// ── 계산 애니메이션 (계산은 이미 끝났고, 단계 문구만 보여준다) ─────
function playLoading(done: () => void): void {
  show("s-loading");
  const items = Array.from(document.querySelectorAll<HTMLLIElement>("#steps li"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = reduce ? 150 : 520;
  items.forEach((li) => li.classList.remove("now", "done"));
  items.forEach((li, i) => {
    window.setTimeout(() => {
      items[i - 1]?.classList.replace("now", "done");
      li.classList.add("now");
    }, i * step);
  });
  window.setTimeout(() => {
    items.forEach((li) => li.classList.replace("now", "done"));
    window.setTimeout(done, reduce ? 50 : 260);
  }, items.length * step);
}

// ── 결과 ──────────────────────────────────────────────────
function list(cls: string, items: readonly string[]): HTMLElement {
  return h("ul", { class: `list ${cls}` }, items.map((t) => h("li", {}, t)));
}

function renderResult(c: Current): void {
  const v = c.view;
  const tiers = tiersForScores(battleCardFrom(c.result.free, null).scores);
  const root = $("#s-result");
  root.replaceChildren(h("div", { class: "result" },
    h("p", { style: "margin-top:6px;text-align:center" }, "🎉 당신의 팔자 캐릭터가 완성됐어요"),
    h(
      "div",
      { class: "card", id: "char-card" },
      h("div", { class: "em", "aria-hidden": "true" }, v.character.emoji),
      h("h2", {}, v.character.name),
      h("p", { class: "tl" }, v.character.tagline),
      h("span", { class: "el" }, v.character.elementLabel),
    ),
    challenger ? renderBattleResult(c, challenger) : null,
    h("section", { class: "box", id: "palja-tier", "aria-label": "내 팔자 티어" },
      h("h2", {}, "🏆 내 팔자 티어"),
      h("p", { class: "d", style: "font-size:30px" }, `${tiers.total.tier} TIER`),
      h("p", {}, tiers.total.label),
      h("p", {}, `TOP 능력치 · ${v.stats.find((s) => s.key === tiers.topStat.stat)!.label} ${tiers.topStat.tier}`),
      h("p", { class: "mute small" }, tiers.topStat.label),
      h("p", { class: "mute small" }, "PLAY 계산 엔진의 고정 표본과 비교한 재미용 지표예요. 실제 인구통계가 아니며, 같은 점수는 같은 등급이에요.")),
    h("button", { class: "btn ghost", id: "result-share-open", type: "button", onclick: () => openResultCard(resultCardModel(tiers, v.character), (action, method) => rt.track("share_click", { mode: "result_card", action, method: method ?? "none" }, c.resultId)) }, "내 팔자 카드 공유하기"),
    h("p", { class: "hint" }, "나와 얼마나 비슷한지 내려가면서 확인해보세요 👇"),
    v.notices.map((n) => h("div", { class: "notice" }, n)),

    h("h2", {}, "당신은 이런 사람이에요"),
    h("div", { class: "box" }, list("trait", v.coreTraits)),

    h("h2", { id: "stats-title" }, "능력치"),
    h(
      "div",
      { class: "box", id: "stats" },
      v.stats.map((s, i) =>
        h(
          "div",
          { class: "stat", "aria-label": `${s.label} ${s.value}점` },
          h("span", { class: "nm" }, s.label),
          h("div", { class: "blocks", "aria-hidden": "true" }, Array.from({ length: 10 }, (_, k) => h("i", { "data-f": String(k < s.filled), class: i % 2 ? "j" : "" }))),
          h("b", { class: "v" }, String(s.value)),
        ),
      ),
    ),
    v.statsNotes.map((n) => h("p", { class: "mute small", style: "margin-top:8px" }, n)),

    h("h2", {}, "강점"),
    h("div", { class: "box" }, list("good", v.strengths)),
    h("h2", {}, "주의하면 좋은 점"),
    h("div", { class: "box" }, list("warn", v.cautions)),

    h("h2", {}, "오행 밸런스"),
    h(
      "div",
      { class: "els" },
      v.elements.map((e) => h("div", { class: e.tone }, h("b", {}, `${e.element}`), h("span", {}, `${e.hanja} · ${e.count}`))),
    ),
    v.elementSummary.map((t) => h("p", { style: "margin-top:10px" }, t)),
    v.elementNote ? h("p", { class: "mute small" }, v.elementNote) : null,
    h("details", {}, h("summary", {}, "왜 이렇게 나왔나요? · 성향과 오행"),
      v.evidence.filter((e) => e.domain === "personality").map((e) => h("div", { class: "small mute" }, e.facts.map((f) => h("p", {}, f))))),
    h(
      "details",
      {},
      h("summary", {}, "내 사주 여덟 글자 보기"),
      h("div", { class: "pil" }, v.pillars.map((p) => h("div", {}, h("b", {}, p.main), h("i", {}, p.sub), h("span", {}, p.label)))),
    ),

    v.sections.map((s) => [
      h("h2", {}, s.title),
      h("div", { class: "blk" },
        h("p", {}, h("strong", {}, s.summary)),
        s.paragraphs.map((p) => h("p", {}, p)),
        s.productLabel ? h("p", { class: "small mute" }, s.productLabel) : null,
        h("details", {},
          h("summary", {}, "왜 이렇게 나왔나요?"),
          v.evidence.filter((e) => e.domain === s.domain).map((e) =>
            h("div", { class: "small mute" }, e.facts.map((f) => h("p", {}, f)))),
        ),
      ),
    ]),

    v.reversals.length
      ? [
          h("h2", {}, "그런데… 반전 포인트"),
          h("p", { class: "mute" }, "내 사주 안에 서로 반대 방향의 특징이 같이 들어 있어요."),
          v.reversals.map((r) => h("div", { class: "rev" }, h("h3", {}, r.title), h("p", {}, r.text))),
        ]
      : null,

    h("h2", {}, "인생 키워드"),
    h("div", {}, v.keywords.map((k) => h("span", { class: "pill" }, `#${k}`))),

    renderPremium(c),
    renderFeedback(c),
    renderBattle(c),

    h("p", { class: "note" }, v.disclaimer),
    h("button", { class: "btn ghost", type: "button", id: "again", onclick: () => show("s-input") }, "다시 해보기"),
  ));
  // 능력치 막대 채우기 애니메이션
  window.setTimeout(() => {
    for (const i of Array.from(root.querySelectorAll<HTMLElement>(".blocks i"))) if (i.dataset.f === "true") i.classList.add("f");
  }, 120);
}

// ── Premium ───────────────────────────────────────────────
let sheetProduct: PremiumCardView | null = null;

/** 상품 영역의 Signal id (결제·리포트 요청에 쓰는 값. 생년월일이 아니다) */
function productSignalIds(c: Current, productId: string): string[] {
  const domains = PREMIUM_SPECS.find((s) => s.id === productId)?.domains ?? [];
  return (deriveSignals(c.result.saju)?.signals ?? []).filter((s) => (domains as readonly string[]).includes(s.domain)).map((s) => s.id);
}

/** 정식 리포트에 들어가는 내용 (판매 전 안내) */
const REPORT_INCLUDES = [
  "나의 패턴 한눈에 보기",
  "WHY: 근거별 '왜 이런 패턴인가' 기본 + 심화 설명",
  "HOW: 근거별 바로 해 볼 실천 3가지",
  "반전 포인트 심층 (해당될 때)",
  "나만의 실천 체크리스트 5개",
];

function renderPremium(c: Current): HTMLElement {
  return h(
    "section",
    { id: "premium", "aria-label": "프리미엄 리포트" },
    h(
      "div",
      { class: "prem-intro" },
      h("p", { class: "mute", style: "margin:0" }, "여기까지가 무료 팔자풀이"),
      h("p", { class: "d", style: "margin:8px 0 0" }, "그런데 진짜 궁금한 건\n“그래서 왜 나는 이럴까?” 아닐까요?".split("\n").flatMap((t, i) => (i ? [h("br"), t] : [t]))),
    ),
    c.view.premium.map((p) =>
      h(
        "div",
        { class: "prod", "data-product": p.productId },
        h(
          "div",
          { class: "hd" },
          h("div", {}, h("div", { class: "nm" }, `${p.emoji} ${p.name}`), h("div", { class: "hook" }, p.hook)),
          h("div", { class: "price" }, h("b", {}, p.priceLabel), h("span", {}, p.priceNote)),
        ),
        p.whyTeaser ? h("div", { class: "teaser" }, h("small", {}, "WHY 미리보기 · 왜 이런 패턴일까"), p.whyTeaser) : null,
        p.howTeaser
          ? h(
              "div",
              { class: "locked" },
              h("div", { class: "bl", "aria-hidden": "true" }, p.howTeaser),
              h("div", { class: "ov" }, `🔒 활용법(HOW)${p.lockedCount > 0 ? ` + 추가 풀이 ${p.lockedCount}개` : ""}`),
            )
          : null,
        h("p", { class: "when" }, `⏳ ${p.whenText}`),
        h(
          "button",
          {
            class: "btn",
            type: "button",
            onclick: () => {
              if (p.clickEvent) rt.track(p.clickEvent as EventName, { productId: p.productId }, c.resultId);
              openSheet(p);
            },
          },
          `리포트 열어보기 · ${p.priceLabel}`,
        ),
      ),
    ),
    h(
      "p",
      { class: "mute small", style: "margin-top:10px" },
      PAYMENTS_ENABLED
        ? PAYMENTS_MODE === "test"
          ? "지금은 테스트 결제 환경이에요. 실제 돈이 나가지 않아요."
          : "결제는 토스페이먼츠로 안전하게 처리돼요."
        : "가격은 Beta 테스트 가격이에요. 지금은 결제가 일어나지 않아요.",
    ),
  );
}

function openSheet(p: PremiumCardView): void {
  sheetProduct = p;
  $("#sheet-title").textContent = p.name;
  $("#sheet-err").textContent = "";
  $("#sheet-preparing").hidden = PAYMENTS_ENABLED;
  $("#sheet-pay").hidden = !PAYMENTS_ENABLED;
  const focusEl = PAYMENTS_ENABLED ? $<HTMLButtonElement>("#sheet-buy") : $<HTMLButtonElement>("#sheet-interest");
  if (PAYMENTS_ENABLED && current) {
    $("#sheet-pay-mode").textContent = PAYMENTS_MODE === "test" ? "🧪 테스트 결제 환경 — 실제 돈이 나가지 않아요." : "결제는 토스페이먼츠로 처리돼요.";
    $("#sheet-includes").replaceChildren(...REPORT_INCLUDES.map((t) => h("li", {}, t)));
    const buy = $<HTMLButtonElement>("#sheet-buy");
    buy.disabled = false;
    buy.textContent = `${PAYMENTS_MODE === "test" ? "테스트 결제하기" : "결제하기"} · ${p.priceLabel}`;
    $("#sheet-owned").hidden = !findStoredPurchase(p.productId, productSignalIds(current, p.productId));
    $("#sheet-cancel").hidden = $("#sheet-owned").hidden;
    ($("#sheet-code") as HTMLInputElement).value = "";
  } else {
    const btn = $<HTMLButtonElement>("#sheet-interest");
    btn.disabled = false;
    btn.textContent = "이 리포트가 나오면 보고 싶어요";
  }
  const s = $("#sheet");
  s.hidden = false;
  $("#sheet-bg").classList.add("on");
  requestAnimationFrame(() => s.classList.add("on"));
  focusEl.focus({ preventScroll: true });
}
function closeSheet(): void {
  const s = $("#sheet");
  s.classList.remove("on");
  $("#sheet-bg").classList.remove("on");
  window.setTimeout(() => (s.hidden = true), 250);
}
$("#sheet-close").addEventListener("click", closeSheet);
$("#sheet-bg").addEventListener("click", closeSheet);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#sheet").hidden) closeSheet();
});
$("#sheet-interest").addEventListener("click", () => {
  if (sheetProduct?.interestEvent && current) rt.track(sheetProduct.interestEvent as EventName, {}, current.resultId);
  const btn = $<HTMLButtonElement>("#sheet-interest");
  btn.disabled = true;
  btn.textContent = "관심을 남겼어요 🙌";
  toast("관심이 기록됐어요. 정식 리포트를 만드는 데 반영할게요.");
  window.setTimeout(closeSheet, 900);
});
$("#sheet-buy").addEventListener("click", async () => {
  if (!sheetProduct || !current) return;
  const buy = $<HTMLButtonElement>("#sheet-buy");
  buy.disabled = true;
  buy.textContent = "결제창을 여는 중…";
  if (sheetProduct.interestEvent) rt.track(sheetProduct.interestEvent as EventName, { stage: "checkout" }, current.resultId);
  const r = await startCheckout({
    productId: sheetProduct.productId,
    resultId: current.resultId,
    signalIds: productSignalIds(current, sheetProduct.productId),
    characterName: current.view.character.name,
  });
  if (!r.ok) {
    $("#sheet-err").textContent = r.message;
    buy.disabled = false;
    buy.textContent = `다시 시도하기 · ${sheetProduct.priceLabel}`;
  }
});
$("#sheet-owned").addEventListener("click", async () => {
  if (!sheetProduct || !current) return;
  const owned = findStoredPurchase(sheetProduct.productId, productSignalIds(current, sheetProduct.productId));
  if (!owned) {
    $("#sheet-err").textContent = "이 기기에 유효한 구매 기록이 없어요. 취소한 구매는 열 수 없으며, 다른 구매는 구매 코드로 확인해 주세요.";
    $("#sheet-owned").hidden = true;
    $("#sheet-cancel").hidden = true;
    return;
  }
  const r = await fetchReport(owned.purchaseCode, owned.productId, owned.signalIds);
  if (!r.ok) {
    $("#sheet-err").textContent = r.message;
    return;
  }
  closeSheet();
  renderReport(r.report, owned);
});
$("#sheet-restore").addEventListener("click", async () => {
  if (!sheetProduct || !current) return;
  const code = ($("#sheet-code") as HTMLInputElement).value.trim();
  const signalIds = productSignalIds(current, sheetProduct.productId);
  const r = await fetchReport(code, sheetProduct.productId, signalIds);
  if (!r.ok) {
    $("#sheet-err").textContent = r.message;
    return;
  }
  const purchase = { orderId: "restored", productId: sheetProduct.productId, purchaseCode: code.toUpperCase(), signalIds, characterName: current.view.character.name };
  rememberRestoredPurchase(purchase);
  closeSheet();
  renderReport(r.report, purchase);
});
async function cancelFromSheet(useCode: boolean): Promise<void> {
  if (!sheetProduct || !current) return;
  const productId = sheetProduct.productId;
  const signalIds = productSignalIds(current, productId);
  const purchase = useCode ? { orderId: "restored", productId, signalIds, characterName: current.view.character.name, purchaseCode: ($("#sheet-code") as HTMLInputElement).value.trim() }
    : findStoredPurchase(productId, signalIds);
  if (!purchase) return;
  const result = await cancelUnopenedPurchase(purchase);
  if (result.ok) {
    $("#sheet-owned").hidden = true;
    $("#sheet-cancel").hidden = true;
    $("#sheet-err").textContent = "구매 취소가 완료됐어요. 취소된 구매의 리포트는 열 수 없어요.";
    toast("구매 취소가 완료됐어요.");
  }
  else $("#sheet-err").textContent = result.message;
}
$("#sheet-cancel").addEventListener("click", () => void cancelFromSheet(false));
$("#sheet-code-cancel").addEventListener("click", () => void cancelFromSheet(true));

// ── Premium 리포트 화면 (서버 승인 후에만) ──────────────────────
function renderReport(report: PremiumReport, purchase: StoredPurchase | null, notice?: string): void {
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast("구매 코드를 복사했어요.");
    } catch {
      toast("길게 눌러 직접 복사해 주세요.");
    }
  };
  const codeBox = purchase
    ? h(
        "div",
        { class: "box", id: "purchase-code-box" },
        h("p", { style: "margin:0;font-weight:700" }, "🔑 구매 코드"),
        h("p", { class: "d", style: "font-size:24px;margin:6px 0;letter-spacing:.06em" }, purchase.purchaseCode),
        h("p", { class: "mute small", style: "margin:0" }, "다른 기기에서 다시 볼 때 필요해요. 화면을 캡처하거나 적어 두세요. 같은 생년월일·시간으로 결과를 만든 뒤 '구매 코드로 열기'에 넣으면 열려요."),
        h("button", { class: "btn ghost", type: "button", onclick: () => void copyCode(purchase.purchaseCode) }, "구매 코드 복사"),
      )
    : null;
  $("#s-report").replaceChildren(
    h(
      "div",
      { class: "result" },
      notice ? h("div", { class: "notice" }, notice) : null,
      h("p", { class: "tag" }, "PREMIUM · WHY + HOW"),
      h("h1", { style: "font-size:34px" }, report.title),
      purchase ? h("p", { class: "mute" }, `${purchase.characterName}의 리포트`) : null,
      codeBox,
      h("h2", {}, "나의 패턴 한눈에 보기"),
      h("div", {}, report.summary.map((s) => h("span", { class: "pill" }, `#${s}`))),
      h("h2", {}, "WHY · 왜 이런 패턴일까"),
      report.why.map((w) => h("div", { class: "blk" }, h("p", { style: "font-weight:700;margin-bottom:4px" }, w.label), h("p", {}, w.text), h("p", { class: "mute" }, w.detail))),
      h("h2", {}, "HOW · 이렇게 활용해 보세요"),
      report.how.map((x) => h("div", { class: "box" }, h("p", { style: "font-weight:700;margin:0 0 6px" }, x.label), h("ul", { class: "list good" }, x.steps.map((s) => h("li", {}, s))))),
      report.reversal ? [h("h2", {}, "반전 포인트 심층"), h("div", { class: "rev" }, h("p", { style: "margin:0" }, report.reversal))] : null,
      h("h2", {}, "나만의 실천 체크리스트"),
      h("ul", { class: "list trait" }, report.checklist.map((t) => h("li", {}, t))),
      report.notIncluded.map((t) => h("p", { class: "mute small", style: "margin-top:16px" }, `ℹ️ ${t}`)),
      h("p", { class: "note" }, "사주팔자PLAY는 전통 명리 요소를 기반으로 만든 엔터테인먼트 서비스입니다. 리포트는 참고용이며 투자·의료·법률 판단의 근거가 아니에요."),
      h("button", { class: "btn ghost", type: "button", onclick: () => (current ? show("s-result") : show("s-landing")) }, current ? "내 결과로 돌아가기" : "처음으로"),
    ),
  );
  show("s-report");
}

/** 토스 결제창에서 돌아왔을 때 */
async function handleReturnIfAny(): Promise<void> {
  if (!PAYMENTS_ENABLED || !/[?&]pay=/.test(location.search)) return;
  show("s-loading");
  $("#steps").replaceChildren(h("li", { class: "now" }, "결제를 확인하고 있어요"));
  const out = await handlePaymentReturn();
  if (out.kind === "paid") {
    const purchase = out.purchase;
    const error = h("p", { role: "alert", class: "err" });
    const open = h("button", { class: "btn", id: "paid-open-report", type: "button", onclick: async () => {
      (open as HTMLButtonElement).disabled = true;
      const result = await fetchReport(purchase.purchaseCode, purchase.productId, purchase.signalIds);
      if (result.ok) renderReport(result.report, purchase);
      else { error.textContent = result.message; (open as HTMLButtonElement).disabled = false; }
    } }, "리포트 열기");
    const cancel = h("button", { class: "btn ghost", id: "paid-cancel-unopened", type: "button", onclick: async () => {
      (cancel as HTMLButtonElement).disabled = true;
      (open as HTMLButtonElement).disabled = true;
      const result = await cancelUnopenedPurchase(purchase);
      if (result.ok) { show("s-landing"); toast("구매 취소가 완료됐어요."); }
      else { error.textContent = result.message; (cancel as HTMLButtonElement).disabled = false; (open as HTMLButtonElement).disabled = false; }
    } }, "아직 열지 않은 구매 취소");
    $("#s-report").replaceChildren(h("div", { class: "result", id: "paid-unopened" },
      h("h2", {}, "결제가 완료됐어요"), h("p", {}, "아직 리포트 본문을 제공하지 않았어요."),
      h("p", {}, `구매 코드: ${purchase.purchaseCode}`),
      h("p", { class: "notice" }, "리포트 열기를 누르면 본문이 즉시 제공되고 최초 제공 시각이 기록돼요. 열람 이후 취소 요청은 고객 문의로 확인해 주세요. 결제 오류·중복 결제·콘텐츠 미제공·서비스 오류 등 필요한 환불은 별도로 검토해요."),
      open, cancel, error));
    return show("s-report");
  }
  if (out.kind === "confirm-pending") {
    $("#s-report").replaceChildren(h("div", { class: "result" }, h("h2", {}, "결제 확인 중"),
      h("p", {}, out.message), h("button", { class: "btn", type: "button", onclick: () => location.reload() }, "다시 확인하기")));
    return show("s-report");
  }
  if (out.kind === "paid-no-report") {
    $("#s-report").replaceChildren(
      h(
        "div",
        { class: "result" },
        h("h2", {}, "결제 확인 중"),
        h("div", { class: "notice" }, out.message),
        out.purchase ? h("p", {}, `구매 코드: ${out.purchase.purchaseCode}`) : null,
        h("button", { class: "btn", type: "button", onclick: () => location.reload() }, "다시 확인하기"),
      ),
    );
    return show("s-report");
  }
  if (out.kind === "failed") {
    show("s-landing");
    toast(out.message);
  }
}
void handleReturnIfAny();

// ── Feedback ──────────────────────────────────────────────
function renderFeedback(c: Current): HTMLElement {
  const draft: { similarity: number | null; best: Set<FeedbackArea>; worst: Set<FeedbackArea>; worstNone: boolean; intent: ShareIntent | null } = {
    similarity: null,
    best: new Set(),
    worst: new Set(),
    worstNone: false,
    intent: null,
  };
  const EMO = [
    ["😕", "전혀 아님"],
    ["😐", "글쎄"],
    ["🙂", "비슷해요"],
    ["😮", "꽤 맞음"],
    ["🤯", "소름 돋음"],
  ] as const;
  const emoBtns = EMO.map(([e, l], i) =>
    h("button", { type: "button", "aria-pressed": "false", "aria-label": `${i + 1}점 ${l}`, "data-score": String(i + 1) }, h("span", {}, e), String(i + 1)),
  );
  emoBtns.forEach((b, i) =>
    b.addEventListener("click", () => {
      draft.similarity = i + 1;
      emoBtns.forEach((x, k) => {
        x.classList.toggle("on", k === i);
        x.setAttribute("aria-pressed", String(k === i));
      });
      submit.disabled = false;
    }),
  );

  const toggles = (set: Set<FeedbackArea>, withNone: boolean, name: string) => {
    const btns: HTMLElement[] = FEEDBACK_AREAS.map((a) =>
      h("button", { type: "button", "aria-pressed": "false", "data-area": a, "data-group": name }, FEEDBACK_AREA_LABELS[a]),
    );
    const none = withNone ? h("button", { type: "button", "aria-pressed": "false", "data-area": "none", "data-group": name }, "없음") : null;
    const sync = () => {
      btns.forEach((b) => {
        const on = set.has(b.dataset.area as FeedbackArea);
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (none) {
        none.classList.toggle("on", draft.worstNone);
        none.setAttribute("aria-pressed", String(draft.worstNone));
      }
    };
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        const a = b.dataset.area as FeedbackArea;
        set.has(a) ? set.delete(a) : set.add(a);
        if (withNone) draft.worstNone = false;
        sync();
      }),
    );
    none?.addEventListener("click", () => {
      draft.worstNone = !draft.worstNone;
      if (draft.worstNone) set.clear();
      sync();
    });
    return h("div", { class: "tog" }, btns, none);
  };

  const intentBtns = (
    [
      ["no", "아니요"],
      ["maybe", "아마도"],
      ["yes", "네!"],
    ] as const
  ).map(([k, l]) => h("button", { type: "button", "aria-pressed": "false", "data-intent": k }, l));
  intentBtns.forEach((b) =>
    b.addEventListener("click", () => {
      draft.intent = b.dataset.intent as ShareIntent;
      intentBtns.forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
    }),
  );

  const comment = h("textarea", { id: "fb-comment", maxlength: "500", placeholder: "자유롭게 남겨주세요. 이름·연락처 같은 개인정보는 적지 말아 주세요." }) as HTMLTextAreaElement;
  const submit = h("button", { class: "btn", type: "button", id: "fb-submit", disabled: true }, "피드백 보내기") as HTMLButtonElement;
  const box = h(
    "section",
    { class: "fb", id: "feedback", "aria-labelledby": "fb-title" },
    h("h2", { id: "fb-title", style: "margin-top:0" }, "솔직히, 얼마나 나 같았나요?"),
    h("div", { class: "emo", role: "group", "aria-label": "얼마나 비슷했는지" }, emoBtns),
    h("div", { class: "emo-legend" }, h("span", {}, "전혀 아님"), h("span", {}, "소름 돋음")),
    h("p", { class: "q" }, "가장 “내 얘기 같다”고 느낀 부분은?"),
    h("p", { class: "mute small", style: "margin:0" }, "여러 개 골라도 돼요"),
    toggles(draft.best, false, "best"),
    h("p", { class: "q" }, "가장 안 맞았던 부분은?"),
    toggles(draft.worst, true, "worst"),
    h("p", { class: "q" }, "친구에게 한번 해보라고 보내고 싶나요?"),
    h("div", { class: "tog" }, intentBtns),
    h("p", { class: "q" }, "한마디 남겨주세요 (선택)"),
    comment,
    submit,
    h("p", { class: "mute small", style: "margin-top:8px" }, "생년월일·출생 시간은 자동으로 저장하지 않아요. 한마디에는 연락처·구매 코드·결제 키 등 개인정보를 적지 마세요."),
    // 개발 빌드 전용 안내 (__PALJA_ENV__ 비교라 production 빌드에서는 문구째 제거된다)
    __PALJA_ENV__ === "development" && rt.feedback.kind === "remote"
      ? h("p", { class: "devnote" }, "개발 환경: 피드백이 Supabase 에 개발용(source=development)으로 저장돼요.")
      : __PALJA_ENV__ === "development" && rt.feedback.kind === "local-dev"
      ? h("p", { class: "devnote" }, "Beta 개발 환경: 피드백은 이 브라우저에만 임시 저장돼요. 아직 운영 서버로 전송되지 않아요.")
      : rt.feedback.kind === "unconfigured"
        ? h("p", { class: "devnote" }, "피드백 저장소를 준비 중이에요. 지금은 피드백이 저장되지 않아요.")
        : null,
  );

  submit.addEventListener("click", async () => {
    const d: FeedbackDraft = {
      similarity: draft.similarity,
      bestMatch: [...draft.best],
      worstMatch: draft.worstNone ? "none" : [...draft.worst],
      shareIntent: draft.intent,
      comment: comment.value,
    };
    const free = c.result.free;
    const built = buildFeedbackRecord(d, {
      feedbackId: randomId(),
      resultId: c.resultId,
      createdAt: nowIso(),
      versions: free.versions,
      resultTraits: {
        characterId: free.character.id,
        timeKnown: !free.notices.some((n) => n.code === "TIME_UNKNOWN"),
        boundaryRisk: free.boundaryRisk,
        uncertainPillarCount: free.pillars.filter((p) => p.confidence === "uncertain").length,
      },
    });
    if (!built.ok) {
      toast("얼마나 비슷했는지 먼저 골라 주세요.");
      return;
    }
    submit.disabled = true;
    const res = await rt.feedback.submit(built.record);
    if (!res.ok) {
      submit.disabled = false;
      toast(res.reason === "NOT_CONFIGURED" ? "피드백 저장소를 준비 중이에요." : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    rt.track(
      "feedback_submit",
      {
        similarity: built.record.similarity,
        bestCount: built.record.bestMatch.length,
        worstNone: built.record.worstMatch === "none",
        shareIntent: built.record.shareIntent,
        hasComment: built.record.comment !== null,
        storage: res.storage,
      },
      c.resultId,
    );
    box.replaceChildren(
      h("div", { class: "done" }, h("div", { style: "font-size:44px" }, "🙏"), h("h2", { style: "margin:6px 0" }, "고마워요!"), h("p", { class: "mute" }, "남겨준 의견으로 사주팔자PLAY를 더 잘 맞게 다듬을게요.")),
    );
  });
  return box;
}

// ── 친구와 배틀 ───────────────────────────────────────────
/** 배틀 링크로 들어온 경우: 결과 상단에 대결 결과 */
function renderBattleResult(c: Current, friend: BattleCard): HTMLElement {
  const me = battleCardFrom(c.result.free, null);
  const res = compareBattle(me, friend);
  const fch = characterById(friend.characterId)!;
  const fname = friend.nickname ?? "친구";
  const side = (emoji: string, name: string, who: string, cls: string, tier: TierResult) =>
    h("div", { class: `vs-side ${cls}` }, h("div", { class: "em", "aria-hidden": "true" }, emoji), h("b", {}, name), h("span", {}, who),
      h("b", { class: "battle-tier" }, `${tier.tier} TIER`), h("span", { class: "small" }, tier.label));
  return h(
    "section",
    { class: `battle-result ${res.outcome}`, id: "battle-result", "aria-label": "배틀 결과" },
    h("p", { class: "invite-tag", style: "text-align:center" }, `⚔️ ${withJosa(fname, "와/과")}의 배틀`),
    h(
      "div",
      { class: "vs" },
      side(c.view.character.emoji, c.view.character.name, "나", "me", tiersForScores(me.scores).total),
      h("div", { class: "vs-mid" }, h("b", {}, `${res.myWins} : ${res.friendWins}`), h("span", {}, "VS")),
      side(fch.emoji, fch.name, fname, "friend", tiersForScores(friend.scores).total),
    ),
    h("h2", { class: "battle-headline" }, res.headline),
    h("p", { style: "text-align:center" }, res.comment),
    h(
      "div",
      { class: "rounds" },
      res.rounds.map((r) =>
        h(
          "div",
          { class: `round ${r.winner}`, "aria-label": `${r.label} 나 ${r.me} 대 ${fname} ${r.friend}` },
          h("span", { class: "rv me" }, String(r.me)),
          h("span", { class: "rl" }, r.winner === "me" ? `◀ ${r.label}` : r.winner === "friend" ? `${r.label} ▶` : `${r.label} =`),
          h("span", { class: "rv friend" }, String(r.friend)),
        ),
      ),
    ),
    h("p", { class: "mute small", style: "text-align:center;margin-top:8px" }, `총점 ${res.myTotal} vs ${res.friendTotal} · 재미로 보는 대결이에요. 능력치는 서비스 지표예요.`),
    h("button", { class: "btn", type: "button", onclick: () => document.getElementById("battle")?.scrollIntoView({ behavior: "smooth" }) }, res.outcome === "lose" ? "리매치 신청하러 가기" : "다른 친구에게도 도전장 보내기"),
  );
}

/**
 * 결과 맨 마지막: 친구와 배틀하기.
 * 모든 공유 방식(문자·카카오톡·공유 시트·링크 복사·QR)은 createBattleShare() 가 만든 같은 링크만 쓴다.
 *  - 휴대폰: 문자(전화번호 → 문자 앱) / 카카오톡(키 설정 시) / 다른 방법(공유 시트) / 링크 복사
 *  - PC   : 카카오톡(키 설정 시) / 링크 복사 / 휴대폰으로 보내기(QR + 복사) / 다른 방법(지원 시)
 * 지원하지 않는 방식은 버튼을 아예 보이지 않는다.
 */
function renderBattle(c: Current): HTMLElement {
  const v = c.view;
  const mobile = isMobileDevice();
  const nick = h("input", { id: "battle-nick", type: "text", maxlength: String(NICKNAME_MAX), placeholder: "예: 행운의고양이", autocomplete: "off" }) as HTMLInputElement;
  // 전화번호: 문자 앱을 여는 데만 쓰고 저장·전송하지 않는다 (자동완성 저장도 끔)
  const phone = h("input", { id: "battle-phone", type: "tel", inputmode: "numeric", maxlength: "13", placeholder: "010-1234-5678", autocomplete: "off", name: "battle-phone-no-save" }) as HTMLInputElement;
  const err = h("p", { class: "err", id: "battle-err", role: "alert" });
  const fallback = h("div", { id: "share-fallback" });
  const qrPanel = h("div", { id: "qr-panel", hidden: true });
  const total = c.result.free.scores.reduce((a, s) => a + s.value, 0);
  const card = h(
    "div",
    { class: "share-card", id: "share-card" },
    h("div", { class: "brand" }, "사주팔자PLAY · BATTLE"),
    h("div", { class: "em", "aria-hidden": "true" }, v.character.emoji),
    h("h3", { class: "d" }, v.character.name),
    h("div", { class: "tl" }, v.character.tagline),
    h("div", { class: "top3" }, h("span", {}, "능력치 총점 ", h("b", {}, "???")), h("span", {}, "7라운드 대결")),
  );

  /** 지금 입력된 닉네임으로 만든 하나뿐인 배틀 링크 */
  const share = (): BattleShare => createBattleShare(battleCardFrom(c.result.free, sanitizeNickname(nick.value)), APP_CONFIG.publicUrl ?? location.href);
  const trackShare = (method: string) =>
    rt.track("share_click", { mode: "battle", method, device: mobile ? "mobile" : "pc", hasNickname: sanitizeNickname(nick.value) !== null, rematch: challenger !== null }, c.resultId);

  /** 자동 복사가 안 될 때: 링크를 직접 선택·복사할 수 있는 입력창 */
  const showManual = (s: BattleShare) => {
    const inp = h("input", { id: "battle-url-input", type: "text", readonly: true, "aria-label": "배틀 링크", style: "margin-top:10px" }) as HTMLInputElement;
    inp.value = s.url;
    fallback.replaceChildren(h("p", { class: "mute small", style: "margin-top:10px" }, "아래 링크를 길게 눌러(또는 Ctrl+C) 복사해 주세요."), inp);
    inp.focus();
    inp.select();
  };

  const copyLink = async () => {
    err.textContent = "";
    const s = share();
    const how = await copyText(s.clipboardText);
    if (how) toast("배틀 링크가 복사됐어요! 친구에게 보내보세요 ⚔️");
    else {
      toast("자동 복사가 안 돼요. 아래 링크를 직접 복사해 주세요.");
      showManual(s);
    }
    trackShare(how ? `copy-${how}` : "copy-manual");
  };

  const buttons: HTMLElement[] = [];

  if (mobile) {
    const sms = h("button", { class: "btn jade", type: "button", id: "sms-btn" }, "⚔️ 문자로 배틀 신청 보내기");
    sms.addEventListener("click", () => {
      err.textContent = "";
      const digits = normalizeKoreanMobile(phone.value);
      if (!digits) {
        err.textContent = "친구의 휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)";
        return;
      }
      const s = share();
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const uri = buildSmsUri(digits, s.smsBody, isIos ? "ios" : "other");
      phone.value = ""; // 보낸 직후 화면에서도 지운다
      trackShare("sms"); // 전화번호는 이벤트에 넣지 않는다
      toast("문자 앱을 열었어요. 전송 버튼만 누르면 배틀 신청 완료!");
      window.location.href = uri;
    });
    buttons.push(sms);
  }

  if (KAKAO_ENABLED) {
    const kakao = h("button", { class: "btn", type: "button", id: "kakao-btn", style: "background:#FEE500;color:#191919" }, "카카오톡으로 보내기");
    kakao.addEventListener("click", async () => {
      const s = share();
      const ok = await shareKakao(s);
      trackShare(ok ? "kakao" : "kakao-failed");
      if (!ok) {
        toast("카카오톡을 열지 못했어요. 링크를 복사해서 보내 주세요.");
        await copyLink();
      }
    });
    buttons.push(kakao);
  }

  if (mobile && hasWebShare()) {
    const other = h("button", { class: "btn ghost", type: "button", id: "webshare-btn" }, "다른 방법으로 보내기 (카톡 등)");
    other.addEventListener("click", async () => {
      const s = share();
      try {
        await navigator.share(s.webShare); // 링크는 text 안에 들어 있다
        trackShare("web-share");
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return; // 사용자가 공유 창을 닫음
        trackShare("web-share-failed");
        await copyLink();
      }
    });
    buttons.push(other);
  }

  const copy = h("button", { class: mobile ? "btn ghost" : "btn jade", type: "button", id: "copy-btn" }, "🔗 배틀 링크 복사");
  copy.addEventListener("click", () => void copyLink());
  buttons.push(copy);

  if (!mobile) {
    const toPhone = h("button", { class: "btn ghost", type: "button", id: "phone-btn" }, "📱 휴대폰으로 보내기 / 문자");
    toPhone.addEventListener("click", () => {
      const s = share();
      qrPanel.replaceChildren(
        h("div", { class: "notice" }, "PC에서는 문자 앱이 연결되어 있지 않을 수 있어요. 휴대폰 카메라로 아래 QR을 찍으면 배틀 링크가 열려요. 친구에게 바로 보여 주거나, 링크를 복사해서 보내세요."),
        h("div", { class: "qr", id: "battle-qr", "data-url": s.qrText }),
        h("button", { class: "btn ghost", type: "button", onclick: () => void copyLink() }, "🔗 배틀 링크 복사"),
      );
      (qrPanel.querySelector("#battle-qr") as HTMLElement).innerHTML = qrSvg(s.qrText);
      qrPanel.hidden = false;
      trackShare("qr");
    });
    buttons.push(toPhone);
    if (hasWebShare()) {
      const other = h("button", { class: "btn ghost", type: "button", id: "webshare-btn" }, "다른 방법으로 공유");
      other.addEventListener("click", async () => {
        try {
          await navigator.share(share().webShare);
          trackShare("web-share");
        } catch (e) {
          if ((e as { name?: string })?.name !== "AbortError") await copyLink();
        }
      });
      buttons.push(other);
    }
  }

  // 닉네임이 바뀌면 이미 띄운 QR 은 예전 링크라 닫는다
  nick.addEventListener("input", () => {
    qrPanel.hidden = true;
    fallback.replaceChildren();
  });

  return h(
    "section",
    { id: "battle", "aria-label": "친구와 배틀하기", "data-device": mobile ? "mobile" : "pc" },
    h("h2", {}, mobile ? "친구와 배틀하기" : "⚔️ 친구에게 도전장 보내기"),
    h("p", { class: "mute" }, `친구가 링크를 열고 자기 팔자를 넣으면, 7개 능력치로 라운드 대결이 펼쳐져요. 내 총점은 ${total}점! 친구는 대결 전까지 몰라요.`),
    card,
    h("label", { for: "battle-nick" }, "배틀 닉네임"),
    nick,
    h("p", { class: "mute small", style: "margin:6px 0 0" }, "실명 대신 별명을 추천해요."),
    mobile
      ? [
          h("label", { for: "battle-phone" }, "받을 친구 전화번호"),
          phone,
          h("p", { class: "mute small", style: "margin:6px 0 0" }, "🔒 전화번호는 저장되지 않으며 개인정보보호 처리됩니다."),
        ]
      : null,
    err,
    buttons,
    qrPanel,
    fallback,
    h("p", { class: "mute small", style: "margin-top:8px" }, "링크에는 캐릭터와 능력치 점수, 배틀 닉네임만 담겨요. 생년월일·출생 시간·성별·전화번호는 들어가지 않아요. 재미로 보는 대결이며 상품·보상과는 관계없어요."),
  );
}

// 개발 환경에서만: E2E 테스트가 이벤트를 확인할 수 있도록 노출 (production 빌드에서는 코드째 제거됨)
if (__PALJA_ENV__ === "development") {
  (window as unknown as { __PALJA_DEV__: unknown }).__PALJA_DEV__ = { events: rt.memoryEvents, sessionId: rt.sessionId };
}
