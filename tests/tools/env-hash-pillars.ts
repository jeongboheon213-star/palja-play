// 환경(TZ, locale)이 달라도 네 기둥 결과가 같은지 비교하는 해시 도구 (테스트 파일이 아니다).
// 사용: TZ=UTC npx tsx tests/tools/env-hash-pillars.ts  /  TZ=America/New_York ...
import { computeFourPillars } from "../../src/lib/engine";
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
const start = epochMsFromIsoUtc("1962-01-01T00:00:00Z")!;
const end = epochMsFromIsoUtc("2026-10-01T00:00:00Z")!;
for (let ms = start; ms < end; ms += 3 * MS_PER_DAY) {
  const date = formatLocalFromEpochMs(ms, 0).date;
  for (const time of ["00:10", "05:40", "11:59", "17:25", "23:30", null]) {
    feed(JSON.stringify(computeFourPillars({ birthDate: date, birthTime: time, gender: "male", calendar: "solar", birthCountry: "KR" })));
  }
}
console.log(`cases=${n} hash=${h.toString(16)}`);
