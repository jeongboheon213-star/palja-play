// 입력 검증. 추측·자동 보정을 하지 않는다. 문제가 있으면 모두 모아서 돌려준다.

import { ALPHA_POLICY, type Policy } from "../saju/policies";
import type { SajuInput } from "../saju/types";
import { ISO_DATE_RE, TIME_RE, TIME_SHAPE_RE, compareIsoDate, parseIsoDate } from "../saju/isoDate";
import { VALIDATION_MESSAGES, type ValidationErrorCode } from "./messages";

export type ValidationField = "input" | "birthDate" | "birthTime" | "gender" | "calendar" | "birthCountry";

export interface ValidationError {
  readonly field: ValidationField;
  readonly code: ValidationErrorCode;
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly value: SajuInput }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

export interface ValidateOptions {
  readonly policy?: Policy;
  /** KST 기준 오늘(YYYY-MM-DD). 주어지면 미래 날짜를 거부한다. 시계는 읽지 않는다. */
  readonly todayKst?: string;
}

function err(field: ValidationField, code: ValidationErrorCode): ValidationError {
  return { field, code, message: VALIDATION_MESSAGES[code] };
}

export function validateSajuInput(raw: unknown, options: ValidateOptions = {}): ValidationResult {
  const policy = options.policy ?? ALPHA_POLICY;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: [err("input", "INPUT_NOT_OBJECT")] };
  }
  const r = raw as Record<string, unknown>;
  const errors: ValidationError[] = [];

  // 생년월일
  const d = r["birthDate"];
  let birthDate = "";
  if (d === undefined || d === null || d === "") {
    errors.push(err("birthDate", "DATE_REQUIRED"));
  } else if (typeof d !== "string" || !ISO_DATE_RE.test(d)) {
    errors.push(err("birthDate", "DATE_FORMAT"));
  } else if (parseIsoDate(d) === null) {
    errors.push(err("birthDate", "DATE_NOT_EXIST"));
  } else if (compareIsoDate(d, policy.calendar.minSupportedDate) < 0) {
    errors.push(err("birthDate", "DATE_BEFORE_SUPPORTED"));
  } else if (options.todayKst !== undefined && compareIsoDate(d, options.todayKst) > 0) {
    errors.push(err("birthDate", "DATE_IN_FUTURE"));
  } else {
    birthDate = d;
  }

  // 시간: 키가 없으면 오류, null이면 "모름". 빈 문자열 등은 추측하지 않고 오류.
  let birthTime: string | null = null;
  if (!("birthTime" in r) || r["birthTime"] === undefined) {
    errors.push(err("birthTime", "TIME_FIELD_MISSING"));
  } else if (r["birthTime"] !== null) {
    const t = r["birthTime"];
    if (typeof t !== "string" || !TIME_SHAPE_RE.test(t)) {
      errors.push(err("birthTime", "TIME_FORMAT"));
    } else if (!TIME_RE.test(t)) {
      errors.push(err("birthTime", "TIME_OUT_OF_RANGE"));
    } else {
      birthTime = t;
    }
  }

  // 성별
  const g = r["gender"];
  if (g !== "male" && g !== "female") errors.push(err("gender", "GENDER_INVALID"));

  // 달력 / 국가: 명시적으로 요구, 변환하지 않음
  if (r["calendar"] !== "solar" || !policy.calendar.supportedCalendars.includes("solar")) {
    errors.push(err("calendar", "CALENDAR_UNSUPPORTED"));
  }
  if (r["birthCountry"] !== "KR" || !policy.calendar.supportedCountries.includes("KR")) {
    errors.push(err("birthCountry", "COUNTRY_UNSUPPORTED"));
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: Object.freeze({
      birthDate,
      birthTime,
      gender: g as "male" | "female",
      calendar: "solar" as const,
      birthCountry: "KR" as const,
    }),
  };
}
