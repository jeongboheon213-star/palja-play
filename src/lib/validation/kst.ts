// 한국 표준시(UTC+9) 기준 오늘 날짜 계산. 시스템 시간대에 의존하지 않는 순수 함수.
// 현재 시각은 호출자가 주입한다 (이 모듈은 시계를 읽지 않는다).

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number, w: number): string {
  return String(n).padStart(w, "0");
}

/** epoch 밀리초 → KST 기준 YYYY-MM-DD */
export function kstDateFromEpochMs(epochMs: number): string {
  const d = new Date(epochMs + KST_OFFSET_MS);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`;
}
