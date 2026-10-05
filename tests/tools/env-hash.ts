// 환경(TZ, locale, 현재 시각)이 달라도 정규화 결과가 같은지 비교하기 위한 해시 출력 도구.
// 사용: TZ=UTC tsx tests/tools/env-hash.ts  (테스트 파일이 아니다)
import { readFileSync } from "node:fs";
import { createKrTimeNormalizer } from "../../src/lib/saju/timeNormalizer";
import { KR_TIME_HISTORY } from "../../src/data/saju/kr-time-history";
import { ALPHA_POLICY, withLongitudeCorrection } from "../../src/lib/saju/policies";

const N = createKrTimeNormalizer(KR_TIME_HISTORY);
const fx = JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/kr-time-zoneinfo-crosscheck.json`, "utf8")) as { rows: [string, string, string[]][] };

let h = 0x811c9dc5;
let n = 0;
const feed = (s: string) => {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  n++;
};
for (const p of [ALPHA_POLICY, withLongitudeCorrection(ALPHA_POLICY, true)]) {
  for (const [w] of fx.rows) {
    if (w < "1961-08-11T00:00") continue;
    const [d, t] = w.split("T") as [string, string];
    for (const time of [t, null]) {
      for (const o of [{}, { overlapChoice: "earlier" as const }, { overlapChoice: "later" as const }]) {
        feed(JSON.stringify(N.normalize({ birthDate: d, birthTime: time, gender: "male", calendar: "solar", birthCountry: "KR" }, p, o)));
      }
    }
  }
}
console.log(`cases=${n} hash=${h.toString(16)}`);
