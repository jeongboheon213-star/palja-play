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

## 2026-10-05 — Phase 3C: 네 기둥 (Beta용)

만든 것
- `src/lib/saju/ganji.ts`: 천간·지지·60갑자 표 (한자, 오행, 음양).
- `src/lib/saju/pillars/` : `calculateYearPillar` / `calculateMonthPillar` / `calculateDayPillar` / `calculateHourPillar` 각각 별도 파일·독립 함수. 네 함수는 같은 입력(`PillarInputs`)만 받고 서로의 결과를 받지 않는다. `calculateFourPillars` 가 조립.
- 연주: 제공자의 입춘 순간 기준. 월주: 제공자의 절(節) 순간 기준 + 오호둔. 절기 계산·절입 시각은 기둥 코드에 없음 (아키텍처 테스트로 강제).
- 일주: JDN 정수 공식 `(JDN+49) mod 60`. 자시 정책 반영(midnight/splitJasi 00:00, jasi 23:00).
- 시주: 시간 있을 때만. 시간 미상 → `hour = null`, 요약 confidence 는 `unavailable`.
- 각 결과: `confidence`(confirmed/uncertain/unavailable) + 별도 `boundaryRisk` + `candidates`(uncertain 일 때, 고르지 않음) + `evidence` + `policyDependencies` + `verification`.
- `engine.computeFourPillars()` 조립 함수. `ENGINE_VERSION` 0.1.0-alpha → 0.2.0-beta.

결정한 정책 (Alpha, 전문가 검토 전 → Verification Backlog)
- midnight 정책의 23시대 시주: 일주는 당일, 시간(時干)은 다음 날 일간 기준 자시 (시주가 2시간마다 끊김 없이 이어지도록).
- 시간 미상 + jasi 정책 또는 경도 보정 ON → 일주 uncertain (날짜가 갈릴 수 있음). 현재 Alpha 정책(midnight, 경도 보정 OFF)에서는 일주 항상 confirmed.
- 시간 미상인데 절입이 그날 자정 전후 30분 안(바로 옆 날)에 있으면 confirmed + boundaryRisk.

테스트 (+31, 아키텍처 +1 → 총 114)
- 일주 1930-01-01~2026-10-04 (35,341일) 두 독립 공식(JDN / 1900-01-01부터 달력 일수 세기) 전수 일치 재확인 → 상태는 verified-internally 유지 (올리지 않음).
- 1963~2030 매년 입춘 1분 전/후 연주 변경, 1962~2030 모든 절 1분 전/후 월주 변경 + boundaryRisk, 60개월 연속성.
- 제공자를 바꾸면(황경 하루 지연) 월주가 따라 바뀜 → 절입 하드코딩 없음 확인.
- 시간 미상: 입춘 당일(연·월 uncertain), 다른 절 당일(월만 uncertain), 중기 당일(confirmed), 평일(confirmed), 시주 null.
- 시주 경계(00:59/01:00/22:59/23:00), 오서둔, 자정을 넘는 연속성, DST(23:30 KDT→해시, 00:30 KDT→전날), gap/overlap.
- 결정론, 동결, provenance. 샘플 스윕 1962~2026.
- 일부러 월주/연주 로직을 망가뜨려 보면 테스트가 실패함을 확인(테스트가 헛통과하지 않음).
- 환경 해시 `tests/tools/env-hash-pillars.ts`: TZ=UTC / America/New_York / Asia/Seoul 모두 `cases=47298 hash=fa8e6324` 동일.

테스트 변경 기록
- `architecture.test.ts` 의 "기둥 계산기 파일은 아직 없다 (Phase 3C 이전)" 는 단계 관문 테스트라 Phase 3C 에서 교체: "기둥 계산은 lib/saju/pillars 에만, 4개 독립 함수" + "기둥 코드는 절기를 다시 계산하지 않는다".
- `policies.test.ts` 버전 상수 기대값을 0.2.0-beta 로 갱신.

관찰 (검증 아님)
- Alpha 제공자의 2024 입춘 = 2024-02-04 08:20:11Z (KST 17:20). 공개 자료 값과 수 분 차이가 있을 수 있어 보이나 실제 KASI 자료로 확인하지 않았다 → Backlog.
