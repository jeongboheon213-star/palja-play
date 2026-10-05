# 작업 로그 (Track A: Beta Product)

검증 작업(Track B)은 `docs/VERIFICATION_BACKLOG.md` 에서 따로 관리한다.

## 2026-10-05 — 환경 준비 (Phase 3C 이전)

- Node.js LTS v24.19.0 / npm 11.17.0 설치 (winget `OpenJS.NodeJS.LTS`).
- `npm install`: 새 패키지 없음. 기존 devDependencies(`typescript`, `tsx`, `@types/node`)만 설치. `package-lock.json` 처음 커밋.
- 설치 직후 기존 상태 그대로 실행: 테스트 82/82 통과, `tsc --noEmit` 통과.
- `@types/node` 가 설치됐으므로 CLAUDE.md 지시대로 임시 `tests/node-shim.d.ts` 삭제, `tsconfig.json` 의 `types` 를 `["node"]` 로 변경.
- 이때 드러난 문제 2개 (둘 다 **환경 차이**, 제품 코드 문제 아님):
  1. 타입: 실제 `@types/node` 에서 `readdirSync(..., { recursive: true })` 반환형이 `string | Buffer`. → `encoding: "utf8"` 명시.
  2. **Windows 경로 구분자**: `readdirSync` 가 `lib\saju\x.ts` 를 돌려줘서 `architecture.test.ts` 의 `startsWith("lib/saju")` 검사가 Windows 에서 **0개 파일**을 검사하고 통과하고 있었다(헛통과). `/` 로 통일한 뒤 15개 파일을 실제로 검사하며 모두 통과 → 숨은 코드 위반은 없었다.
- 결과: 82/82 통과, tsc 통과.
