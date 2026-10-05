# 팔자PLAY Alpha v0.1 (Phase 2)

계산/데이터/해석 계층 중 **타입·정책·검증·상품·버전**만 구현됨. 사주 계산은 아직 없음.

- `npm run check` : 타입체크 + 테스트 (`@types/node` 설치 후 `tests/node-shim.d.ts` 삭제)
- 정책 변경: `src/lib/saju/policies.ts` (자시, 경도 보정 등)
- 검증 상태: `src/lib/saju/verification.ts` (외부 검증 전에는 "검증됨" 표현 금지)
