// 한국 시간 이력 기반 TimeNormalizer.
// 규칙
//  - 이력 데이터는 주입받는다 (OS 시간대·현재 시각 사용 없음).
//  - 존재하지 않는 시각(gap)은 보정하지 않고 오류. 두 번 있는 시각(overlap)은 사용자가 고르기 전엔 오류.
//  - 시간 미상이면 시각을 만들지 않고, 날짜가 걸치는 UTC 구간만 계산한다.
//  - 자시(23:00~) 처리는 하지 않는다. effective 날짜/시각만 돌려준다.

import { MINUTES_PER_DAY, daysFromCivil, isoUtcFromMinutes, minutesFromParts, partsFromMinutes } from "./civil";
import { parseHm, parseIsoDate } from "./isoDate";
import type { Policy } from "./policies";
import type {
  AppliedSegment,
  NormalizeOptions,
  NormalizedBirthTime,
  TimeCandidate,
  TimeNormalizeResult,
  TimeNormalizer,
  TimeNoteCode,
} from "./providers";
import type { SajuInput } from "./types";
import { resolveSegments, type ResolvedSegment, type TimeHistory } from "./timeHistory";

const FIXED_SEGMENT_ID = "fixed-offset";

function fail(code: "NONEXISTENT_LOCAL_TIME" | "AMBIGUOUS_LOCAL_TIME" | "OUT_OF_COVERAGE", message: string, candidates?: readonly TimeCandidate[]): TimeNormalizeResult {
  return candidates ? { ok: false, code, message, candidates } : { ok: false, code, message };
}

export function createKrTimeNormalizer(history: TimeHistory): TimeNormalizer {
  const segs = resolveSegments(history); // 데이터 형식 오류는 생성 시점에 드러난다
  const coverageFromMin = segs[0]!.fromMin;

  function appliedFrom(r: ResolvedSegment): AppliedSegment {
    return {
      id: r.segment.id,
      abbrev: r.segment.abbrev,
      stdOffsetMinutes: r.segment.stdOffsetMinutes,
      dstSavingMinutes: r.segment.dstSavingMinutes,
      totalOffsetMinutes: r.totalOffsetMinutes,
    };
  }

  /** 경도 보정(분) = 4 * 기준경도 - 표준시 오프셋(분). 표준자오선(오프셋/4도)과 기준경도의 차이. */
  function longitudeMinutes(policy: Policy, stdOffsetMinutes: number): number {
    return policy.time.longitudeCorrection ? Math.round(4 * policy.time.referenceLongitude - stdOffsetMinutes) : 0;
  }

  /** effective 벽시계 분 → UTC 분. 표준시 오프셋(+경도 보정)만 사용한다. */
  function effectiveToUtc(eMin: number, policy: Policy): number | null {
    if (!policy.time.historicalOffsets) {
      return eMin - history.fixedOffsetMinutes - longitudeMinutes(policy, history.fixedOffsetMinutes);
    }
    for (const r of segs) {
      const u = eMin - r.segment.stdOffsetMinutes - longitudeMinutes(policy, r.segment.stdOffsetMinutes);
      if (u >= r.fromMin && u < r.toMin) return u;
    }
    return null;
  }

  function dayRange(effDate: string, policy: Policy): { startUtc: string; endUtc: string } | null {
    const d = parseIsoDate(effDate);
    if (!d) return null;
    const s = daysFromCivil(d.year, d.month, d.day) * MINUTES_PER_DAY;
    const a = effectiveToUtc(s, policy);
    const b = effectiveToUtc(s + MINUTES_PER_DAY, policy);
    if (a === null || b === null) return null;
    return { startUtc: isoUtcFromMinutes(a), endUtc: isoUtcFromMinutes(b) };
  }

  function normalize(input: SajuInput, policy: Policy, options: NormalizeOptions = {}): TimeNormalizeResult {
    const d = parseIsoDate(input.birthDate);
    if (!d) return fail("NONEXISTENT_LOCAL_TIME", "존재하지 않는 날짜입니다.");
    const historical = policy.time.historicalOffsets;
    const provenance = {
      dataVersion: history.dataVersion,
      historicalOffsets: historical,
      source: historical ? history.generatedFrom : "fixed-offset (historical offsets OFF)",
      verification: historical ? history.segments[0]!.verification : ("not-verified" as const),
    };
    const notes: TimeNoteCode[] = [];
    if (!historical) notes.push("HISTORICAL_OFFSETS_OFF");

    // ── 시간 미상 ───────────────────────────────────────────
    if (input.birthTime === null) {
      const range = dayRange(input.birthDate, policy);
      if (!range) return fail("OUT_OF_COVERAGE", "시간 이력 데이터가 다루는 범위 밖의 날짜입니다.");
      notes.push("TIME_UNKNOWN");
      const std = history.fixedOffsetMinutes; // 시간 미상: 서머타임 여부를 알 수 없으므로 표준시 기준
      return {
        ok: true,
        value: {
          timeKnown: false,
          input: { date: input.birthDate, time: null },
          instantUtc: null,
          segment: null,
          effective: { date: input.birthDate, time: null },
          effectiveDayRangeUtc: range,
          adjustments: { dstRemovedMinutes: 0, longitudeMinutes: longitudeMinutes(policy, std), effectiveOffsetMinutes: std + longitudeMinutes(policy, std) },
          provenance,
          notes,
        },
      };
    }

    // ── 시간 있음 ───────────────────────────────────────────
    const hm = parseHm(input.birthTime);
    if (!hm) return fail("NONEXISTENT_LOCAL_TIME", "존재하지 않는 시각입니다.");
    const wall = minutesFromParts(d.year, d.month, d.day, hm.hour, hm.minute);

    let chosenUtc: number;
    let applied: AppliedSegment;
    if (!historical) {
      chosenUtc = wall - history.fixedOffsetMinutes;
      applied = { id: FIXED_SEGMENT_ID, abbrev: "KST", stdOffsetMinutes: history.fixedOffsetMinutes, dstSavingMinutes: 0, totalOffsetMinutes: history.fixedOffsetMinutes };
    } else {
      const hits: { u: number; r: ResolvedSegment }[] = [];
      for (const r of segs) {
        const u = wall - r.totalOffsetMinutes;
        if (u >= r.fromMin && u < r.toMin) hits.push({ u, r });
      }
      hits.sort((a, b) => a.u - b.u);
      if (hits.length === 0) {
        if (wall - segs[0]!.totalOffsetMinutes < coverageFromMin) {
          return fail("OUT_OF_COVERAGE", "시간 이력 데이터가 다루는 범위 밖의 날짜입니다.");
        }
        return fail("NONEXISTENT_LOCAL_TIME", "서머타임 전환으로 존재하지 않는 시각입니다. 시각을 보정하지 않습니다.");
      }
      let pick = hits[0]!;
      if (hits.length > 1) {
        if (options.overlapChoice === undefined) {
          return fail(
            "AMBIGUOUS_LOCAL_TIME",
            "서머타임 종료로 같은 시각이 두 번 있습니다. 어느 쪽인지 선택이 필요합니다.",
            hits.map((h) => ({ instantUtc: isoUtcFromMinutes(h.u), segmentId: h.r.segment.id, abbrev: h.r.segment.abbrev })),
          );
        }
        pick = options.overlapChoice === "earlier" ? hits[0]! : hits[hits.length - 1]!;
        notes.push("OVERLAP_RESOLVED_BY_CHOICE");
      }
      chosenUtc = pick.u;
      applied = appliedFrom(pick.r);
    }

    const lon = longitudeMinutes(policy, applied.stdOffsetMinutes);
    const effectiveOffset = applied.stdOffsetMinutes + lon;
    const eMin = chosenUtc + effectiveOffset;
    const eff = partsFromMinutes(eMin);
    if (applied.dstSavingMinutes > 0) notes.push("DST_REMOVED");
    if (lon !== 0) notes.push("LONGITUDE_APPLIED");
    if (eff.date !== input.birthDate) notes.push("DATE_SHIFTED_BY_NORMALIZATION");

    const range = dayRange(eff.date, policy);
    if (!range) return fail("OUT_OF_COVERAGE", "시간 이력 데이터가 다루는 범위 밖의 날짜입니다.");

    return {
      ok: true,
      value: {
        timeKnown: true,
        input: { date: input.birthDate, time: input.birthTime },
        instantUtc: isoUtcFromMinutes(chosenUtc),
        segment: applied,
        effective: { date: eff.date, time: eff.time },
        effectiveDayRangeUtc: range,
        adjustments: { dstRemovedMinutes: applied.dstSavingMinutes, longitudeMinutes: lon, effectiveOffsetMinutes: effectiveOffset },
        provenance,
        notes,
      },
    };
  }

  return { normalize };
}
