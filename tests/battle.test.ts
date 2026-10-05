// 친구와 배틀: 링크 인코딩/검증, 대결 규칙, 개인정보 미포함.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBetaResult } from "../src/lib/engine";
import {
  battleCardFrom,
  battleFromHash,
  battleUrl,
  buildBattleShareText,
  compareBattle,
  decodeBattle,
  encodeBattle,
  sanitizeNickname,
  withJosa,
  type BattleCard,
} from "../src/lib/battle/battle";
import { MS_PER_DAY, epochMsFromIsoUtc, formatLocalFromEpochMs } from "../src/lib/saju/civil";

const free = (d: string, t: string | null) => {
  const r = computeBetaResult({ birthDate: d, birthTime: t, gender: "female", calendar: "solar", birthCountry: "KR" });
  assert.ok(r.ok);
  if (!r.ok) throw new Error("x");
  return r.free;
};
const card = (scores: number[], nickname: string | null = null, characterId = "gyeong-challenger"): BattleCard => ({ characterId, scores, nickname });

test("링크: 인코딩 ↔ 디코딩 왕복 (한글 닉네임 포함)", () => {
  const c = battleCardFrom(free("1990-05-15", "14:20"), "보헌");
  const code = encodeBattle(c);
  assert.match(code, /^b1~gyeong-challenger~\d+(_\d+){6}~[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeBattle(code), c);
  assert.deepEqual(battleFromHash(`#b=${code}`), c);
  assert.deepEqual(battleFromHash(`#b=${encodeURIComponent(code)}`), c);
  const noNick = battleCardFrom(free("1990-05-15", "14:20"), null);
  assert.equal(encodeBattle(noNick).split("~").length, 3);
});

test("링크: 생년월일·시간·성별·간지가 들어가지 않는다", () => {
  const f = free("1990-05-15", "14:20");
  const url = battleUrl("https://example.test/", battleCardFrom(f, null));
  for (const bad of ["1990", "0515", "05-15", "1420", "14:20", "female", "경오", "경진"]) assert.ok(!url.includes(bad), bad);
  assert.ok(url.startsWith("https://example.test/#b=b1~"), "URL 조각(#)에만 담는다");
  assert.equal(battleUrl("https://x.test/#old", battleCardFrom(f, null)).split("#").length, 2, "기존 # 제거");
});

test("링크 검사: 조작·손상된 값은 거부 (배틀 없이 진행)", () => {
  const ok = "b1~gyeong-challenger~10_20_30_40_50_60_70";
  assert.ok(decodeBattle(ok));
  for (const bad of [
    "",
    "b2~gyeong-challenger~10_20_30_40_50_60_70",
    "b1~unknown-char~10_20_30_40_50_60_70",
    "b1~gyeong-challenger~10_20_30_40_50_60",
    "b1~gyeong-challenger~10_20_30_40_50_60_70_80",
    "b1~gyeong-challenger~10_20_30_40_50_60_101",
    "b1~gyeong-challenger~10_20_30_40_50_60_-1",
    "b1~gyeong-challenger~10_20_30_40_50_60_7a",
    "b1~gyeong-challenger~10_20_30_40_50_60_70~@@@",
    "b1~gyeong-challenger~10_20_30_40_50_60_70~a~b",
    `b1~gyeong-challenger~10_20_30_40_50_60_70~${"A".repeat(300)}`,
  ]) assert.equal(decodeBattle(bad), null, bad);
  assert.equal(battleFromHash("#x=1"), null);
  assert.equal(battleFromHash("#b=%E0%A4%A"), null, "깨진 퍼센트 인코딩");
});

test("닉네임: 10자 제한, 링크·태그·제어문자 제거", () => {
  assert.equal(sanitizeNickname("  보 헌  "), "보 헌");
  assert.equal(sanitizeNickname("가나다라마바사아자차카타"), "가나다라마바사아자차");
  assert.equal(sanitizeNickname("http://spam"), null);
  assert.equal(sanitizeNickname("www.spam"), null);
  assert.equal(sanitizeNickname("<b>hi</b>"), "bhi/b");
  assert.equal(sanitizeNickname("   "), null);
  assert.equal(sanitizeNickname(null), null);
  const withUrl = battleCardFrom(free("1990-05-15", "14:20"), "spam.com");
  assert.equal(withUrl.nickname, null);
});

test("대결: 라운드 승수 → 총점 → 무승부, 같은 입력은 같은 결과, 입장 바꾸면 반대", () => {
  const a = card([90, 80, 70, 60, 50, 40, 30]);
  const b = card([10, 20, 30, 40, 99, 99, 99], "민지");
  const r = compareBattle(a, b);
  assert.equal(r.myWins, 4);
  assert.equal(r.friendWins, 3);
  assert.equal(r.outcome, "win");
  assert.equal(r.decidedBy, "rounds");
  assert.equal(r.headline, "🏆 승리!");
  assert.match(r.comment, /스코어 4 : 3! 민지를 이겼어요/);
  assert.equal(compareBattle(b, a).outcome, "lose");
  assert.deepEqual(compareBattle(a, b), r);

  const t1 = card([70, 50, 50, 50, 50, 50, 50]); // 1승 1패, 총점 420 vs 410
  const t2 = card([50, 60, 50, 50, 50, 50, 50]);
  const rt = compareBattle(t1, t2);
  assert.equal(rt.myWins, rt.friendWins);
  assert.equal(rt.decidedBy, "total");
  assert.equal(rt.outcome, "win");

  const d = compareBattle(card([50, 50, 50, 50, 50, 50, 50]), card([50, 50, 50, 50, 50, 50, 50]));
  assert.equal(d.outcome, "draw");
  assert.equal(d.draws, 7);
  assert.equal(d.myBest, null);
});

test("대결: 라운드 이름은 화면 이름 (운의 흐름 → 기본 운 밸런스)", () => {
  const r = compareBattle(card([1, 1, 1, 1, 1, 1, 1]), card([2, 2, 2, 2, 2, 2, 2]));
  assert.deepEqual(r.rounds.map((x) => x.label), ["재물력", "연애력", "사업력", "직업력", "인간관계", "실행력", "기본 운 밸런스"]);
});

test("[스윕] 실제 결과의 배틀 카드는 링크로 왕복되고, 자기 자신과는 무승부", () => {
  const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
  for (let ms = epochMsFromIsoUtc("1962-01-05T00:00:00Z")!; ms < end; ms += 97 * MS_PER_DAY) {
    const date = formatLocalFromEpochMs(ms, 0).date;
    const r = computeBetaResult({ birthDate: date, birthTime: null, gender: "male", calendar: "solar", birthCountry: "KR" });
    if (!r.ok) continue;
    const c = battleCardFrom(r.free, null);
    assert.deepEqual(decodeBattle(encodeBattle(c)), c, date);
    assert.equal(compareBattle(c, c).outcome, "draw");
  }
});

test("조사: 받침에 따라 을/를, 와/과", () => {
  assert.equal(withJosa("민지", "을/를"), "민지를");
  assert.equal(withJosa("보헌", "을/를"), "보헌을");
  assert.equal(withJosa("친구", "와/과"), "친구와");
  assert.equal(withJosa("보헌", "와/과"), "보헌과");
  assert.equal(withJosa("Tom", "을/를"), "Tom을(를)");
});

test("배틀 신청 문구: 브랜드·캐릭터 포함, 점수·개인정보 미포함", () => {
  const c = battleCardFrom(free("1990-05-15", "14:20"), "보헌");
  const t = buildBattleShareText(c);
  assert.ok(t.includes("사주팔자PLAY") && t.includes("독립형 승부사") && t.includes("보헌"));
  for (const s of c.scores) assert.ok(!new RegExp(`\\b${s}\\b`).test(t), `점수 ${s} 숨김`);
  assert.ok(!/1990|14:20|female/.test(t));
});

test("전화번호: 한국 휴대폰 번호만 허용, 숫자만 남김", async () => {
  const { normalizeKoreanMobile } = await import("../src/lib/battle/battle");
  assert.equal(normalizeKoreanMobile("010-1234-5678"), "01012345678");
  assert.equal(normalizeKoreanMobile("010 1234 5678"), "01012345678");
  assert.equal(normalizeKoreanMobile("+82 10-1234-5678"), "01012345678");
  assert.equal(normalizeKoreanMobile("011-123-4567"), "0111234567");
  for (const bad of ["", "12345", "02-123-4567", "010-1234-567a", "010-12345-67890"]) assert.equal(normalizeKoreanMobile(bad), null, bad);
});

test("문자 링크: 휴대폰 문자 앱용 sms: (iOS &body, 그 외 ?body), 우리 서버 주소가 아님", async () => {
  const { buildSmsUri } = await import("../src/lib/battle/battle");
  assert.equal(buildSmsUri("01012345678", "안녕 https://x.test/#b=1", "other"), "sms:01012345678?body=%EC%95%88%EB%85%95%20https%3A%2F%2Fx.test%2F%23b%3D1");
  assert.ok(buildSmsUri("01012345678", "a", "ios").startsWith("sms:01012345678&body="));
});

test("개인정보: 전화번호는 저장·전송 코드에 쓰이지 않는다 (화면 코드 정적 검사)", async () => {
  const { readFileSync } = await import("node:fs");
  const main = readFileSync(`${process.cwd()}/web/src/main.ts`, "utf8");
  const uses = main.split("\n").filter((l) => /phone\.value|digits/.test(l));
  for (const l of uses) {
    assert.ok(!/localStorage|sessionStorage|fetch|track\(|submit\(|indexedDB|cookie/.test(l), `전화번호가 저장/전송 코드에 사용됨: ${l.trim()}`);
  }
  assert.ok(uses.some((l) => /phone\.value = ""/.test(l)), "보낸 뒤 입력칸을 지운다");
  assert.ok(/autocomplete: "off"/.test(main.split("\n").find((l) => l.includes('id: "battle-phone"')) ?? ""), "자동완성 저장 끔");
  for (const f of ["src/lib/analytics/events.ts", "src/lib/feedback/feedback.ts", "src/lib/storage/supabaseRows.ts"]) {
    assert.ok(!/phone/i.test(readFileSync(`${process.cwd()}/${f}`, "utf8").replace(/.*phone.*\/\/.*|\.\*phone\.\*/g, "")), `${f} 에 전화번호 필드 없음`);
  }
});
