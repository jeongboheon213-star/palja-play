// 결과 화면 안내 문구. 계산 데이터의 상태 코드에 대응하는 문장만 둔다.

export type NoticeCode = "BOUNDARY_RISK" | "TIME_UNKNOWN" | "PILLAR_UNCERTAIN" | "PARTIAL_DATA";

export const NOTICE_TEXT: Readonly<Record<NoticeCode, string>> = Object.freeze({
  BOUNDARY_RISK: "출생 시각이 절기 경계와 가까워 Beta 계산 기준에 따라 일부 결과가 달라질 수 있어요.",
  TIME_UNKNOWN: "태어난 시간 없이 풀었어요. 출생 시간을 입력하면 더 세밀한 결과를 볼 수 있어요.",
  PILLAR_UNCERTAIN: "절기가 바뀌는 날이라 출생 시간 없이는 일부 기둥을 하나로 정할 수 없어요. 확정된 기둥만으로 해석했어요.",
  PARTIAL_DATA: "확정된 글자가 적어 일부 해석은 간단하게 보여 드려요. 태어난 시간을 알면 더 자세해져요.",
});

export const BETA_DISCLAIMER =
  "팔자PLAY는 전통 명리 요소를 기반으로 만든 엔터테인먼트 서비스입니다.\n" +
  "현재 Beta 기간 동안 계산 및 해석 시스템을 지속적으로 검증하고 개선하고 있습니다.";

export const SCORE_DISCLAIMER = "능력치는 사주 데이터를 재미있게 시각화한 팔자PLAY 서비스 지표예요. 전통 사주의 절대적인 측정값이 아닙니다.";
