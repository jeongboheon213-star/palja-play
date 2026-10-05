# 사주팔자PLAY 진행판

마지막 업데이트: 2026-10-05

## 현재 위치

- [x] ① orders DB 보안 보정 및 사용자 SQL 확인
- [x] ②-A Toss TEST 결제 코드·보안 1차 점검
- [x] ②-B 실제 기준분포 분석: 569,776건 (하루 간격·12시간대, 서머타임 8건 제외)
- [x] ②-C 버전이 있는 티어 모듈·동점 처리·빈도 기준 테스트
- [x] ②-D 결과 UI·배틀 티어 표시 (기존 score·승패·공유 URL 유지)
- [x] ②-E 명시적 본문 열기·최초 제공 기록·미열람 취소 코드 및 migration
- [x] ②-F DB 요청 제한·환불 잠금·TEST 관리자 예외 환불/코드 재발급 도구
- [x] ②-G 로컬 회귀: 단위 243/243, 화면 36/36, 배틀 34/34, 모의 결제 화면 7/7
- [x] 신규 migration 실제 Supabase 적용·DB 권한 확인 (사용자 Run 성공 화면 및 13개 확인 결과 대조 완료)
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
- Phase 2 최초 제공·미열람 취소·환불 잠금 코드 구현 및 실제 DB 구조/권한 적용 확인 완료. 실제 Toss TEST와 앱을 통한 DB 동작 확인은 대기.
- 구매코드 본문/취소 요청에 DB 기반 rate limit을 구현함. 실제 Supabase 적용 전에는 실패 시 본문을 차단함.

## 안전 원칙

- main에는 검증 전 직접 반영하지 않는다.
- LIVE 결제는 사용자가 명시적으로 “실제 결제를 활성화해”라고 승인하기 전까지 켜지 않는다.
- 티어는 “대한민국 상위 X%”가 아니라 “사주팔자PLAY 기준 상위 X%”로만 표현한다.
- 환불은 임의 3분 법적 제한이 아니라 콘텐츠 제공 시작 여부를 서버에 기록하는 구조를 우선 검토한다.


## 최근 진행

- 5일 간격 표본의 60일 주기 편향을 발견해 하루 간격·12시간대로 확장하고 실제 실행함. 저장 결과: `tier-distribution.json`, 설계: `TIER_DESIGN.md`.
- 종합점수 경계: S+ 79 / S 76 / A+ 72 / A 67 / B+ 62 / B 55 / C 그 아래. 동점 포함 상위 비율로 계산한다.
- content_opened_at, 환불 잠금·제한 RPC의 실제 Supabase 적용을 사용자 Run 및 읽기 전용 결과로 확인함. 근거: `phase2-supabase-verification.json`. 실제 결제/열람/환불/제한 횟수 동작을 검사한 것은 아님.
- 코드 커밋 `17a24c4`의 [GitHub Actions #4](https://github.com/jeongboheon213-star/palja-play/actions/runs/37287376822) 성공 확인. Linux/Node 22 타입·243개 테스트·분포 재현 검사와 독립 PostgreSQL 16 migration/동시성/권한/제한 검사가 모두 통과함. 실제 Supabase 검증으로 대신하지 않는다.
- 전체 분포를 다시 실행해 JSON 전체가 저장 결과와 동일함을 실제 확인했고, 실행용 기준표 일치 검사도 통과함.
- 실제 실행 목록·수정한 테스트의 이유: `PHASE2_QA.md`. 구현·운영 한계: `PREMIUM_ACCESS_IMPLEMENTATION.md`.
- 새 npm 패키지 추가 없음. main merge·Production 배포·LIVE 활성화 없음.

## 바로 다음 사용자 단계

1. Vercel palja-play → Settings → Environment Variables 화면 열기.
2. 기존 작업 브랜치의 **Preview**에만 TEST/서버 키를 사용자 화면에서 입력. Production/LIVE 설정은 변경하지 않음.
3. Preview 재배포 후 실제 TEST 결제·열람·미열람 취소·환불·구매복구·요청 제한을 확인.

Supabase SQL 단계는 완료했으므로 다시 Run을 요청하지 않는다. 최종 안내 문서 커밋 `67fe8ce`의 [Actions #5](https://github.com/jeongboheon213-star/palja-play/actions/runs/37287921774)도 success 확인.

법률 문구·사업자 정보·실기기·웹훅과 외부 취소 동기화·정기 보관 만료 처리 등 LIVE 준비는 미완료다. LIVE는 명시적 최종 승인 전 계속 OFF다.

쉬운 사용자 안내: `NEXT_STEP_FOR_OWNER.md`. 코드·분포·검사 결과·SQL·화면 캡처는 기존 작업 브랜치와 Draft PR #1에 저장했다.
