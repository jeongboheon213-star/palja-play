# 팔자PLAY Beta

전통 명리 요소를 기반으로 한 엔터테인먼트 사주 웹서비스 (Beta). 계산 엔진은 순수 TypeScript, 화면은 정적 HTML + esbuild 번들.

## 명령
- `npm install` — 개발 의존성 설치 (typescript, tsx, @types/node, esbuild)
- `npm run check` — 타입 검사(엔진 + 웹) + 단위 테스트
- `npm run dev` — 개발 서버 http://127.0.0.1:5173 (debug: `/debug.html`)
- `npm run build` — production 정적 파일 → `dist/` (debug 화면 없음). 공유 URL: `PALJA_PUBLIC_URL=https://... npm run build`
- `npm run e2e` — 개발 빌드 후 Edge/Chrome headless 로 실제 흐름 검사, 화면 캡처 → `docs/screenshots/`

## 구조
- `src/lib/saju` 계산 (네 기둥, 기본 사주 데이터) · `src/lib/interpretation` Signals·점수·FREE/PREMIUM 문구
- `src/lib/ui` 화면용 변환 · `src/lib/share` 공유 · `src/lib/feedback` 피드백 · `src/lib/analytics` 이벤트
- `src/lib/engine` 조립 지점 (`computeBetaResult`)
- `web/` 화면 (index.html, debug.html, src/)
- 문서: `docs/BETA_DIRECTION.md`(방향), `docs/WORKLOG.md`(작업 로그), `docs/VERIFICATION_BACKLOG.md`(검증 할 일)

검증 상태는 `src/lib/saju/verification.ts` 가 기준이며, 외부 기준 대조 전에는 "검증됨"이라고 표현하지 않는다.
