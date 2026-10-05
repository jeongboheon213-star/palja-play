// Phase 6 PREMIUM 미리보기 + 가격 설정 + 클릭 이벤트 구조 테스트.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBetaResult, PREMIUM_SPECS } from "../src/lib/engine";
import { PREMIUM_COPY, WHEN_PREPARING, deriveSignals } from "../src/lib/interpretation";
import { PRODUCTS, PREMIUM_COMING_SOON_MESSAGE, formatPriceKrw } from "../src/data/products";
import { EVENT_NAMES, createMemorySink, sanitizeProps } from "../src/lib/analytics/events";
import { ALPHA_POLICY, withJasiPolicy } from "../src/lib/saju/policies";
import { MS_PER_DAY, epochMsFromIsoUtc, formatLocalFromEpochMs } from "../src/lib/saju/civil";
import type { SajuInput } from "../src/lib/saju/types";

const inp = (d: string, t: string | null, g: "male" | "female" = "male"): SajuInput => ({ birthDate: d, birthTime: t, gender: g, calendar: "solar", birthCountry: "KR" });
const okResult = (d: string, t: string | null, g: "male" | "female" = "male") => {
  const r = computeBetaResult(inp(d, t, g));
  assert.ok(r.ok);
  if (!r.ok) throw new Error("unreachable");
  return r;
};

test("상품 설정: 재물/연애/직업·사업 리포트 4,900원, Beta 테스트 가격, 결제 비활성", () => {
  assert.deepEqual(PREMIUM_SPECS.map((p) => [p.name, p.priceLabel]), [
    ["재물 심층 리포트", "4,900원"],
    ["연애 심층 리포트", "4,900원"],
    ["직업·사업 심층 리포트", "4,900원"],
  ]);
  for (const p of PREMIUM_SPECS) {
    assert.equal(p.betaTestPrice, true);
    assert.equal(p.paymentEnabled, false);
    assert.equal(p.comingSoonMessage, "팔자PLAY Beta에서 준비 중인 기능입니다.");
  }
  assert.equal(PREMIUM_COMING_SOON_MESSAGE, "팔자PLAY Beta에서 준비 중인 기능입니다.");
  assert.equal(formatPriceKrw(4900), "4,900원");
  assert.equal(formatPriceKrw(12000), "12,000원");
});

test("클릭 이벤트: 상품마다 이벤트 이름이 정해져 있고 이벤트 목록에 있다", () => {
  assert.deepEqual(PREMIUM_SPECS.map((p) => p.clickEvent), ["premium_money_click", "premium_love_click", "premium_career_click"]);
  for (const p of Object.values(PRODUCTS)) if (p.clickEvent) assert.ok((EVENT_NAMES as readonly string[]).includes(p.clickEvent));
  // Phase 8: 단순 클릭과 실제 관심을 구분하는 *_interest 3종 추가
  assert.deepEqual([...EVENT_NAMES], [
    "landing_view", "input_start", "calculation_complete", "result_view", "share_click",
    "premium_money_click", "premium_love_click", "premium_career_click",
    "premium_money_interest", "premium_love_interest", "premium_career_interest",
    "feedback_submit",
  ]);
  assert.deepEqual(PREMIUM_SPECS.map((p) => p.interestEvent), ["premium_money_interest", "premium_love_interest", "premium_career_interest"]);
});

test("이벤트 속성에서 개인정보로 보이는 키는 제거된다, 메모리 sink 는 쌓기만 한다", () => {
  assert.deepEqual(sanitizeProps({ productId: "premium_money", birthDate: "1990-01-01", birthTime: "10:00", gender: "male", price: 4900 }), { productId: "premium_money", price: 4900 });
  const sink = createMemorySink();
  sink.send({ name: "premium_money_click", at: "2026-10-05T00:00:00Z", sessionId: "s", resultId: "r", props: {} });
  assert.equal(sink.events.length, 1);
});

test("PREMIUM 구조: WHY / HOW 미리보기 + WHEN 은 준비 중 (FREE 는 WHAT)", () => {
  const r = okResult("1990-05-15", "14:20", "female");
  assert.equal(r.free.axis, "what");
  assert.equal(r.premium.length, 3);
  for (const p of r.premium) {
    assert.equal(p.why.axis, "why");
    assert.equal(p.how.axis, "how");
    assert.equal(p.when.status, "preparing");
    assert.equal(p.when.message, "준비 중");
    assert.equal(p.when.reason, WHEN_PREPARING.reason);
  }
});

test("[스윕] WHEN 에 가짜 시기 없음, 미리보기 근거 Signal 은 실제로 있고 상품 영역 안", () => {
  const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
  let n = 0;
  for (let ms = epochMsFromIsoUtc("1962-01-05T00:00:00Z")!; ms < end; ms += 19 * MS_PER_DAY) {
    const date = formatLocalFromEpochMs(ms, 0).date;
    for (const [t, g] of [["10:10", "male"], [null, "female"]] as const) {
      const r = computeBetaResult(inp(date, t, g));
      if (!r.ok) continue;
      const set = deriveSignals(r.saju)!;
      const byId = new Map(set.signals.map((s) => [s.id, s]));
      for (const p of r.premium) {
        assert.ok(!/\d{4}년|\d+세|대운 \d|세운 \d|\d+월에/.test(JSON.stringify(p.when)));
        for (const ax of [p.why, p.how]) {
          assert.equal(ax.status, "preview", `${date} ${p.product.id} ${ax.axis}`);
          const sig = byId.get(ax.teaser!.signalIds[0]!);
          assert.ok(sig, ax.teaser!.signalIds[0]);
          assert.ok(p.product.domains.includes(sig!.domain));
          const usable = set.signals.filter((s) => p.product.domains.includes(s.domain) && PREMIUM_COPY[s.id]?.[ax.axis]).length;
          assert.equal(ax.lockedCount, usable - 1);
        }
      }
      n++;
    }
  }
  assert.ok(n > 2000);
});

test("[스윕] 재물·연애·직업·사업 영역의 모든 Signal 에 WHY/HOW 문구가 있다", () => {
  const missing = new Set<string>();
  const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
  for (let ms = epochMsFromIsoUtc("1962-01-06T00:00:00Z")!; ms < end; ms += 11 * MS_PER_DAY) {
    const date = formatLocalFromEpochMs(ms, 0).date;
    for (const [t, g] of [["02:20", "male"], ["16:40", "female"], [null, "male"]] as const) {
      const r = computeBetaResult(inp(date, t, g));
      if (!r.ok) continue;
      for (const s of deriveSignals(r.saju)!.signals) {
        if (["wealth", "love", "career", "business"].includes(s.domain) && !(PREMIUM_COPY[s.id]?.why && PREMIUM_COPY[s.id]?.how)) missing.add(s.id);
      }
    }
  }
  assert.deepEqual([...missing], []);
});

test("PREMIUM 문구 금지 표현 없음 (단정·투자 권유)", () => {
  const banned = [/반드시/, /무조건/, /100%/, /확실히/, /투자하세요/, /사세요/, /검증된/, /정확한/];
  for (const [id, c] of Object.entries(PREMIUM_COPY)) for (const t of [c.why, c.how]) if (t) for (const re of banned) assert.ok(!re.test(t), `${id}: ${re}`);
});

test("computeBetaResult: 오류 경로 (DST gap, 일주 uncertain)", () => {
  const gap = computeBetaResult(inp("1987-05-10", "02:30"));
  assert.equal(gap.ok, false);
  if (!gap.ok) assert.equal(gap.code, "NONEXISTENT_LOCAL_TIME");
  const amb = computeBetaResult(inp("1987-10-11", "02:30"));
  assert.equal(amb.ok, false);
  if (!amb.ok) assert.equal(amb.candidates?.length, 2);
  const du = computeBetaResult(inp("2010-06-10", null), {}, withJasiPolicy(ALPHA_POLICY, "jasi"));
  assert.equal(du.ok, false);
  if (!du.ok) assert.equal(du.code, "DAY_MASTER_UNAVAILABLE");
});

test("computeBetaResult 결정론", () => {
  const a = JSON.stringify(computeBetaResult(inp("1972-07-07", "07:07")));
  for (let i = 0; i < 10; i++) assert.equal(JSON.stringify(computeBetaResult(inp("1972-07-07", "07:07"))), a);
});
