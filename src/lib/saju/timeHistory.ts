// 시간 이력 데이터의 형식과 검증. 데이터 자체는 src/data/saju 에 둔다.
// 구간(segment) 하나 = "이 UTC 순간부터 다음 구간 시작 전까지 적용되는 규칙".

import type { VerificationLevel } from "./verification";
import { minutesFromIsoUtc } from "./civil";

export interface TimeSegment {
  readonly id: string;
  /** 이 구간이 시작되는 UTC 순간 (YYYY-MM-DDTHH:mm:00Z) */
  readonly fromUtc: string;
  /** 표준시 오프셋(분). 서머타임 제외. */
  readonly stdOffsetMinutes: number;
  /** 서머타임으로 추가된 분 (없으면 0) */
  readonly dstSavingMinutes: number;
  readonly abbrev: string;
  readonly source: string;
  readonly verification: VerificationLevel;
  readonly note?: string;
}

export interface TimeHistory {
  readonly dataVersion: string;
  readonly region: "KR";
  /** 이력을 시계열 규칙으로 정의하는 UTC 순간. 이전 시각은 지원하지 않는다. */
  readonly coverageFromUtc: string;
  /** 마지막 구간 이후의 규칙 변경은 반영되어 있지 않다 */
  readonly coverageNote: string;
  /** historicalOffsets 정책이 꺼져 있을 때 쓰는 고정 오프셋(분) */
  readonly fixedOffsetMinutes: number;
  readonly generatedFrom: string;
  readonly segments: readonly TimeSegment[];
}

export interface ResolvedSegment {
  readonly segment: TimeSegment;
  readonly fromMin: number;
  /** 다음 구간 시작(분). 마지막 구간이면 Infinity. */
  readonly toMin: number;
  readonly totalOffsetMinutes: number;
}

/** 형식 오류가 있으면 사유 목록, 없으면 빈 배열 */
export function validateTimeHistory(h: TimeHistory): string[] {
  const problems: string[] = [];
  if (h.segments.length === 0) problems.push("segments 비어 있음");
  let prev = -Infinity;
  const ids = new Set<string>();
  for (const s of h.segments) {
    const m = minutesFromIsoUtc(s.fromUtc);
    if (m === null) problems.push(`${s.id}: fromUtc 형식 오류`);
    else {
      if (m <= prev) problems.push(`${s.id}: 시작 시각이 오름차순이 아님`);
      prev = m;
    }
    if (ids.has(s.id)) problems.push(`${s.id}: id 중복`);
    ids.add(s.id);
    if (!Number.isInteger(s.stdOffsetMinutes) || !Number.isInteger(s.dstSavingMinutes) || s.dstSavingMinutes < 0) {
      problems.push(`${s.id}: 오프셋 값 오류`);
    }
  }
  const cov = minutesFromIsoUtc(h.coverageFromUtc);
  const first = h.segments[0];
  if (cov === null) problems.push("coverageFromUtc 형식 오류");
  else if (first && minutesFromIsoUtc(first.fromUtc) !== cov) problems.push("coverageFromUtc 가 첫 구간 시작과 다름");
  return problems;
}

export function resolveSegments(h: TimeHistory): readonly ResolvedSegment[] {
  const problems = validateTimeHistory(h);
  if (problems.length > 0) throw new Error(`시간 이력 데이터 오류: ${problems.join("; ")}`);
  return h.segments.map((segment, i) => {
    const next = h.segments[i + 1];
    return {
      segment,
      fromMin: minutesFromIsoUtc(segment.fromUtc) as number,
      toMin: next ? (minutesFromIsoUtc(next.fromUtc) as number) : Infinity,
      totalOffsetMinutes: segment.stdOffsetMinutes + segment.dstSavingMinutes,
    };
  });
}
