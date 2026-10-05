# Verification Backlog (Track B)

Beta 출시(Track A)를 기다리게 하지 않고 배포 후 계속 진행한다. 검증되지 않은 것을 검증됐다고 표현하지 않는다.

- Solar Term formula audit (Phase 3B.1)
- Meeus source verification (현재 기억 기반 옮겨 적기, 원문 대조 없음)
- KASI comparison (NOT RUN)
- independent astronomy comparison (PyEphem 등, 설치 불가였음)
- solar-term external fixtures (`tests/fixtures/solar-term-reference.json`, 현재 비어 있음)
- boundary accuracy measurement (boundaryRisk 범위 근거 마련)
- 시간 이력 2차 출처 대조, 1954-03-21 30분 불일치
- 자시 정책/경도 보정 전문가 검토
- 12운성 규칙 검증

AlphaSolarTermProvider 는 계속 `verificationStatus: not-verified`.
- (Phase 3C) Alpha 입춘/절입 순간과 KASI 공표 시각 실제 대조. 예: Alpha 2024 입춘 KST 17:20 — 공표값과 몇 분 차이인지 실제 자료로 확인 (현재 확인 안 함)
- (Phase 3C) midnight 정책의 23시대 시주(다음 날 일간 기준 자시) 규칙 전문가 검토
- (Phase 3C) 일주 기준점(1900-01-01 갑술 / 2000-01-01 무오) 외부 만세력 대조 → 통과 시에만 verified-externally
