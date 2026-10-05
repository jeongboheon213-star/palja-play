// 환경(TZ, locale, 현재 시각)과 무관하게 절기 결과가 같은지 비교하는 해시 도구 (테스트 파일 아님).
import { createAlphaSolarTermProvider } from "../../src/lib/saju/alphaSolarTermProvider";
import { ALPHA_POLICY } from "../../src/lib/saju/policies";

const P = createAlphaSolarTermProvider({ boundaryWarning: ALPHA_POLICY.solarTerm.boundaryWarning });
let h = 0x811c9dc5;
let n = 0;
const feed = (s: string) => {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  n++;
};
const start = Date.UTC(1962, 0, 1);
for (let i = 0; i < 3000; i++) {
  const q = start + i * 1_071_654_321 / 3 | 0;
  feed(JSON.stringify(P.locate(q)));
  feed(JSON.stringify(P.getSolarTerm(new Date(q))));
}
for (let y = 1962; y < 2030; y++) feed(JSON.stringify(P.termsInRange(Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1))));
console.log(`cases=${n} hash=${h.toString(16)}`);
