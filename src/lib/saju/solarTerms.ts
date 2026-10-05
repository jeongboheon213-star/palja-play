// 24절기 정의. 절기 이름/황경은 이 파일 한 곳에서만 관리한다.
// 순서(order)는 입춘(315°)부터 대한(300°)까지의 전통 나열 순서.

export type SolarTermKind = "jeol" | "junggi";

export interface SolarTermDefinition {
  readonly id: string;
  readonly nameKo: string;
  /** 목표 태양 황경 (도) */
  readonly targetLongitude: number;
  /** 1..24, 입춘=1 */
  readonly order: number;
  /** 절(節): 12개, 중기(中氣): 12개 */
  readonly kind: SolarTermKind;
  /**
   * 향후 월주 경계로 쓰일 후보(절). Phase 3B에서는 월주를 계산하지 않으며,
   * 이 값은 구조상의 구분일 뿐 월주 규칙이 검증되었다는 뜻이 아니다.
   */
  readonly monthBoundaryCandidate: boolean;
  /** 향후 연주 경계 후보(입춘) */
  readonly yearBoundaryCandidate: boolean;
}

const RAW: readonly (readonly [string, string, number, SolarTermKind])[] = [
  ["ipchun", "입춘", 315, "jeol"],
  ["usu", "우수", 330, "junggi"],
  ["gyeongchip", "경칩", 345, "jeol"],
  ["chunbun", "춘분", 0, "junggi"],
  ["cheongmyeong", "청명", 15, "jeol"],
  ["gogu", "곡우", 30, "junggi"],
  ["ipha", "입하", 45, "jeol"],
  ["soman", "소만", 60, "junggi"],
  ["mangjong", "망종", 75, "jeol"],
  ["haji", "하지", 90, "junggi"],
  ["soseo", "소서", 105, "jeol"],
  ["daeseo", "대서", 120, "junggi"],
  ["ipchu", "입추", 135, "jeol"],
  ["cheoseo", "처서", 150, "junggi"],
  ["baengno", "백로", 165, "jeol"],
  ["chubun", "추분", 180, "junggi"],
  ["hanro", "한로", 195, "jeol"],
  ["sanggang", "상강", 210, "junggi"],
  ["ipdong", "입동", 225, "jeol"],
  ["soseol", "소설", 240, "junggi"],
  ["daeseol", "대설", 255, "jeol"],
  ["dongji", "동지", 270, "junggi"],
  ["sohan", "소한", 285, "jeol"],
  ["daehan", "대한", 300, "junggi"],
];

export const SOLAR_TERMS: readonly SolarTermDefinition[] = Object.freeze(
  RAW.map(([id, nameKo, targetLongitude, kind], i) =>
    Object.freeze({
      id,
      nameKo,
      targetLongitude,
      order: i + 1,
      kind,
      monthBoundaryCandidate: kind === "jeol",
      yearBoundaryCandidate: id === "ipchun",
    }),
  ),
);

export const SOLAR_TERM_COUNT = 24;
/** 입춘 황경. order 1 의 목표 황경 */
export const CYCLE_START_LONGITUDE = 315;

export function getSolarTermById(id: string): SolarTermDefinition | undefined {
  return SOLAR_TERMS.find((t) => t.id === id);
}

/** 0-based 위치 (입춘=0). 순환한다. */
export function termAt(index: number): SolarTermDefinition {
  return SOLAR_TERMS[((index % SOLAR_TERM_COUNT) + SOLAR_TERM_COUNT) % SOLAR_TERM_COUNT] as SolarTermDefinition;
}

/** 황경이 속한 절기 구간의 0-based 위치: 목표 황경 <= lon < 다음 절기 목표 황경 */
export function termIndexForLongitude(lonDeg: number): number {
  const p = (((lonDeg - CYCLE_START_LONGITUDE) % 360) + 360) % 360;
  return Math.min(SOLAR_TERM_COUNT - 1, Math.floor(p / 15));
}
