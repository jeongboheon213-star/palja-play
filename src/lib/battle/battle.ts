// 친구와 배틀: 공유 링크에 "배틀 카드"(캐릭터 + 7개 능력치 + 선택 닉네임)를 담고,
// 링크를 받은 친구가 자기 결과를 만들면 7개 능력치를 라운드별로 비교한다.
//
// 개인정보: 링크에는 생년월일·출생 시각·성별·기둥(간지)을 넣지 않는다.
// 점수는 서비스 지표이며 배틀은 재미용이다. 같은 두 카드면 항상 같은 결과(난수 없음).
// 링크 값은 누구나 고칠 수 있으므로(조작 가능) 받은 값은 엄격히 검사하고, 실패하면 배틀 없이 진행한다.

import { CHARACTERS, type CharacterCopy } from "../interpretation/copy/characters";
import type { FreeReading } from "../interpretation/free";
import { STAT_KEYS, STAT_LABELS, type StatKey } from "../interpretation/types";
import { displayStatLabel } from "../share/share";

export const BATTLE_VERSION = "b1" as const;
export const NICKNAME_MAX = 10;
const HASH_KEY = "b";

export interface BattleCard {
  readonly characterId: string;
  /** STAT_KEYS 순서의 7개 점수 (0~100 정수) */
  readonly scores: readonly number[];
  readonly nickname: string | null;
}

const CHARACTER_BY_ID: ReadonlyMap<string, CharacterCopy> = new Map(Object.values(CHARACTERS).map((c) => [c.id, c]));

export function characterById(id: string): CharacterCopy | null {
  return CHARACTER_BY_ID.get(id) ?? null;
}

/** 닉네임 정리: 공백 정리, 제어문자·링크 제거, 최대 10자. 비면 null */
export function sanitizeNickname(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // | 는 배틀 토큰 구분자라서 제거한다
  const s = Array.from(raw.replace(/[\u0000-\u001f\u007f<>|]/g, "").replace(/\s+/g, " ").trim()).slice(0, NICKNAME_MAX).join("");
  if (s.length === 0) return null;
  if (/https?:|www\.|:\/\/|\.(com|net|kr|io|co)\b/i.test(s)) return null;
  return s;
}

export function battleCardFrom(r: FreeReading, nickname: string | null): BattleCard {
  return Object.freeze({
    characterId: r.character.id,
    scores: Object.freeze(STAT_KEYS.map((k) => r.scores.find((s) => s.stat === k)!.value)),
    nickname: sanitizeNickname(nickname),
  });
}

// ── 링크 인코딩 (URL 조각 #b=… 에 넣는다: 서버로 전송되지 않음) ─────────

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string | null {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

/** b1~<캐릭터 id>~<점수 7개를 _ 로 연결>[~<닉네임 base64url>] */
export function encodeBattle(card: BattleCard): string {
  const parts = [BATTLE_VERSION, card.characterId, card.scores.join("_")];
  const nick = sanitizeNickname(card.nickname);
  if (nick) parts.push(toBase64Url(nick));
  return parts.join("~");
}

export function decodeBattle(code: string | null | undefined): BattleCard | null {
  if (!code || code.length > 200) return null;
  const parts = code.split("~");
  if (parts.length < 3 || parts.length > 4 || parts[0] !== BATTLE_VERSION) return null;
  const characterId = parts[1]!;
  if (!CHARACTER_BY_ID.has(characterId)) return null;
  const nums = parts[2]!.split("_");
  if (nums.length !== STAT_KEYS.length || !nums.every((n) => /^\d{1,3}$/.test(n))) return null;
  const scores = nums.map(Number);
  if (!scores.every((n) => n >= 0 && n <= 100)) return null;
  let nickname: string | null = null;
  if (parts[3] !== undefined) {
    const raw = fromBase64Url(parts[3]);
    if (raw === null) return null;
    nickname = sanitizeNickname(raw);
  }
  return Object.freeze({ characterId, scores: Object.freeze(scores), nickname });
}

/** 공유 URL: base 의 기존 # 부분은 버리고 #b=… 를 붙인다 */
export function battleUrl(base: string, card: BattleCard): string {
  return `${base.split("#")[0]}#${HASH_KEY}=${encodeBattle(card)}`;
}

/** location.hash ("#b=…") → 배틀 카드 */
export function battleFromHash(hash: string): BattleCard | null {
  const m = /^#?b=([^&]*)$/.exec(hash);
  if (!m) return null;
  let v: string;
  try {
    v = decodeURIComponent(m[1]!);
  } catch {
    return null;
  }
  return decodeBattle(v);
}

// ── 문자로 보내기 (전화번호는 저장·전송하지 않는다) ─────────────────
//
// 전화번호는 휴대폰의 문자 앱을 여는 sms: 링크에만 쓰인다.
// 우리 서버·Supabase·분석 이벤트·브라우저 저장소로 보내지 않는다 (테스트로 강제).

/** 한국 휴대폰 번호 → 숫자만 (010xxxxxxxx). 아니면 null */
export function normalizeKoreanMobile(raw: string): string | null {
  const digits = raw.replace(/[\s().-]/g, "").replace(/^\+82/, "0");
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}

/** 문자 앱 열기 링크. iOS 는 "&body=", 그 외(Android 등)는 "?body=" */
export function buildSmsUri(phoneDigits: string, body: string, platform: "ios" | "other"): string {
  return `sms:${phoneDigits}${platform === "ios" ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

// ── 조사 (을/를, 와/과) ─────────────────────────────────────────

/** 마지막 글자에 받침이 있는가. 한글이 아니면 null (조사를 "(을)를" 식으로 둘 다 표기) */
function hasBatchim(word: string): boolean | null {
  const ch = Array.from(word).pop();
  if (!ch) return null;
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return /[0-9]/.test(ch) ? [0, 1, 3, 6, 7, 8].includes(Number(ch)) : null;
  return code % 28 !== 0;
}

export function withJosa(word: string, pair: "을/를" | "와/과" | "이/가"): string {
  const [withB, withoutB] = pair === "을/를" ? ["을", "를"] : pair === "와/과" ? ["과", "와"] : ["이", "가"];
  const b = hasBatchim(word);
  return b === null ? `${word}${withB}(${withoutB})` : `${word}${b ? withB : withoutB}`;
}

// ── 대결 ───────────────────────────────────────────────────────

export type RoundWinner = "me" | "friend" | "draw";

export interface BattleRound {
  readonly stat: StatKey;
  readonly label: string;
  readonly me: number;
  readonly friend: number;
  readonly winner: RoundWinner;
}

export interface BattleResult {
  readonly rounds: readonly BattleRound[];
  readonly myWins: number;
  readonly friendWins: number;
  readonly draws: number;
  readonly myTotal: number;
  readonly friendTotal: number;
  /** 라운드 승수 → 같으면 총점 → 같으면 무승부 */
  readonly outcome: "win" | "lose" | "draw";
  readonly decidedBy: "rounds" | "total" | "tie";
  readonly headline: string;
  readonly comment: string;
  /** 내가 가장 크게 이긴 능력치 (없으면 null) */
  readonly myBest: BattleRound | null;
  /** 친구가 가장 크게 이긴 능력치 (없으면 null) */
  readonly friendBest: BattleRound | null;
}

export function compareBattle(me: BattleCard, friend: BattleCard): BattleResult {
  const rounds: BattleRound[] = STAT_KEYS.map((stat, i) => {
    const a = me.scores[i]!;
    const b = friend.scores[i]!;
    return Object.freeze({ stat, label: displayStatLabel(stat, STAT_LABELS[stat]), me: a, friend: b, winner: a > b ? "me" : a < b ? "friend" : "draw" });
  });
  const myWins = rounds.filter((r) => r.winner === "me").length;
  const friendWins = rounds.filter((r) => r.winner === "friend").length;
  const draws = rounds.length - myWins - friendWins;
  const myTotal = me.scores.reduce((a, b) => a + b, 0);
  const friendTotal = friend.scores.reduce((a, b) => a + b, 0);
  const outcome = myWins !== friendWins ? (myWins > friendWins ? "win" : "lose") : myTotal !== friendTotal ? (myTotal > friendTotal ? "win" : "lose") : "draw";
  const decidedBy = myWins !== friendWins ? "rounds" : myTotal !== friendTotal ? "total" : "tie";
  const margin = (r: BattleRound) => Math.abs(r.me - r.friend);
  const best = (w: RoundWinner) => rounds.filter((r) => r.winner === w).reduce<BattleRound | null>((acc, r) => (acc === null || margin(r) > margin(acc) ? r : acc), null);
  const myBest = best("me");
  const friendBest = best("friend");
  const fname = friend.nickname ?? "친구";
  const headline = outcome === "win" ? "🏆 승리!" : outcome === "lose" ? "😭 아쉽게 패배…" : "🤝 무승부!";
  const score = `${myWins} : ${friendWins}${draws ? ` (무 ${draws})` : ""}`;
  const comment =
    outcome === "draw"
      ? `${score}, 총점까지 같아요. 이 정도면 운명의 라이벌!`
      : decidedBy === "total"
        ? `${score} 동률이라 총점으로 갈렸어요 (${myTotal} vs ${friendTotal}).`
        : outcome === "win"
          ? `스코어 ${score}! ${withJosa(fname, "을/를")} 이겼어요.${myBest ? ` 결정타는 ${myBest.label}.` : ""}`
          : `스코어 ${score}. ${fname}에게 졌어요.${friendBest ? ` ${friendBest.label}에서 크게 밀렸어요.` : ""} 리매치로 복수해 보세요!`;
  return Object.freeze({ rounds: Object.freeze(rounds), myWins, friendWins, draws, myTotal, friendTotal, outcome, decidedBy, headline, comment, myBest, friendBest });
}

/** 배틀 신청 공유 문구. 점수는 숨겨서 궁금하게 만든다. 생년월일·시간 없음. */
export function buildBattleShareText(card: BattleCard): string {
  const c = characterById(card.characterId);
  const who = card.nickname ? `${card.nickname}의 ` : "내 ";
  return [`⚔️ 사주팔자PLAY 배틀 신청!`, `${who}캐릭터는 "${c?.name ?? "?"}" ${c?.emoji ?? ""}`.trim(), `7개 능력치로 한판 붙자. 나를 이길 수 있을까? 👀`].join("\n");
}
