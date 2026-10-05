// 입력 오류 코드와 사용자용 메시지. 불안을 키우는 표현은 쓰지 않는다.

export type ValidationErrorCode =
  | "INPUT_NOT_OBJECT"
  | "DATE_REQUIRED"
  | "DATE_FORMAT"
  | "DATE_NOT_EXIST"
  | "DATE_BEFORE_SUPPORTED"
  | "DATE_IN_FUTURE"
  | "TIME_FIELD_MISSING"
  | "TIME_FORMAT"
  | "TIME_OUT_OF_RANGE"
  | "GENDER_INVALID"
  | "CALENDAR_UNSUPPORTED"
  | "COUNTRY_UNSUPPORTED";

export const VALIDATION_MESSAGES: Readonly<Record<ValidationErrorCode, string>> = {
  INPUT_NOT_OBJECT: "입력 형식이 올바르지 않아요.",
  DATE_REQUIRED: "생년월일을 입력해 주세요.",
  DATE_FORMAT: "생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.",
  DATE_NOT_EXIST: "달력에 없는 날짜예요. 다시 확인해 주세요.",
  DATE_BEFORE_SUPPORTED: "지금은 1962년 1월 1일 이후 출생만 지원해요.",
  DATE_IN_FUTURE: "오늘 이후의 날짜는 입력할 수 없어요.",
  TIME_FIELD_MISSING: "태어난 시간을 입력하거나 '모름'을 선택해 주세요.",
  TIME_FORMAT: "태어난 시간은 HH:mm 형식(예: 07:30)으로 입력해 주세요.",
  TIME_OUT_OF_RANGE: "태어난 시간은 00:00~23:59 사이로 입력해 주세요.",
  GENDER_INVALID: "성별을 선택해 주세요.",
  CALENDAR_UNSUPPORTED: "지금은 양력만 지원해요. 음력은 준비 중이에요.",
  COUNTRY_UNSUPPORTED: "지금은 한국 출생만 지원해요.",
};
