// 한국 시간 이력 (고정 데이터). 런타임에 OS 시간대 데이터를 읽지 않는다.
//
// 출처: IANA tz database, Asia/Seoul. 이 파일은 개발 시점에 시스템 tzdata(2026c)와
//       1961-01-01~2030-12-31 구간을 15분 간격으로 대조해 작성했다 (단일 출처, 외부 2차 대조 없음).
// 검증 상태: 모든 구간 not-verified.
// 범위 밖: 1961-08-10 이전(UTC+8:30 등)은 포함하지 않는다. 확장하려면 앞에 구간을 추가한다.
//         1954-03-21 전환 시각은 출처 간 30분 불일치가 있어 확장 전 해결해야 한다.

import type { TimeHistory } from "../../lib/saju/timeHistory";

const SOURCE = "IANA tzdata Asia/Seoul (dev-time snapshot 2026c)";

export const KR_TIME_HISTORY: TimeHistory = Object.freeze({
  dataVersion: "kr-time-history-0.1",
  region: "KR",
  coverageFromUtc: "1961-08-09T15:30:00Z",
  coverageNote: "마지막 구간 이후 규칙 변경(향후 서머타임 도입 등)은 반영되어 있지 않다.",
  fixedOffsetMinutes: 540,
  generatedFrom: SOURCE,
  segments: Object.freeze([
    {
      id: "kst-1961-08-10",
      fromUtc: "1961-08-09T15:30:00Z",
      stdOffsetMinutes: 540,
      dstSavingMinutes: 0,
      abbrev: "KST",
      source: SOURCE,
      verification: "not-verified",
      note: "1961-08-10 00:00(구 UTC+8:30)부터 UTC+9",
    },
    { id: "kdt-1987", fromUtc: "1987-05-09T17:00:00Z", stdOffsetMinutes: 540, dstSavingMinutes: 60, abbrev: "KDT", source: SOURCE, verification: "not-verified", note: "1987-05-10 02:00 KST 시작" },
    { id: "kst-1987-10", fromUtc: "1987-10-10T17:00:00Z", stdOffsetMinutes: 540, dstSavingMinutes: 0, abbrev: "KST", source: SOURCE, verification: "not-verified", note: "1987-10-11 03:00 KDT 종료" },
    { id: "kdt-1988", fromUtc: "1988-05-07T17:00:00Z", stdOffsetMinutes: 540, dstSavingMinutes: 60, abbrev: "KDT", source: SOURCE, verification: "not-verified", note: "1988-05-08 02:00 KST 시작" },
    { id: "kst-1988-10", fromUtc: "1988-10-08T17:00:00Z", stdOffsetMinutes: 540, dstSavingMinutes: 0, abbrev: "KST", source: SOURCE, verification: "not-verified", note: "1988-10-09 03:00 KDT 종료" },
  ]),
}) as TimeHistory;
