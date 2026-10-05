// 각도 유틸 (도). 360°/0° 경계에서 단순 뺄셈을 쓰지 않는다.

/** [0, 360) 로 정규화 */
export function normalizeDegrees(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** a - b 의 원형 차이. 범위 [-180, 180). 예: (0.001, 359.999) → 0.002 */
export function circularDifferenceDeg(a: number, b: number): number {
  return normalizeDegrees(a - b + 180) - 180;
}
