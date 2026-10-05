# 사주팔자PLAY 진행판

마지막 업데이트: 2026-10-05

## 현재 위치

- [x] ① orders DB 보안 보정 및 사용자 SQL 확인
- [x] ②-A Toss TEST 결제 코드·보안 1차 점검
- [ ] ②-B 티어 기준분포 분석 (분석기 작성 완료, 실행 결과 검증 대기)
- [ ] ②-C 티어 계산 엔진
- [ ] ②-D 티어 결과 UI·배틀 표시
- [ ] ②-E 콘텐츠 열람 상태·환불 정책 구현 (정책 설계 + DB migration 준비 완료, API 구현 대기)
- [ ] ②-F 구매복구·환불 악용 방지
- [ ] ②-G 전체 회귀 테스트
- [ ] ③ Toss TEST 키 연결 (사용자 작업 필요)
- [ ] ④ 실제 Toss TEST 결제
- [ ] ⑤ 운영 환불·구매복구 완성
- [ ] ⑥ 계약/심사 준비
- [ ] ⑦ LIVE 결제 (명시적 사용자 승인 전 잠금)

## ②-A 점검 결과

- main 기준 커밋: 2e03a7d8ae67e0e210befdbbf5aa27c665fb87ad
- 서버 상품 가격: Premium 3종 모두 2,900원.
- 브라우저가 보낸 amount를 주문 가격으로 신뢰하지 않음.
- successUrl만으로 Premium을 열지 않으며 서버 Toss confirm 후 PAID가 필요.
- 중복 confirm은 주문 상태 잠금 + Toss Idempotency-Key로 방어.
- PAID 주문을 failUrl로 FAILED/CANCELLED로 덮어쓰지 않음.
- TEST/LIVE 키 모드 검사 및 LIVE 이중 잠금 존재.
- Supabase Secret/Toss Secret은 서버 전용 구조.
- 환불 API 로직은 있으나 현재는 단순 PAID→REFUNDED이며, 콘텐츠 최초 열람 상태와 고객용 환불 정책은 아직 구현 전.
- 구매 코드 복구에는 rate limit이 아직 없어 LIVE 전 보완 필요.

## 안전 원칙

- main에는 검증 전 직접 반영하지 않는다.
- LIVE 결제는 사용자가 명시적으로 “실제 결제를 활성화해”라고 승인하기 전까지 켜지 않는다.
- 티어는 “대한민국 상위 X%”가 아니라 “사주팔자PLAY 기준 상위 X%”로만 표현한다.
- 환불은 임의 3분 법적 제한이 아니라 콘텐츠 제공 시작 여부를 서버에 기록하는 구조를 우선 검토한다.


## 최근 진행

- 티어 분포 분석기와 PR 검증 workflow를 작업 브랜치에 추가함.
- Draft PR #1 생성. GitHub Actions 실행 기록은 아직 없어 분포 숫자는 미검증 상태로 유지함.
- Premium 최초 제공 시각 content_opened_at 컬럼 migration을 준비함. 아직 사용자 DB에는 실행하지 않음.
- 환불 악용 방지 설계를 docs/REFUND_ACCESS_DESIGN.md에 기록함.
