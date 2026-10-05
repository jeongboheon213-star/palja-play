// 팔자PLAY Beta 화면. 계산은 전부 엔진(computeBetaResult)이 하고, 여기서는 보여주기만 한다.
// 화면에 쓰는 사주 결과는 전부 엔진 결과다 (가짜 데이터 없음). 사주 계산에 난수를 쓰지 않는다 (UUID 는 레코드 구분용, runtime.ts 참고).

import { computeBetaResult, type BetaResult } from "../../src/lib/engine";
import { validateSajuInput } from "../../src/lib/validation";
import { toResultView, RESULT_ERROR_TEXT, type ResultView } from "../../src/lib/ui/resultView";
import { buildShareText } from "../../src/lib/share/share";
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
const SCREENS = ["s-landing", "s-input", "s-loading", "s-result"] as const;
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
if (APP_CONFIG.isDev) $("#devflag").hidden = false;
rt.track("landing_view");
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
    rt.track("result_view", { characterId: r.free.character.id }, resultId);
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
    h(
      "details",
      {},
      h("summary", {}, "내 사주 여덟 글자 보기"),
      h("div", { class: "pil" }, v.pillars.map((p) => h("div", {}, h("b", {}, p.main), h("i", {}, p.sub), h("span", {}, p.label)))),
    ),

    v.sections.map((s) => [h("h2", {}, s.title), h("div", { class: "blk" }, s.paragraphs.map((p) => h("p", {}, p)))]),

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
    renderShare(c),

    h("p", { class: "note" }, v.disclaimer),
    h("button", { class: "btn ghost", type: "button", id: "again", onclick: () => show("s-input") }, "다시 해보기"),
  ));
  // 능력치 막대 채우기 애니메이션
  window.setTimeout(() => {
    for (const i of Array.from(root.querySelectorAll<HTMLElement>(".blocks i"))) if (i.dataset.f === "true") i.classList.add("f");
  }, 120);
}

// ── Premium ───────────────────────────────────────────────
let sheetProduct: { name: string; interestEvent: string | null } | null = null;

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
              openSheet(p.name, p.interestEvent);
            },
          },
          `리포트 열어보기 · ${p.priceLabel}`,
        ),
      ),
    ),
    h("p", { class: "mute small", style: "margin-top:10px" }, "가격은 Beta 테스트 가격이에요. 지금은 결제가 일어나지 않아요."),
  );
}

function openSheet(name: string, interestEvent: string | null): void {
  sheetProduct = { name, interestEvent };
  $("#sheet-title").textContent = name;
  const btn = $<HTMLButtonElement>("#sheet-interest");
  btn.disabled = false;
  btn.textContent = "이 리포트가 나오면 보고 싶어요";
  const s = $("#sheet");
  s.hidden = false;
  $("#sheet-bg").classList.add("on");
  requestAnimationFrame(() => s.classList.add("on"));
  btn.focus({ preventScroll: true });
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
    h("p", { class: "mute small", style: "margin-top:8px" }, "생년월일·출생 시간은 피드백과 함께 저장하지 않아요."),
    rt.feedback.kind === "local-dev"
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
      h("div", { class: "done" }, h("div", { style: "font-size:44px" }, "🙏"), h("h2", { style: "margin:6px 0" }, "고마워요!"), h("p", { class: "mute" }, "남겨준 의견으로 팔자PLAY를 더 잘 맞게 다듬을게요.")),
    );
  });
  return box;
}

// ── Share ─────────────────────────────────────────────────
function renderShare(c: Current): HTMLElement {
  const s = c.view.share;
  const card = h(
    "div",
    { class: "share-card", id: "share-card" },
    h("div", { class: "brand" }, "팔자PLAY"),
    h("div", { class: "em", "aria-hidden": "true" }, s.emoji),
    h("h3", { class: "d" }, s.characterName),
    h("div", { class: "tl" }, s.tagline),
    h("div", { class: "top3" }, s.topStats.map((t) => h("span", {}, `${t.label} `, h("b", {}, String(t.value))))),
  );
  const fallback = h("div", { id: "share-fallback" });
  const btn = h("button", { class: "btn jade", type: "button", id: "share-btn" }, "친구에게 공유하기");
  btn.addEventListener("click", async () => {
    const text = buildShareText(c.result.free, { publicUrl: APP_CONFIG.publicUrl });
    let method = "none";
    try {
      if (typeof navigator.share === "function") {
        method = "web-share";
        await navigator.share(APP_CONFIG.publicUrl ? { title: "팔자PLAY", text, url: APP_CONFIG.publicUrl } : { title: "팔자PLAY", text });
      } else if (navigator.clipboard?.writeText) {
        method = "clipboard";
        await navigator.clipboard.writeText(text);
        toast("공유 문구를 복사했어요. 친구에게 붙여넣어 보내 보세요!");
      } else {
        throw new Error("no share");
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return; // 사용자가 공유 창을 닫음
      method = "manual";
      const ta = h("textarea", { class: "share-fallback", readonly: true, "aria-label": "공유 문구" }) as HTMLTextAreaElement;
      ta.value = text;
      fallback.replaceChildren(h("p", { class: "mute small", style: "margin-top:10px" }, "아래 문구를 길게 눌러 복사해 주세요."), ta);
      ta.select();
    } finally {
      rt.track("share_click", { method }, c.resultId);
    }
  });
  return h(
    "section",
    { id: "share", "aria-label": "공유" },
    h("h2", {}, "내 캐릭터 자랑하기"),
    card,
    btn,
    fallback,
    h("p", { class: "mute small", style: "margin-top:8px" }, "공유 문구에는 생년월일이나 출생 시간이 들어가지 않아요."),
  );
}

// 개발 환경에서만: E2E 테스트가 이벤트를 확인할 수 있도록 노출 (production 빌드에서는 코드째 제거됨)
declare const __PALJA_ENV__: "development" | "production";
if (__PALJA_ENV__ === "development") {
  (window as unknown as { __PALJA_DEV__: unknown }).__PALJA_DEV__ = { events: rt.memoryEvents, sessionId: rt.sessionId };
}
