# Production 배포 + 유료결제 준비 지시 (2026-10-05, 사용자 승인)

QA 결과 승인됨. 작업은 두 단계로 나눈다.

```text
A. 무료 Beta 실제 공개
B. 유료결제 시스템 준비
```

A 를 먼저 완전히 배포·검증한 뒤 B 를 진행한다.

## 사용자 추가 요청 (같은 지시에서)
- 가격: 4,900원 → **2,900원** (재물 / 연애 / 직업·사업 리포트 각각).
- 친구에게 보내기: **배틀 닉네임 + 받을 사람 전화번호**를 입력해서 보내는 방식.
  - 작은 문구: "전화번호는 저장되지 않으며 개인정보보호 처리됩니다."
  - 실제로도 전화번호를 어디에도 저장·전송(우리 서버/Supabase/분석)하지 않는다.
- 배틀 이름 입력 UI 는 "배틀 닉네임", 안내 "실명 대신 별명을 추천해요."
- 배틀 점수 조작 가능성은 known limitation 으로 유지. "재미로 보는 대결" 안내 유지. 금전·상품·랭킹 보상과 연결 금지.

## A. 무료 Beta Production 배포

GitHub main 이 source of truth.

배포 전 확인: git status, main 최신 여부, secret commit 여부, production environment variables, Supabase production 연결, production build, 189개 이상 기존 테스트(삭제·완화 금지), 브라우저 테스트.

Supabase 최종 보안: feedback/events 테이블 RLS·GRANT 확인. 일반 사용자는 INSERT 만. 다른 사용자 데이터 SELECT/UPDATE/DELETE 불가. service_role key 가 browser bundle·GitHub 에 없음 확인.

Vercel Production: GitHub main 연결, 실제 Production deploy. 로그인·권한 승인이 필요하면 사용자 단계만 정확히 안내하고 기다린다. 배포 후 실제 public URL 에서 직접 확인 (localhost 로 대체 금지).

Deployment Protection: 일반 Beta 사용자가 Production URL 을 열 수 있도록 필요한 설정만 변경 (보안을 전부 끄지 않는다). 사용자 계정 설정이 필요하면 정확한 메뉴를 안내하고 기다린다.

Production QA (public URL): Landing → Input → Calculation → Result → Premium → Feedback → Battle Link 생성. 생성된 Battle URL 을 새 browser context 에서 열어 Battle invitation → 친구 입력 → 친구 계산 → VS 결과.

Supabase Production 확인: 공개 URL 에서 feedback 1건, analytics events, premium click, premium interest 가 실제 저장되는지. 테스트 데이터는 식별 가능하게 표시.

Privacy Network QA: 생년월일, 출생시간, 성별, rawInput, pillars 가 Supabase/Vercel/기타 외부 서버로 전송되지 않음. 브라우저 내부 계산 원칙 유지.

Debug: Production URL 의 /debug.html 404 또는 동등한 차단.

Share/Battle URL: localhost·127.0.0.1 없음, 실제 Production URL 사용, 생년월일·출생시간·성별을 query/hash 에 넣지 않음.

iPhone: Windows 에서 Safari 테스트했다고 주장하지 않는다. "iPhone Safari manual QA required" 상태로 남긴다.

보고 형식: Production URL / Production Build / Supabase Feedback / Supabase Analytics / Battle / Privacy Network QA / Debug / Mobile Edge / iPhone Safari, 그리고 "사주팔자PLAY Beta: LIVE". LIVE 확인 후에만 B 진행.

## B. 실제 유료결제 준비 (토스페이먼츠 기준, TEST MODE 까지)

순서: 결제 구조 구현 → 토스 TEST KEY → 테스트 결제 → 서버 승인 검증 → Premium 해제 → 환불/실패 테스트 → 최종 검토 → (LIVE KEY 는 별도 결정).

Architecture: 정적 frontend 에서 Secret Key 사용 불가 → server-side endpoint (Vercel Functions 등 가장 단순·안전한 것).

```text
Browser → Create Order API → Server → orderId + amount → Browser → Toss Payments → successUrl
→ Server Confirm API → Toss Payment Confirm API → Supabase order = PAID → Premium entitlement
```

결제 원칙
- 브라우저가 보낸 amount / productId / payment success 를 그대로 신뢰하지 않는다. 서버가 productId 기준으로 가격을 다시 결정 (money_report = 2900, love_report = 2900, career_report = 2900). amount=100 을 보내도 서버는 2,900원.
- TOSS_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY 는 browser bundle 금지, Vercel server-side env 로만, GitHub commit 금지, .env.example 에 실제 값 금지.
- Toss client key(브라우저) 와 secret key(서버) 분리. 테스트 단계는 TEST KEY 만. 키 발급은 사용자 토스 계정에서 — 정확한 메뉴에서 멈추고 안내, 채팅에 키를 붙여 넣으라고 요구하지 않고 Vercel Environment Variables 에 직접 입력하도록 안내.
- orders 테이블 (최소 order_id, result_id, product_id, amount, currency, status, payment_key_hash 등, created_at, paid_at, cancelled_at). 카드번호 등 민감정보 저장 금지.
- entitlement: localStorage 만 바꾸지 않는다. 서버/Supabase 에서 검증 가능 (premium_entitlements 또는 orders PAID 기반). 로그인 없는 Beta 에 맞는 단순·안전한 구조.
- **다른 기기 구매 복구** 설계 필수. 해결 전에는 LIVE KEY 전환 금지.
- 상태: CREATED, PAYMENT_REQUESTED, PAID, FAILED, CANCELLED, REFUNDED 등 명시 관리.
- Idempotency: confirm 중복 호출 이중 처리 방지 (토스 공식 문서 기준 idempotency + order_id uniqueness).
- 서버 승인 후에만 Premium 전체 내용 표시. 테스트 결제 완성 전까지 "준비 중" modal 유지.
- PREMIUM 내용 정의: 각 2,900원 상품이 무엇을 주는지 명확히. FREE 와 문장 길이만 다르면 안 됨. FREE = WHAT, PREMIUM = WHY + HOW. WHEN 은 대운/세운 엔진 전에는 판매 내용에 포함하지 않음.
- 테스트(TEST KEY): 정상 결제, 사용자 취소, 결제 실패, 금액 변조, productId 변조, confirm 중복 요청, 새로고침, success URL 직접 접근, 잘못된 paymentKey, Supabase 저장 실패.
- 환불: LIVE 전 환불 흐름 설계, 관리자 환불 방법과 orders → REFUNDED 전환 문서화.
- 법적/운영: docs/PAID_LAUNCH_CHECKLIST.md (사업자/판매자 정보, 이용약관, 개인정보 처리방침, 결제/취소/환불 정책, 상품 제공 내용, 가격, 디지털 콘텐츠 제공 시점, 고객 문의). 법률 검토 완료라고 주장하지 않는다.
- TEST MODE 결제까지 완성 후 멈춤. LIVE KEY 전환 금지.

보고: Payment Provider / Test Payment / Server Confirmation / Order Storage / Premium Entitlement / Tamper Protection / Duplicate Confirmation / Refund Flow / Purchase Recovery / Paid Launch Checklist / Ready for LIVE Payments: YES / NO.
