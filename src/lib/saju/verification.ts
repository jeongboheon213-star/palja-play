// 검증 상태 기록. 실제로 확인한 것만 올리고, 과장하지 않는다.
//
// 단계 (낮음 → 높음)
//   not-verified        : 검증하지 않음
//   verified-internally : 서로 독립된 내부 구현끼리만 일치 확인 (외부 기준 아님)
//   verified-externally : 외부 기준(KASI 등)과 대조 완료
//   expert-reviewed     : 명리 전문가 검토 완료

export type VerificationLevel =
  | "not-verified"
  | "verified-internally"
  | "verified-externally"
  | "expert-reviewed";

export const VERIFICATION_LEVELS: readonly VerificationLevel[] = [
  "not-verified",
  "verified-internally",
  "verified-externally",
  "expert-reviewed",
];

export type VerificationItemId =
  | "dayPillar"
  | "solarTerms"
  | "monthPillarSolarTerm"
  | "yearPillar"
  | "hourPillar"
  | "historicalTimeOffsets"
  | "longitudeCorrection"
  | "jasiPolicy"
  | "tenGods"
  | "twelveStages"
  | "relations"
  | "scoring"
  | "interpretation";

export interface VerificationEntry {
  readonly level: VerificationLevel;
  readonly note: string;
}

export type VerificationStatus = Readonly<Record<VerificationItemId, VerificationEntry>>;

export const VERIFICATION_STATUS: VerificationStatus = Object.freeze({
  dayPillar: Object.freeze({
    level: "verified-internally",
    note: "1930-01-01~2026-10-04 (35,341일) 두 독립 공식(JDN 공식 / 달력 일수 세기) 간 일치만 확인 (Phase 3C 재확인). 외부 기준 대조 아님.",
  }),
  solarTerms: Object.freeze({
    level: "not-verified",
    note: "AlphaSolarTermProvider는 자체 계산(internal-alpha)이며 외부 기준과 대조하지 않았다. 정밀도(출력 단위)와 정확도는 별개다.",
  }),
  monthPillarSolarTerm: Object.freeze({
    level: "not-verified",
    note: "Phase 3C 구현: AlphaSolarTermProvider 의 절입 순간을 그대로 사용. 절입 시각은 KASI 등 외부 자료와 대조하지 않음.",
  }),
  yearPillar: Object.freeze({
    level: "not-verified",
    note: "Phase 3C 구현: 제공자의 입춘 순간 기준. 절입 시각 의존(not-verified). 미검증.",
  }),
  hourPillar: Object.freeze({
    level: "not-verified",
    note: "Phase 3C 구현: 2시간 시지 + 오서둔. 23시대 일간 기준은 자시 정책 의존. 시간대 보정·자시 정책 미검증.",
  }),
  historicalTimeOffsets: Object.freeze({
    level: "not-verified",
    note: "서머타임·표준시 변경 자료는 코드 고정값. 출처 간 불일치(1954-03-21) 미해결. Alpha 지원 범위 밖.",
  }),
  longitudeCorrection: Object.freeze({
    level: "not-verified",
    note: "Alpha 정책은 OFF. 최종 정답으로 간주하지 않음.",
  }),
  jasiPolicy: Object.freeze({
    level: "not-verified",
    note: "Alpha 정책은 midnight. 전문가 검토 전.",
  }),
  tenGods: Object.freeze({ level: "not-verified", note: "미구현." }),
  twelveStages: Object.freeze({
    level: "not-verified",
    note: "계산 필드만 두며 rule=unverified. 해석에 연결하지 않음.",
  }),
  relations: Object.freeze({ level: "not-verified", note: "미구현." }),
  scoring: Object.freeze({ level: "not-verified", note: "미구현." }),
  interpretation: Object.freeze({ level: "not-verified", note: "미구현." }),
}) as VerificationStatus;

/** 외부 검증 또는 전문가 검토를 통과한 항목이 하나라도 있는가. */
export function hasExternalVerification(status: VerificationStatus = VERIFICATION_STATUS): boolean {
  return Object.values(status).some(
    (e) => e.level === "verified-externally" || e.level === "expert-reviewed",
  );
}

/** 사용자에게 보여도 되는 표현인지 판단하는 보수적 규칙: 외부 검증 전에는 항상 false. */
export function canClaimVerified(item: VerificationItemId, status: VerificationStatus = VERIFICATION_STATUS): boolean {
  const l = status[item].level;
  return l === "verified-externally" || l === "expert-reviewed";
}
