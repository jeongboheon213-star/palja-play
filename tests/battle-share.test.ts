// 배틀 공유 회귀 테스트 (2026-10-05 버그: 카카오톡·링크 복사로 받은 링크가 일반 첫 화면으로 열림).
// 모든 공유 방식의 목적지 링크 = canonical battle URL 이어야 한다. 실패하면 npm run check 가 실패해 배포를 막는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import qrcode from "qrcode-generator";
import jsQR from "jsqr";
import { computeBetaResult } from "../src/lib/engine";
import { battleCardFrom, buildSmsUri, encodeBattle } from "../src/lib/battle/battle";
import {
  BATTLE_TOKEN_RE,
  battleFromLocation,
  createBattleShare,
  createBattleShareUrl,
  decodeBattleToken,
  encodeBattleToken,
  extractLinkLikeMessenger,
} from "../src/lib/battle/share";

const SITE = "https://palja-play.vercel.app/";
function card(nick: string | null = "보헌", date = "1990-05-15", time: string | null = "14:20") {
  const r = computeBetaResult({ birthDate: date, birthTime: time, gender: "female", calendar: "solar", birthCountry: "KR" });
  assert.ok(r.ok);
  if (!r.ok) throw new Error("x");
  return battleCardFrom(r.free, nick);
}

/** QR 을 실제 픽셀로 그린 뒤 디코더로 읽어 들인 문자열 */
function decodeQr(text: string): string | null {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const scale = 4;
  const margin = 4;
  const size = (n + margin * 2) * scale;
  const px = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const i = (((r + margin) * scale + y) * size + (c + margin) * scale + x) * 4;
          px[i] = px[i + 1] = px[i + 2] = 0;
        }
      }
    }
  }
  return jsQR(px, size, size)?.data ?? null;
}

test("canonical: 문자·카카오·Web Share·링크 복사·QR 의 목적지 링크가 모두 같은 canonical battle URL", () => {
  for (const nick of ["보헌", null, "행운의고양이", "QA봇"]) {
    const s = createBattleShare(card(nick), SITE);
    const canonical = createBattleShareUrl(card(nick), SITE);
    assert.equal(s.url, canonical);
    // 문자: sms: 링크 본문에서 메신저식 자동 링크 인식으로 뽑은 주소
    const sms = buildSmsUri("01012345678", s.smsBody, "other");
    const smsBody = decodeURIComponent(sms.split("body=")[1]!);
    assert.equal(extractLinkLikeMessenger(smsBody), canonical, "SMS");
    // 카카오: SDK 에 전달하는 link·버튼 link
    assert.equal(s.kakao.link.mobileWebUrl, canonical, "Kakao mobile");
    assert.equal(s.kakao.link.webUrl, canonical, "Kakao web");
    for (const b of s.kakao.buttons) assert.equal(b.link.mobileWebUrl, canonical, "Kakao button");
    // Web Share: text 안의 링크 (카카오톡 등 공유 시트 대상 앱이 받는 값)
    assert.equal(extractLinkLikeMessenger(s.webShare.text), canonical, "Web Share");
    // 링크 복사
    assert.equal(s.clipboardText, canonical, "Clipboard");
    // QR: 실제로 그린 QR 을 디코더로 읽은 값
    assert.equal(s.qrText, canonical);
    assert.equal(decodeQr(s.qrText), canonical, "QR");
  }
});

test("버그 회귀: 링크는 영문·숫자·-·_ 만 써서 메신저 자동 링크 인식에 잘리지 않는다 (~ # 없음)", () => {
  const s = createBattleShare(card(), SITE);
  const token = new URL(s.url).searchParams.get("b")!;
  assert.match(token, BATTLE_TOKEN_RE);
  assert.ok(!s.url.includes("~") && !s.url.includes("#"), s.url);
  // 예전 형식은 물결표에서 잘렸다 (재현) — 새 형식은 잘리지 않는다
  const legacy = `${SITE}#b=${encodeBattle(card())}`;
  assert.notEqual(extractLinkLikeMessenger(legacy), legacy, "예전 형식은 잘림 (버그 재현)");
  assert.equal(extractLinkLikeMessenger(`친구야 이거 해봐 ${s.url} 고고`), s.url);
  assert.equal(extractLinkLikeMessenger(`${s.text}`), s.url);
});

test("열기: 공유된 링크(query) → 배틀 초대 상태, 내용이 그대로 복원된다", () => {
  const c = card("보헌");
  const u = new URL(createBattleShareUrl(c, SITE));
  const st = battleFromLocation(u.search, u.hash);
  assert.equal(st.kind, "valid");
  if (st.kind === "valid") {
    assert.deepEqual(st.card, c);
    assert.equal(st.legacy, false);
  }
});

test("예전 형식(#b=b1~…) 링크도 계속 열린다 (이미 보낸 링크 호환)", () => {
  const c = card("보헌");
  const st = battleFromLocation("", `#b=${encodeBattle(c)}`);
  assert.equal(st.kind, "valid");
  if (st.kind === "valid") assert.equal(st.legacy, true);
});

test("잘리거나 조작된 링크는 invalid (예외 없음): 모든 길이로 잘라 보기, 점수 변조, 버전, 체크섬", () => {
  const token = encodeBattleToken(card("보헌"));
  for (let i = 0; i < token.length; i++) {
    const st = battleFromLocation(`?b=${token.slice(0, i)}`, "");
    assert.equal(st.kind === "valid", false, `잘린 길이 ${i}`);
  }
  const raw = Buffer.from(token, "base64url").toString("utf8");
  const tamper = (s: string) => Buffer.from(s, "utf8").toString("base64url");
  assert.equal(decodeBattleToken(tamper(raw.replace(/\|(\d+),/, "|100,"))), null, "점수 변조 → 체크섬 불일치");
  assert.equal(decodeBattleToken(tamper(raw.replace(/^2\|/, "3|"))), null, "버전");
  assert.equal(decodeBattleToken(tamper("2|gyeong-challenger|1,2,3|x|000000")), null, "필수 필드 누락");
  assert.equal(decodeBattleToken(tamper("2|gyeong-challenger|1,2,3,4,5,6,700||abcdef")), null, "범위 초과");
  for (const junk of ["", "%%%", "b1~x", "AAAA", "😀", "?b=", "a".repeat(500), "!@#$%^&*()"]) {
    assert.doesNotThrow(() => battleFromLocation(`?b=${junk}`, ""));
    assert.equal(battleFromLocation(`?b=${encodeURIComponent(junk)}`, "").kind === "valid", false, junk);
  }
  assert.equal(battleFromLocation("", "").kind, "none");
  assert.equal(battleFromLocation("?pay=success", "").kind, "none");
});

test("개인정보: 링크·문구·카카오 값에 생년월일·출생시간·성별·전화번호·기둥이 없다", () => {
  const s = createBattleShare(card("보헌", "1990-05-15", "14:20"), SITE);
  const all = JSON.stringify(s) + Buffer.from(new URL(s.url).searchParams.get("b")!, "base64url").toString("utf8");
  for (const bad of ["1990", "0515", "05-15", "14:20", "1420", "female", "gender", "birth", "경오", "신사", "경진", "계미", "010"]) assert.ok(!all.includes(bad), bad);
});

test("기준 주소: 현재 주소의 ?pay=… 나 #… 를 버리고 같은 링크를 만든다", () => {
  const c = card();
  const a = createBattleShareUrl(c, "https://palja-play.vercel.app/");
  assert.equal(createBattleShareUrl(c, "https://palja-play.vercel.app/?pay=success&orderId=x#b=old"), a);
  assert.equal(createBattleShareUrl(c, "https://palja-play.vercel.app/?b=someone-else"), a);
});

test("아키텍처: 화면 코드는 배틀 주소를 직접 만들지 않고 createBattleShare() 만 쓴다", () => {
  const dir = `${process.cwd()}/web/src`;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    const t = readFileSync(`${dir}/${f}`, "utf8");
    assert.ok(!/battleUrl\(|encodeBattle\(|encodeBattleToken\(|createBattleShareUrl\(/.test(t), `${f}: 배틀 주소를 직접 만듦`);
    assert.ok(!/["'`]#b=|\?b=\$\{|[?&]b=["'`]/.test(t), `${f}: 배틀 주소 문자열을 직접 조립`);
  }
  const main = readFileSync(`${dir}/main.ts`, "utf8");
  assert.ok(/createBattleShare\(/.test(main));
  // 공유 버튼들은 share() 하나로 링크를 얻는다
  for (const sink of ["s.smsBody", "s.webShare", "share().webShare", "s.clipboardText", "s.qrText"]) assert.ok(main.includes(sink), sink);
});
