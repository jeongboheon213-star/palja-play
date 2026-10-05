// 배틀 공유의 "하나뿐인" 링크 생성기 (canonical battle URL).
//
// 모든 공유 방식(문자·카카오톡·Web Share·링크 복사·QR, 모바일·PC)은 createBattleShare() 가 돌려준
// 같은 url / text 만 쓴다. 공유 방식마다 주소를 따로 만들지 않는다 (아키텍처 테스트로 강제).
//
// 2026-10-05 버그 수정 배경
//  - 예전 링크는 "#b=b1~캐릭터~점수…" 형식이었다. 물결표(~)를 링크 문자로 보지 않는 메신저(카카오톡 등)가
//    "#b=b1" 에서 링크를 잘라, 친구가 일반 첫 화면으로 들어가는 문제가 있었다(재현 완료).
//  - 새 링크는 ?b=<토큰> 이고 토큰은 영문·숫자·-·_ 만 쓴다(base64url). 끝에 체크섬이 있어 잘리거나 손상되면 감지한다.
//  - Web Share 는 링크를 text 안에도 넣는다 (text 만 받는 앱에서도 링크가 전달되도록).
//
// 개인정보: 토큰에는 캐릭터 id, 7개 점수, (선택) 배틀 닉네임만 들어간다. 생년월일·시각·성별·전화번호·기둥 없음.

import { battleCardFrom, battleFromHash, buildBattleShareText, characterById, sanitizeNickname, type BattleCard } from "./battle";
import { STAT_KEYS } from "../interpretation/types";
import type { FreeReading } from "../interpretation/free";

export const BATTLE_TOKEN_VERSION = "2";
export const BATTLE_QUERY_KEY = "b";

/** 영문·숫자·-·_ 만 (메신저 자동 링크가 잘라내지 않는 문자) */
export const BATTLE_TOKEN_RE = /^[A-Za-z0-9_-]{8,240}$/;

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 6);
}

function toBase64Url(text: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

/** 배틀 카드 → 토큰. 내용: "2|캐릭터|점수7개|닉네임|체크섬" (UTF-8 → base64url) */
export function encodeBattleToken(card: BattleCard): string {
  const nick = sanitizeNickname(card.nickname) ?? "";
  const body = `${BATTLE_TOKEN_VERSION}|${card.characterId}|${card.scores.join(",")}|${nick}`;
  return toBase64Url(`${body}|${fnv1a(body)}`);
}

/** 토큰 → 배틀 카드. 손상·누락·범위 초과·버전 불일치·체크섬 불일치는 null (절대 예외를 던지지 않는다) */
export function decodeBattleToken(token: string | null | undefined): BattleCard | null {
  if (!token || !BATTLE_TOKEN_RE.test(token)) return null;
  const raw = fromBase64Url(token);
  if (raw === null) return null;
  const parts = raw.split("|");
  if (parts.length !== 5) return null;
  const [version, characterId, scoresText, nick, sum] = parts as [string, string, string, string, string];
  if (version !== BATTLE_TOKEN_VERSION) return null;
  if (fnv1a(`${version}|${characterId}|${scoresText}|${nick}`) !== sum) return null;
  if (!characterById(characterId)) return null;
  const nums = scoresText.split(",");
  if (nums.length !== STAT_KEYS.length || !nums.every((n) => /^\d{1,3}$/.test(n))) return null;
  const scores = nums.map(Number);
  if (!scores.every((n) => n >= 0 && n <= 100)) return null;
  if (nick !== "" && sanitizeNickname(nick) !== nick) return null;
  return Object.freeze({ characterId, scores: Object.freeze(scores), nickname: nick === "" ? null : nick });
}

/** 사이트 주소에서 query·hash 를 버린 기준 주소 (origin + pathname) */
export function siteBase(siteUrl: string): string {
  const u = new URL(siteUrl);
  return `${u.origin}${u.pathname}`;
}

/** 하나뿐인 배틀 링크 */
export function createBattleShareUrl(card: BattleCard, siteUrl: string): string {
  return `${siteBase(siteUrl)}?${BATTLE_QUERY_KEY}=${encodeBattleToken(card)}`;
}

export interface BattleShare {
  /** canonical battle URL — 모든 공유 방식이 이 값만 쓴다 */
  readonly url: string;
  readonly title: string;
  /** 링크를 마지막 줄에 포함한 공유 문구 (문자·Web Share·복사 공용) */
  readonly text: string;
  /** 문자 본문 (= text) */
  readonly smsBody: string;
  /** "배틀 링크 복사" 로 클립보드에 넣는 값 (= url, 링크만) */
  readonly clipboardText: string;
  /** QR 에 넣는 값 (= url) */
  readonly qrText: string;
  /** Web Share API 에 넘기는 값. 링크는 text 마지막 줄에 넣는다 (text 만 받는 앱이 많아서. url 필드는 일부 앱이 무시하거나 중복시킴) */
  readonly webShare: { readonly title: string; readonly text: string };
  /** 카카오 JavaScript SDK Kakao.Share.sendDefault 인자 (텍스트 템플릿, 공식 문서 필드명) */
  readonly kakao: {
    readonly objectType: "text";
    readonly text: string;
    readonly link: { readonly mobileWebUrl: string; readonly webUrl: string };
    readonly buttons: readonly { readonly title: string; readonly link: { readonly mobileWebUrl: string; readonly webUrl: string } }[];
  };
}

export function createBattleShare(card: BattleCard, siteUrl: string): BattleShare {
  const url = createBattleShareUrl(card, siteUrl);
  const message = buildBattleShareText(card);
  const text = `${message}\n${url}`;
  return Object.freeze({
    url,
    title: "사주팔자PLAY 배틀",
    text,
    smsBody: text,
    clipboardText: url,
    qrText: url,
    webShare: Object.freeze({ title: "사주팔자PLAY 배틀", text }),
    kakao: Object.freeze({
      objectType: "text" as const,
      text: message.slice(0, 200),
      link: Object.freeze({ mobileWebUrl: url, webUrl: url }),
      buttons: Object.freeze([Object.freeze({ title: "내 팔자로 도전하기", link: Object.freeze({ mobileWebUrl: url, webUrl: url }) })]),
    }),
  });
}

export function createBattleShareFromReading(r: FreeReading, nickname: string | null, siteUrl: string): BattleShare {
  return createBattleShare(battleCardFrom(r, nickname), siteUrl);
}

export type BattleLinkState = { readonly kind: "none" } | { readonly kind: "valid"; readonly card: BattleCard; readonly legacy: boolean } | { readonly kind: "invalid" };

/**
 * 현재 주소(search, hash)에서 배틀 초대 읽기.
 *  - 새 형식 ?b=<토큰>
 *  - 예전 형식 #b=b1~… (이미 보낸 링크 호환)
 * 손상된 값은 invalid (앱은 일반 화면 + 안내). 어떤 입력에도 예외를 던지지 않는다.
 */
export function battleFromLocation(search: string, hash: string): BattleLinkState {
  let q: string | null = null;
  try {
    q = new URLSearchParams(search).get(BATTLE_QUERY_KEY);
  } catch {
    q = null;
  }
  if (q !== null) {
    const card = decodeBattleToken(q);
    return card ? { kind: "valid", card, legacy: false } : { kind: "invalid" };
  }
  if (/^#b=/.test(hash)) {
    const card = battleFromHash(hash);
    return card ? { kind: "valid", card, legacy: true } : { kind: "invalid" };
  }
  return { kind: "none" };
}

/** 문자·메신저가 흔히 쓰는 자동 링크 인식(영문·숫자·일부 기호만 링크로 인정)으로 텍스트에서 링크를 뽑는다. 테스트용. */
export function extractLinkLikeMessenger(text: string): string | null {
  const m = /https?:\/\/[A-Za-z0-9\-._:\/?#=&%]+/.exec(text); // 포트 콜론 포함, 물결표(~)는 링크 문자로 보지 않는 앱 기준
  return m ? m[0].replace(/[.]+$/, "") : null;
}
