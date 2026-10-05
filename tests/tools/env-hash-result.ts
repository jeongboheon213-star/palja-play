// 환경(TZ, locale)이 달라도 Beta 결과(FREE + PREMIUM 미리보기)가 같은지 비교하는 해시 도구 (테스트 파일이 아니다).
// 사용: TZ=UTC npx tsx tests/tools/env-hash-result.ts
import { computeBetaResult } from "../../src/lib/engine";
import { MS_PER_DAY, epochMsFromIsoUtc, formatLocalFromEpochMs } from "../../src/lib/saju/civil";

let h = 0x811c9dc5;
let n = 0;
const feed = (s: string) => {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  n++;
};
const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
for (let ms = epochMsFromIsoUtc("1962-01-01T00:00:00Z")!; ms < end; ms += 7 * MS_PER_DAY) {
  const date = formatLocalFromEpochMs(ms, 0).date;
  for (const [time, gender] of [["00:10", "male"], ["11:59", "female"], ["23:30", "male"], [null, "female"]] as const) {
    const r = computeBetaResult({ birthDate: date, birthTime: time, gender, calendar: "solar", birthCountry: "KR" });
    feed(JSON.stringify(r.ok ? { free: r.free, premium: r.premium } : r));
  }
}
console.log(`cases=${n} hash=${h.toString(16)}`);
