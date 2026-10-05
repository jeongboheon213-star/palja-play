// 공유 문구·공유 카드 데이터. 생년월일·출생 시각·성별·기둥(간지)을 넣지 않는다.

import type { FreeReading } from "../interpretation/free";

export interface ShareConfig {
  /** Production 배포 후 공개 URL. 없으면 링크 없이 공유 */
  readonly publicUrl: string | null;
}

export interface ShareCardData {
  readonly brand: "팔자PLAY";
  readonly emoji: string;
  readonly characterName: string;
  readonly tagline: string;
  /** 7개 능력치 중 상위 3개 (같으면 원래 순서) */
  readonly topStats: readonly { readonly label: string; readonly value: number }[];
  readonly keywords: readonly string[];
}

/** 화면용 능력치 이름 (내부 키는 그대로). 운의 흐름은 올해 운세로 오해하지 않도록 바꿔 부른다. */
export function displayStatLabel(stat: string, label: string): string {
  return stat === "flow" ? "기본 운 밸런스" : label;
}

export function shareCardData(r: FreeReading): ShareCardData {
  const top = r.scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.value - a.s.value || a.i - b.i)
    .slice(0, 3)
    .map(({ s }) => Object.freeze({ label: displayStatLabel(s.stat, s.label), value: s.value }));
  return Object.freeze({
    brand: "팔자PLAY",
    emoji: r.character.emoji,
    characterName: r.character.name,
    tagline: r.character.tagline,
    topStats: Object.freeze(top),
    keywords: Object.freeze(r.keywords.slice(0, 3).map((k) => k.text)),
  });
}

export function buildShareText(r: FreeReading, cfg: ShareConfig): string {
  const c = shareCardData(r);
  const lines = [`내 팔자PLAY 캐릭터는`, `"${c.characterName}" ${c.emoji}`, `${c.topStats.map((s) => `${s.label} ${s.value}`).join(" · ")}`, "", "너도 한번 해봐 👀"];
  if (cfg.publicUrl) lines.push(cfg.publicUrl);
  return lines.join("\n");
}
