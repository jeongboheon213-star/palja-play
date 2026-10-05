# 다음 단계: Supabase에 준비한 기능 연결

코드와 분석 데이터는 기존 GitHub `chatgpt/payment-tier-phase2` 브랜치, [Draft PR #1](https://github.com/jeongboheon213-star/palja-play/pull/1)에 저장했다. main과 운영 결제는 바꾸지 않았다.

완료한 내용: PLAY 기준 티어, 배틀 티어 표시, 직접 리포트 열기, 최초 제공 기록, 미열람 구매 취소, 구매코드 반복 시도 제한. 실제 Toss TEST 결제/취소와 실제 Supabase 적용은 아직 하지 않았다.

## 지금 직접 할 일

1. Supabase에 로그인하고 **팔자PLAY에서 이미 사용하는 프로젝트**를 연다. 새 프로젝트를 만들지 않는다.
2. **SQL Editor → New query**에서 [phase2-apply.sql](https://github.com/jeongboheon213-star/palja-play/blob/chatgpt/payment-tier-phase2/supabase/phase2-apply.sql) 파일의 **전체 내용**을 붙여넣고 Run한다.
3. 성공하면 새 쿼리에 [phase2-verify.sql](https://github.com/jeongboheon213-star/palja-play/blob/chatgpt/payment-tier-phase2/supabase/phase2-verify.sql) 전체 내용을 붙여넣고 Run한다. 두 번째는 상태를 읽기만 한다.
4. `phase2_check` 결과 또는 오류 내용을 Codex에 전달한다. 오류가 나오면 임의로 SQL을 수정하거나 반복 실행하지 말고 오류부터 전달한다. **Secret Key는 보내지 않는다.**

확인 결과에서 `content_opened_column`, `orders_rls`, `rate_buckets_rls`, `service_open_rpc`, `service_cancel_rpc`, `service_limit_rpc`는 true여야 한다. 나머지 접근 항목은 false여야 한다.

이 SQL은 리포트 최초 제공 시각을 기록할 칸과 서버 전용 안전장치를 추가한다. 기존 주문을 삭제하거나 상품 금액을 바꾸지 않는다. 이미 완료한 orders 권한 보정을 다시 요구하는 작업이 아니다. 여러 변경을 하나로 묶어 실패하면 되돌아가며, 잠금이 오래 걸리면 중단하도록 준비했다.

## 왜 여기서 멈추는가

사용자 지시에 따라 실제 Supabase의 Run은 사용자가 직접 해야 한다. 아직 DB에 새 기능이 없어서 코드만으로 실제 결제·열람·취소를 검증할 수 없다. 먼저 위 두 쿼리의 결과를 확인한 뒤 Vercel **Preview**에 TEST 키를 직접 입력하는 단계로 이어간다. 운영(Production) 환경과 LIVE 설정은 바꾸지 않는다.

로그인·키 입력은 사용자 화면에서만 진행하고 채팅에 비밀 키를 붙여넣지 않는다. 실제 돈이 움직이는 LIVE 결제는 별도 명시적 승인과 출시 준비가 끝나기 전까지 켜지 않는다.
