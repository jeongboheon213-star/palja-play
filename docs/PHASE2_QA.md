# Phase 2 실행 기록 — 2026-10-05

환경: Windows, Node 24.19.0, npm 11.17.0, Edge 154.0.4258.53. 작업 브랜치 `chatgpt/payment-tier-phase2`, Draft PR #1. main/Production 설정/실제 DB는 변경하지 않았다.

| 실제 실행 | 결과 |
|---|---|
| `npm ci` | 기존 lockfile 설치 완료, 새 패키지 추가 없음 |
| `npm run check` (변경 전) | 230/230, 타입·API 번들 검사 통과 |
| 전체 날짜·12시간대 분포 분석 | 569,776 유효, 서머타임 8건 제외 |
| 전체 분포 재실행 + JSON 전체 비교 | 저장 결과와 완전히 동일 |
| `node scripts/build-tier-reference.mjs --check` | 저장 분석과 실행용 빈도표 일치 |
| `npm run check` (변경 후) | 243/243, 타입·API 5개 최신 검사 통과 |
| `npm run build` | 결제 OFF, Production 빌드 성공(배포 아님) |
| `node scripts/e2e-payment.mjs` | 로컬 모의 API 결제 화면 7/7 |
| `npm run e2e` | 기존 화면+티어 36/36, 배틀 공유 매트릭스 34/34 |
| GitHub Actions #4, 코드 `17a24c4` | Linux/Node 22 check·기준표·전체 분포 재현 통과 |
| GitHub Actions #4 `payment-sql` | PostgreSQL 16 migration/재실행·권한·불변 시각·열기/취소 경쟁·원자적 제한 통과 |

코드 커밋 `17a24c4`의 [Actions #4](https://github.com/jeongboheon213-star/palja-play/actions/runs/37287376822) 완료·success를 실제 확인했다. 독립 DB 검사의 예상 권한 거부/불변 시각 예외도 로그에서 확인했다. 과거 PR 커밋 `84d70f7`의 성공을 이번 변경의 성공으로 대신하지 않았다.

결제 테스트는 가짜 Toss·저장소를 사용한다. 최초 제공 1회 기록, 열람 요청 여부, 저장 실패 시 본문 미반환, 재열람, 권한 취소 경쟁, 미열람 취소, 열람 주문의 관리자 예외 환불, 취소 확인 중 열람 차단, DB 저장 재시도, 부분취소·불확실 응답 차단, 코드 재발급 후 이전 코드 차단을 검사했다.

구매코드 요청 제한은 허용/429/DB 장애 시 503 차단, 코드 정규화, 네트워크 범위 해시, 신뢰하지 않는 헤더 무시, 개인정보 원문 미저장을 검사했다. 실제 DB 동시성은 별도 GitHub Actions `payment-sql`에서 **독립 PostgreSQL 16**으로 검사하며 실제 Supabase에는 연결하지 않는다.

기존 RLS 테스트는 모든 SQL의 `FOR UPDATE`를 정책 선언으로 오인했다. 정책 선언만 검사하고 **익명 INSERT 정책 정확히 2개만 허용**하는 검사를 추가해 원래 보안 요구를 유지했다. 기존 테스트를 삭제하거나 실패를 무시하지 않았다.

최초 모의 결제 브라우저 실행은 `--no-remote`가 의도적으로 결제를 OFF로 만들어 실패했다. 외부 연결을 끈 개발 빌드에서만 사용할 수 있는 `--payment-ui-test`를 추가하고 재실행해 7/7을 확인했다. Production에서 이 옵션 사용은 빌드가 거부한다.

실제 Supabase migration은 사용자가 SQL Editor에서 Run했고 성공 화면을 제공했다. 읽기 전용 phase2_check 13개가 전부 예상 값임을 확인했다(원본: `phase2-supabase-verification.json`). 실제 앱의 열람/취소/제한 횟수 동작까지 확인한 것은 아니다. 안내 문서 커밋 67fe8ce의 Actions #5도 success 확인.

NOT RUN: 실제 Toss TEST 결제/취소, Vercel Preview QA, 실제 Supabase에서 앱을 통한 최초 제공/환불/요청 제한 검증, 이번 변경의 Production QA, iPhone Safari·실제 카카오톡·문자 앱·Android Chrome 실기기. 로컬 카카오 테스트는 SDK 전달 링크 검사이며 실제 앱 전송이 아니다. LIVE는 비활성 유지한다.
