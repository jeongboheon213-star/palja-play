# 인계 문서 (HANDOFF) — 2026-10-05 기준

다른 AI 도구(GPT/Codex 등)나 개발자가 이 저장소를 이어서 작업하기 위한 문서다. **먼저 이 문서 → `CLAUDE.md` → `docs/WORKLOG.md` 마지막 부분**을 읽을 것.

## 0. 프로젝트 한 줄 요약
사주팔자PLAY Beta — 생년월일로 사주 "캐릭터 + 7개 능력치"를 보여주고, 친구와 점수 배틀을 하는 엔터테인먼트 웹서비스.
- Production: https://palja-play.vercel.app (Vercel, `main` 푸시 시 자동 배포)
- 저장소: `jeongboheon213-star/palja-play`, `main` 이 기준
- 사용자는 **개발자가 아닌 1인 사업자** → 보고는 한국어, 쉬운 말로. 사용자만 할 수 있는 일(로그인, Supabase Run, 키 입력, 계약)은 대신하지 말고 한 단계씩 안내 후 멈춘다.
- 복구 지점: 태그 `prod-stable-2026-10-05` (a516d82, 배틀 수정 전 정상 Production)

## 1. 현재 상태
| 항목 | 상태 |
|---|---|
| 무료 Beta (입력 → 결과 → 피드백 → 배틀) | LIVE, Production QA 11/11 |
| 배틀 공유 버그 (카톡·링크복사 시 일반 첫 화면) | 수정·배포 완료 (73eddbf). 링크 `/?b=<base64url 토큰+체크섬>`, 모든 공유 방식이 `createBattleShare()` 하나만 사용. Production 매트릭스 26/26 |
| 카카오톡 공유 버튼 | 코드 완료, **키 미설정이라 숨김**. 실제 카카오 앱 전송 NOT TESTED |
| Supabase 피드백·이벤트 | 연결됨 (anon INSERT 만) |
| Supabase `orders` 테이블 | 생성됨. RLS ON, anon/authenticated 권한 없음 확인. **service_role 에 DELETE/TRUNCATE 등 기본 권한이 남아 있음 → 보정 SQL 실행 대기** (아래 2-1) |
| 결제 (토스페이먼츠) | 코드는 TEST 모드까지 구현, **Production 은 OFF** (`PALJA_PAYMENTS_MODE` 미설정). 실제 TEST 결제 아직 안 함 |
| LIVE 결제 | **절대 OFF.** 사용자가 정확히 "실제 결제를 활성화해" 라고 승인하기 전에는 켜지 않는다 |
| NOT TESTED | iPhone Safari, Chrome(이 PC 에 Edge 만), 실제 카카오톡 앱, 실제 문자 발송 |

## 2. 다음 할 일 (순서대로, 사용자 확인하며)
1. **orders 권한 보정 (사용자 Run 대기 중)**
   Supabase → SQL Editor 에서 `supabase/migrations/20261005020000_orders_restrict_service_role.sql` 내용 실행:
   ```sql
   revoke all on public.orders from public, anon, authenticated, service_role;
   grant select, insert, update on public.orders to service_role;
   ```
   실행 후 확인 질의(읽기 전용, 한 줄이어야 Supabase 결과창에 모두 나옴):
   ```sql
   select 'RLS' as kind, relname::text as who, relrowsecurity::text as value from pg_class where oid = 'public.orders'::regclass union all select 'GRANT', grantee::text, privilege_type::text from information_schema.role_table_grants where table_schema = 'public' and table_name = 'orders' order by 1 desc, 2, 3;
   ```
   정상: `RLS orders true`, `service_role` 은 INSERT·SELECT·UPDATE 만, anon/authenticated 없음 (postgres 는 관리자라 무관).
2. **토스 TEST 연결** — 사용자가 Vercel → Settings → Environment Variables 에 직접 입력 (채팅에 키 붙여넣기 요구 금지). 처음엔 **Preview 환경**으로 테스트 권장.
   - 브라우저 빌드용: `PALJA_PAYMENTS_MODE=test`, `PALJA_TOSS_CLIENT_KEY=test_ck_…`
   - 서버 전용: `TOSS_SECRET_KEY=test_sk_…`, `SUPABASE_SECRET_KEY=sb_secret_…` (`SUPABASE_URL` 은 연동으로 이미 있음)
   - TEST 와 LIVE 키 혼합 금지 (빌드·서버 모두 접두사 검사함)
3. **실제 TEST 결제** — 2,900원 → 토스 승인 → orders `PAID` → 구매 코드 발급 → Premium 리포트 열림. 결제 QA 16건(`docs/PAYMENT_DESIGN.md`), 중복 승인(idempotency), 실패·취소.
4. **구매 복구** — 구매 코드 조회에 rate limit·무차별 대입 방지 추가 (Supabase 테이블 + 사용자 Run 필요), 코드 분실 절차 문서.
5. **TEST 환불** — 토스 cancel API(`POST /v1/payments/{paymentKey}/cancel`) 관리자 도구.
6. **운영 페이지** — 이용약관·개인정보처리방침·환불정책·사업자 정보·문의. **사업자 정보는 지어내지 말고 사용자에게 받는다. "법률 검토 완료" 라고 쓰지 않는다.**
7. **카카오 키** — 사용자가 Kakao Developers 에서 앱 생성 → JavaScript 키 → [JavaScript SDK 도메인] 과 [웹 도메인] 에 `https://palja-play.vercel.app` 등록 → Vercel env `PALJA_KAKAO_JS_KEY` (32자리 hex) → 재배포 → 실제 카톡으로 배틀 링크 확인.
8. **LIVE 게이트** — `docs/PAID_LAUNCH_CHECKLIST.md` 전 항목 YES + 사용자의 명시적 승인 "실제 결제를 활성화해" 이후에만 `PALJA_PAYMENTS_MODE=live`, `PALJA_ALLOW_LIVE_PAYMENTS=yes`, live 키.

## 3. 절대 규칙 (사용자 지시, 계속 유효)
- 기존 테스트 삭제·기준 낮추기 금지. 실제로 안 한 테스트를 PASS 라고 보고 금지 (Safari·카카오 앱은 NOT TESTED 로).
- localhost 결과로 Production PASS 를 대신하지 않는다. 배포 후 실제 URL 에서 다시 확인.
- 배틀 URL 에 생년월일·출생시간·성별·전화번호·rawInput·SajuData·pillars 포함 금지. 전화번호는 문자 앱 열기에만 쓰고 저장·전송·분석 기록 금지.
- Secret Key(`sb_secret_`, `test_sk_`/`live_sk_`): 브라우저 번들·GitHub·채팅 금지, Vercel 서버 환경 변수에서만.
- 결제: 브라우저가 보낸 amount/productId/성공 여부를 믿지 않는다. 가격은 서버 `src/data/products.ts`(2,900원). successUrl 만 보고 Premium 해제 금지 — 서버가 토스 confirm 후 orders `PAID` 일 때만.
- `/debug.html` 은 Production 에서 404 유지. Production 에 "개발 환경" 문구 없음.
- 사주 계산: 난수·현재 시각 의존·가짜 계산·AI 계산 금지. 검증 안 된 것을 "검증됨/정확한 만세력" 이라 말하지 않는다 (`src/lib/saju/verification.ts` 기준).
- npm 패키지 추가 시 이름·이유·dev/prod 를 먼저 사용자에게 알린다. 큰 프레임워크 이전 금지.

## 4. 구조 요약
- `src/lib/saju` 계산 엔진 → `src/lib/interpretation` (Signals·점수·FREE/PREMIUM) → `src/lib/engine` 조립
- `src/lib/battle/battle.ts` 배틀 카드·비교·문자 URI / `src/lib/battle/share.ts` **유일한 배틀 링크 생성기**
- `web/` 화면 (`web/src/main.ts`, `web/src/shareTools.ts` QR·복사·카카오), 빌드 `scripts/build.mjs` (esbuild → `dist/`)
- 서버: `api-src/*.ts` → `scripts/build-api.mjs` 로 `api/*.js` 번들 (Vercel Functions, 확장자 없는 import 문제 때문에 사전 번들 필수). 결제 로직 `src/server/payments`, 환경 변수 `api-lib/env.ts`
- DB: `supabase/migrations/*.sql` (사용자가 SQL Editor 에서 직접 Run)
- 문서: `docs/PAYMENT_DESIGN.md`, `docs/PAID_LAUNCH_CHECKLIST.md`, `docs/PRODUCTION_PAYMENT_DIRECTION.md`, `docs/QA_REPORT.md`, `docs/WORKLOG.md`(작업마다 기록)

## 5. 명령 (Windows, Node.js LTS — Git Bash 는 `export PATH="/c/Program Files/nodejs:$PATH"` 필요)
- `npm ci` → `npm run check` (타입체크 + API 번들 검사 + 단위 테스트 230개)
- `npm run e2e` (로컬 E2E 35 + 배틀 매트릭스 34, Edge headless/CDP)
- `npm run e2e:prod` (Production 배틀 매트릭스 + Production QA 11개) — 배포 후 실행
- `npm run build` (prod) / `npm run build:dev` / `npm run dev`
- 줄바꿈 LF (`.gitattributes`). 커밋 후 `main` 푸시 = Production 배포이므로 테스트 통과 후에만 푸시.
