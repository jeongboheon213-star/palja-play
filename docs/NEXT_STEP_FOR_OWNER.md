# 다음 단계: Vercel Preview에서 TEST 결제 연결

코드와 분석 데이터는 기존 GitHub `chatgpt/payment-tier-phase2` 브랜치, [Draft PR #1](https://github.com/jeongboheon213-star/palja-play/pull/1)에 저장했다. main과 운영 결제는 바꾸지 않았다.

완료한 내용: PLAY 기준 티어, 배틀 티어 표시, 직접 리포트 열기, 최초 제공 기록, 미열람 구매 취소, 구매코드 반복 시도 제한. 실제 Supabase SQL 실행과 13개 구조/권한 확인도 완료했다. 실제 Toss TEST 결제/취소와 앱 동작 확인은 아직 하지 않았다.

## 지금 직접 할 일

Vercel에 로그인 → 기존 **palja-play** 프로젝트 → **Settings → Environment Variables** 화면을 연다. 먼저 현재 변수 이름과 적용 환경을 확인한다. 비밀 값은 열거나 채팅으로 보내지 않는다.

입력은 **Preview만 선택**, 가능하면 브랜치 `chatgpt/payment-tier-phase2`로 한정한다. Production에는 적용하지 않는다.

| 이름 | Preview에 사용할 값 | 용도 |
|---|---|---|
| PALJA_PAYMENTS_MODE | test | TEST 결제만 사용 |
| PALJA_TOSS_CLIENT_KEY | 해당 테스트 상점의 결제 클라이언트 키 | 결제창 공개 키 |
| TOSS_SECRET_KEY | 위 클라이언트 키와 짝이 맞는 테스트 시크릿 키 | 서버 결제 승인 |
| SUPABASE_URL | 기존 팔자PLAY Supabase 프로젝트 URL | 기존 DB 연결 |
| SUPABASE_SECRET_KEY | 기존 프로젝트의 서버 Secret Key | 서버 전용 DB 접근 |

이미 해당 변수가 Preview에 적용되어 있으면 중복 생성하지 않고 환경을 확인한다. Secret Key는 사용자 화면에서 Vercel에 직접 입력한다. PALJA_ALLOW_LIVE_PAYMENTS나 LIVE 키는 설정하지 않는다. 기존 Production 변수는 유지한다.

토스 키 종류는 여러 가지이므로 키 화면의 상품 유형을 먼저 확인한다. 현재 SDK는 결제창 v2이며 서로 짝이 맞는 TEST 키만 사용한다. 이름/접두사만 보고 다른 상점·다른 유형의 키를 섞지 않는다.

공식 안내: [Vercel 환경 변수](https://vercel.com/docs/environment-variables), [Toss API 키](https://docs.tosspayments.com/reference/using-api/api-keys).

키 설정 후 환경 변수가 적용된 새 **Preview** 배포가 필요하다. main merge로 배포하지 않는다. Preview 주소를 받은 뒤 결제창·승인·미열람·명시적 열람·취소·구매복구·요청 제한을 실제 확인한다.

## 완료한 SQL 단계 (재실행 불필요)

1. Supabase에 로그인하고 **팔자PLAY에서 이미 사용하는 프로젝트**를 연다. 새 프로젝트를 만들지 않는다.
2. **SQL Editor → New query**에서 [phase2-apply.sql](https://github.com/jeongboheon213-star/palja-play/blob/chatgpt/payment-tier-phase2/supabase/phase2-apply.sql) 파일의 **전체 내용**을 붙여넣고 Run한다.
3. 성공하면 새 쿼리에 [phase2-verify.sql](https://github.com/jeongboheon213-star/palja-play/blob/chatgpt/payment-tier-phase2/supabase/phase2-verify.sql) 전체 내용을 붙여넣고 Run한다. 두 번째는 상태를 읽기만 한다.
4. `phase2_check` 결과 또는 오류 내용을 Codex에 전달한다. 오류가 나오면 임의로 SQL을 수정하거나 반복 실행하지 말고 오류부터 전달한다. **Secret Key는 보내지 않는다.**

확인 결과에서 `content_opened_column`, `orders_rls`, `rate_buckets_rls`, `service_open_rpc`, `service_cancel_rpc`, `service_limit_rpc`는 true여야 한다. 나머지 접근 항목은 false여야 한다.

이 SQL은 리포트 최초 제공 시각을 기록할 칸과 서버 전용 안전장치를 추가한다. 기존 주문을 삭제하거나 상품 금액을 바꾸지 않는다. 이미 완료한 orders 권한 보정을 다시 요구하는 작업이 아니다. 여러 변경을 하나로 묶어 실패하면 되돌아가며, 잠금이 오래 걸리면 중단하도록 준비했다.

## 왜 여기서 멈추는가

사용자 지시에 따라 로그인과 Secret Key 입력은 사용자가 직접 해야 한다. Supabase SQL은 완료했으며, 다음은 Vercel **Preview** TEST 키 입력이다. 운영(Production) 환경과 LIVE 설정은 바꾸지 않는다.

로그인·키 입력은 사용자 화면에서만 진행하고 채팅에 비밀 키를 붙여넣지 않는다. 실제 돈이 움직이는 LIVE 결제는 별도 명시적 승인과 출시 준비가 끝나기 전까지 켜지 않는다.
