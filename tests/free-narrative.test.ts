import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeBetaResult, computeSaju } from "../src/lib/engine";
import { buildFreeReading } from "../src/lib/interpretation/free";
import { buildFreeNarrative } from "../src/lib/interpretation/freeNarrative";
import { deriveSignals } from "../src/lib/interpretation/signals";
import { extractFeatures } from "../src/lib/interpretation/features";
import { CHARACTERS } from "../src/lib/interpretation/copy/characters";
import { scoreSignals } from "../src/lib/interpretation/score";
import { toResultView } from "../src/lib/ui/resultView";
import type { Signal } from "../src/lib/interpretation/types";

const input = (birthDate = "1990-05-15", birthTime: string | null = "14:20", gender: "male" | "female" = "male") => ({ birthDate, birthTime, gender, calendar: "solar" as const, birthCountry: "KR" as const });
const fixture = (date?: string, time?: string | null) => {
  const r = computeBetaResult(input(date, time)); assert.ok(r.ok); return r;
};

test("무료 해석: 실제 복합 근거·약한 재물 연결·겉 오행/지장간 범위", () => {
  const r = fixture();
  assert.deepEqual(r.free.scores.map((s) => s.value), [40, 41, 55, 80, 89, 80, 68]);
  assert.match(r.free.sections.find((s) => s.domain === "career")!.items[0]!.text, /원칙.*어려운 과제.*배움/);
  assert.match(r.free.sections.find((s) => s.domain === "business")!.items[0]!.text, /자기 방식/);
  assert.match(r.free.sections.find((s) => s.domain === "business")!.items[0]!.text, /수입을 꾸준히 잇는 일은 낯설/);
  assert.ok(r.free.fiveElements.summary.some((i) => /겉으로.*목.*지장간.*목/.test(i.text)));
  assert.ok(r.free.evidence[0]!.facts.includes("관성 2개: 연주 지지 정기 정관, 월주 지지 정기 편관"));
  assert.ok(r.free.evidence[0]!.facts.includes("지지육합: 연주·시주"));
  assert.ok(r.free.evidence.find((e) => e.domain === "career")!.facts.some((s) => s.endsWith("변환 전 기여 +2")));
});

test("무료 키워드 개선은 기존 공유 데이터에 영향을 주지 않는다", () => {
  const r = fixture(); const view = toResultView(r.free, r.premium);
  assert.deepEqual(view.share.keywords, CHARACTERS[r.free.character.dayMaster].keywords);
  assert.deepEqual(view.keywords, r.free.displayKeywords.map((i) => i.text));
  assert.ok(view.keywords.includes("전문성"));
  assert.notDeepEqual(view.keywords.slice(0, 3), view.share.keywords);
});

test("같은 일간이라도 명식의 복합 특징이 다르면 무료 본문이 다르다", () => {
  const a = fixture("2000-12-15", "06:20"), b = fixture("1978-04-15", "22:20");
  assert.equal(a.free.character.dayMaster, b.free.character.dayMaster);
  assert.notDeepEqual(a.free.sections.map((s) => s.items), b.free.sections.map((s) => s.items));
});

test("같은 점수여도 근거가 다르면 본문이 달라지고, 점수만 바꿔도 본문 의미가 바뀌지는 않는다", () => {
  const a = fixture("1970-01-05", "01:20"), b = fixture("1970-01-05", "05:20");
  assert.equal(a.free.scores[0]!.value, b.free.scores[0]!.value);
  assert.notDeepEqual(a.free.sections[0]!.items, b.free.sections[0]!.items);
  const set = deriveSignals(a.saju)!;
  const changed = buildFreeNarrative(a.saju, set, a.free.scores.map((s) => ({ ...s, value: 64 })));
  assert.deepEqual(changed.sections.map((s) => s.items), a.free.sections.map((s) => s.items));
});

test("무료 해석은 동결·결정론 유지, 원본 명식과 Signal·점수는 변경하지 않는다", () => {
  const r = fixture(); const dataBefore = JSON.stringify(r.saju), set = deriveSignals(r.saju)!;
  const signalsBefore = JSON.stringify(set), result = buildFreeNarrative(r.saju, set, scoreSignals(set).scores);
  assert.equal(JSON.stringify(r.saju), dataBefore); assert.equal(JSON.stringify(set), signalsBefore);
  assert.deepEqual(result, buildFreeNarrative(r.saju, set, scoreSignals(set).scores));
  assert.deepEqual(fixture().free, r.free);
  assert.ok(Object.isFrozen(r.free.evidence)); assert.ok(Object.isFrozen(r.free.displayKeywords));
  const source = readFileSync("src/lib/interpretation/freeNarrative.ts", "utf8");
  assert.doesNotMatch(source, /Math\.random|new Date|Date\.now|hash.*%/);
  assert.doesNotMatch(readFileSync("src/lib/interpretation/freeStyle.ts", "utf8"), /Math\.random|new Date|Date\.now|hash.*%/);
});

test("[14,400명] 모든 문장 근거의 실재성·중복·결측·낮은 점수 과장·반전 근거 검사", () => {
  let n = 0;
  for (let year = 1970; year < 2020; year++) for (let month = 1; month <= 12; month++) for (const day of [5, 15]) for (let hour = 1; hour < 24; hour += 2) {
    const r = computeSaju(input(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, `${String(hour).padStart(2, "0")}:20`));
    assert.ok(r.ok); const free = buildFreeReading(r.data); assert.ok(free.ok);
    const ids = new Set(free.signals.signals.map((s) => s.id));
    const reading = free.reading;
    assert.equal(reading.displayKeywords.length, 5);
    assert.ok(reading.displayKeywords.filter(k => k.text.length >= 2 && k.text.length <= 4).length >= 3);
    const groups = [reading.coreTraits, reading.strengths, reading.cautions, reading.displayKeywords, reading.fiveElements.summary, reading.reversals, ...reading.sections.map((s) => [s.summary!, ...s.items])];
    // 화면의 해석 문장 전체를 검사한다. 키워드·접힌 근거·공통 UI 라벨은 문장이 아니다.
    const screenSentences = [reading.coreTraits, reading.strengths, reading.cautions,
      reading.fiveElements.summary, reading.reversals,
      ...reading.sections.map((s) => [s.summary!, ...s.items])]
      .flat().flatMap((item) => item.text.split(/(?<=[.!?])\s+/))
      .map((text) => text.trim().replace(/[.!?]+$/, ""));
    assert.equal(new Set(screenSentences).size, screenSentences.length,
      `한 화면 중복 문장: ${year}-${month}-${day} ${hour}:20`);
    for (const list of groups) {
      assert.equal(new Set(list.map((i) => i.text)).size, list.length);
      for (const item of list) {
        assert.ok(item.signalIds.length); for (const id of item.signalIds) assert.ok(ids.has(id), `${id}: ${item.text}`);
        assert.doesNotMatch(item.text, /무조건|반드시 성공|큰돈이 들어|배우자와 문제가 생|용신|격국|대운|세운|조후|자녀운|직장 문제가/);
      }
    }
    const f = extractFeatures(r.data);
    for (const section of reading.sections) {
      assert.equal(section.items.length, ["wealth", "love", "career"].includes(section.domain) ? 3 : 2);
      assert.ok(section.summary && section.summary.text.length <= 40);
      assert.match(section.summary.text, /요$/);
      assert.doesNotMatch(section.items.map(i => i.text).join(" "), /아니에요|보장하지|정해 주지|로 읽을 수|구분해서 볼|두드러지지|주요 해석 자리|명식에서|특징이 함께 보여/);
      for (const sentence of section.items.flatMap(i => i.text.split(/(?<=[.!?])\s+/))) assert.ok(sentence.length <= 60, sentence);
      const body = section.items.map((i) => i.text).join(" ");
      if (section.score < 60) assert.doesNotMatch(body, /탁월|매우 뛰어|특히 강한|성공할/);
      if (section.domain === "wealth" && /꾸준히 쌓아 두려는 마음과 새로운 거래/.test(body)) {
        assert.ok((f.tenGodCount.정재 ?? 0) > 0 && (f.tenGodCount.편재 ?? 0) > 0);
      }
      if (section.domain === "business" && /주요 해석 자리에서 재물 특징은 약해/.test(body)) assert.equal(f.groupCount.재성, 0);
    }
    for (const reversal of reading.reversals) {
      const pair: Signal[] = reversal.signalIds.map((id): Signal => free.signals.signals.find((s) => s.id === id)!);
      const [p, neg] = pair;
      assert.equal(p!.domain, reversal.domain); assert.equal(neg!.domain, reversal.domain);
      assert.equal(p!.polarity, "positive"); assert.equal(neg!.polarity, "negative");
    }
    assert.deepEqual(reading.scores, scoreSignals(free.signals).scores);
    n++;
  }
  assert.equal(n, 14400);
});

test("확정 기둥이 하나일 때도 후보를 채우거나 전체 명식을 추측하지 않는다", () => {
  const r = fixture("2010-02-04", null);
  assert.equal(r.free.fiveElements.total, 2);
  assert.match(r.free.fiveElements.summary[0]!.text, /확정된 글자/);
  assert.equal(r.free.pillars.find((p) => p.position === "month")!.ganji, null);
  assert.deepEqual(r.free.notices.map((n) => n.code), ["TIME_UNKNOWN", "PILLAR_UNCERTAIN", "PARTIAL_DATA"]);
});
