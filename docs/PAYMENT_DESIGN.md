# 결제 설계 (토스페이먼츠, TEST MODE 까지)

상태: **구현 완료 / TEST 키 연결 전**. Production 은 `PALJA_PAYMENTS_MODE` 미설정(=off) → 모든 결제 API 503 "준비 중", 화면은 기존 "준비 중" 안내 그대로.

> Phase 2 최신 변경: 결제 승인 직후 본문을 자동 제공하지 않는다. 명시적 열기 → DB 최초 제공 기록 → 본문 반환. REFUND_REQUESTED로 취소 확인 중 열람을 잠그고, 본문/미열람 취소 요청에 DB rate limit을 적용한다. 상세: `PREMIUM_ACCESS_IMPLEMENTATION.md`. 아래의 기존 설명과 다른 부분은 최신 문서가 우선한다. 실제 Supabase·Toss TEST 확인 대기.

## 1. 구조

```text
Browser ──POST /api/orders {productId, resultId, signalIds}──▶ Server
          ◀── {orderId, amount(서버가 정함), orderName, purchaseCode}
Browser ──토스 결제창 v2 (client key, customerKey=ANONYMOUS, method=CARD)──▶ Toss
Toss ──redirect successUrl ?paymentKey&orderId&amount──▶ Browser
Browser ──POST /api/payments/confirm──▶ Server ──POST /v1/payments/confirm (Idempotency-Key)──▶ Toss
Server ──orders: PAID──▶ Supabase (service_role)
Browser ──[리포트 열기] POST /api/premium/report {purchaseCode, productId, signalIds, openContent:true}──▶ Server (rate limit+PAID+코드+같은 사주+DB 최초 제공 기록) ──▶ 리포트
```

- 서버 함수: `api/orders.ts`, `api/payments/confirm.ts`, `api/payments/fail.ts`, `api/premium/report.ts` (Vercel Functions, Web Handler).
- 서버 로직: `src/server/payments/service.ts` (순수, 의존성 주입), 연결: `src/server/payments/adapters.ts`, 환경: `api-lib/env.ts`.
- 정식 리포트 문구: `src/server/premium/*` — **서버 전용**, 브라우저 번들에 없음 (테스트·번들 검사).
- 생년월일·출생시각·성별은 서버로 보내지 않는다. 서버가 받는 것은 상품 영역의 Signal id 목록뿐.

## 2. 신뢰하지 않는 값
| 브라우저 값 | 처리 |
|---|---|
| amount | 무시. 서버가 `src/data/products.ts` 의 가격(2,900원)으로 주문 생성. confirm 시 successUrl 금액이 주문 금액과 다르면 토스 호출 없이 거부(AMOUNT_MISMATCH) + 주문 FAILED |
| productId | 서버 가격표(premium_money/love/career)에 없으면 거부 |
| signalIds | 상품 영역·알려진 id 만 허용, 아니면 거부 |
| "결제 성공" | 브라우저 판단 안 씀. 서버가 토스 승인 응답(status DONE, totalAmount, orderId 일치)을 확인한 뒤에만 PAID |

## 3. 키 분리
| 값 | 위치 | 비고 |
|---|---|---|
| `PALJA_TOSS_CLIENT_KEY` (test_ck_…) | 빌드 시 브라우저 번들 | 공개용. `_sk_` 가 들어오면 빌드 중단 |
| `TOSS_SECRET_KEY` (test_sk_…) | Vercel 서버 환경 변수 | 브라우저·GitHub 금지. 빌드 스크립트는 읽지 않음 |
| `SUPABASE_SECRET_KEY` (sb_secret_…) | Vercel 서버 환경 변수 | 브라우저·GitHub·채팅 금지. 예전 `SUPABASE_SERVICE_ROLE_KEY` 는 대체용. 공개 키가 들어오면 서버가 쓰지 않음 |
| Supabase Publishable Key (sb_publishable_…) | 브라우저 번들 | 공개용 (beta_feedback/beta_events INSERT 만) |
| `PALJA_PAYMENTS_MODE` | off / test / live | 기본 off |
| `PALJA_ALLOW_LIVE_PAYMENTS` | yes 일 때만 live 허용 | 사용자 최종 승인 전 설정 금지 |

TEST 모드에 live 키, LIVE 모드에 승인 플래그 없음 → 서버 503 / 빌드 중단.

## 4. orders 테이블 (`supabase/migrations/20261005010000_orders.sql`)
order_id, result_id, product_id, amount, currency, status, chart_key(Signal id 해시), purchase_code_hash, payment_key(환불용 참조, 카드정보 아님), method, toss_mode, source, failure_code/message, refund_reason, created_at, payment_requested_at, paid_at, approved_at, cancelled_at, refunded_at, updated_at.
RLS ON, anon/authenticated 권한 없음 (서버 service_role 만).

## 5. 상태
```text
CREATED ──confirm 시작(잠금)──▶ PAYMENT_REQUESTED ──토스 승인──▶ PAID ──관리자 환불──▶ REFUNDED
   │                                   └──토스 거절──▶ FAILED
   ├──결제창 취소(PAY_PROCESS_CANCELED)──▶ CANCELLED
   ├──결제창 실패──▶ FAILED
   └──금액 변조──▶ FAILED
```
PAID 는 failUrl 등으로 덮어쓸 수 없다 (CREATED 일 때만 CANCELLED/FAILED).

## 6. 멱등성 (중복 승인 방지)
1. 주문 상태 잠금: `CREATED → PAYMENT_REQUESTED` 조건부 업데이트(원자적). 동시에 두 요청이 와도 하나만 토스 승인 호출.
2. 토스 `Idempotency-Key: confirm-{orderId}` (공식 문서: 모든 POST API 지원, 15일 유효, 같은 키는 첫 응답 그대로 반환).
3. 이미 PAID + 같은 paymentKey → 같은 성공 응답 (새로고침). 다른 paymentKey → 거부.
4. 잠금은 됐는데 결과가 없는 경우(저장 실패·동시 요청·ALREADY_PROCESSED_PAYMENT) → `GET /v1/payments/orders/{orderId}` 로 실제 상태 조회 후 PAID 반영 (reconcile).
5. payment_key UNIQUE, purchase_code_hash UNIQUE.

## 7. Premium 권한과 구매 복구 (로그인 없음)
- 결제 시 서버가 **구매 코드**(16자, 80비트, 헷갈리는 0/O/1/I 제외, `ABCD-EFGH-JKLM-NPQR`)를 만들고 **해시만 저장**. 원문은 구매자 화면에만.
- 권한 = `PAID` + `구매 코드 해시 일치` + `같은 상품` + `같은 사주(chart_key = 상품 영역 Signal id 해시)`.
- **같은 기기**: 브라우저에 구매 기록(주문 번호·구매 코드·Signal id, 생년월일 없음) 저장 → "구매한 리포트 보기".
- **다른 기기 복구**: 같은 생년월일·시간을 다시 입력해 결과를 만든 뒤 "이미 구매했어요 → 구매 코드로 열기". 친구 사주에는 같은 코드가 열리지 않음(chart_key 불일치).
- **구매 코드를 잃어버린 경우**: 영수증·주문 소유자 확인 후 TEST 관리자 `scripts/payment-admin.ts rotate-code`로 재발급 가능. 실제 운영 검증·LIVE 지원은 대기.
- 실패 사유를 자세히 알려 주지 않음(코드 추측 방지). DB rate limit 코드 구현, 실제 Supabase 적용 대기.

## 8. 환불 (관리자)
1. 주문 확인: Supabase SQL `select order_id, status, amount, paid_at from orders where order_id = '…'`.
2. 환불 실행: 서버 함수 `refundOrder` (토스 `POST /v1/payments/{paymentKey}/cancel`, `Idempotency-Key: refund-{orderId}`) → 성공 시 `PAID → REFUNDED`, refunded_at·refund_reason 기록. 두 번 실행해도 한 번만 취소.
   - 실행 도구(관리자용 스크립트)는 TEST 결제 확인 후 추가 예정. 그 전에는 토스 상점관리자에서 취소 후 SQL 로 `status='REFUNDED'` 반영 (임시 절차).
3. 환불 후 같은 구매 코드로 리포트가 열리지 않음 (PAID 아님).

## 9. 테스트
- 단위(가짜 토스·가짜 저장소, `tests/payments.test.ts`, 25개): 정상 결제, 사용자 취소, 결제 실패, 금액 변조, productId 변조, signalIds 변조, confirm 중복, 동시 요청, 새로고침, success URL 직접 접근, 잘못된 paymentKey, Supabase 저장 실패 후 복구, PAID 덮어쓰기 방지, 구매 복구·다른 사주 차단, 환불 멱등, 키 모드 검사, 리포트 내용.
- 실제 토스 TEST 결제: **TEST 키 연결 후 진행 예정** (로컬 `npx tsx scripts/local-server.ts` 또는 Vercel Preview).
