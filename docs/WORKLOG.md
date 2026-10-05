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

## 2026-10-05 — Phase 3D: 기본 사주 데이터

만든 것 (`src/lib/saju/chart/`)
- `SajuData` (schema 0.2.0): 네 기둥(PillarResult 그대로, confidence/boundaryRisk 포함) + 일간(Day Master) + 오행 개수 + 지장간 + 십성(천간/지지 정기/지장간 각각) + 12운성 + 합충형해파·삼합·반합·방합 + 시간 정보 + provenance.
- uncertain/unavailable 기둥(후보를 고르지 않은 기둥)과 시간 미상 시주는 오행·십성·관계 계산에서 **제외**하고 `excludedPositions` 에 남긴다.
- 12운성: `rule: "unverified"`, `inReadings: false` (Signals 가 읽지 않음, 정책 `twelveStagesInReadings=false`).
- `engine.computeSaju()` → `{ ok, data: SajuData }`. 절입 당일 시간 미상은 오류가 아니라 uncertain 기둥으로 표현.
- Phase 2 초안 `SajuData`/`TwelveStageField`/`SolarTermRecord` 타입(사용처 없음)은 새 구조로 대체.
- verification: `hiddenStems`, `fiveElements` 항목 추가, 십성·관계·12운성 메모 갱신. 모두 not-verified (일주만 verified-internally 유지).

테스트 (+12 → 총 126)
- 십성 표(갑·을·경 일간 전체), 모든 일간에서 10십성 1회씩, 지장간 정기 오행 = 지지 오행, 12운성 장생/건록/제왕 위치와 순열성, 관계 종류별 사례(무기 합·충 없음, 왕지 없는 반합 아님 포함), 시간 미상/입춘 당일 제외 처리, 12운성 비연결, 결정론·동결·입력 비동결.

테스트 변경 기록
- `policies.test.ts` SCHEMA_VERSION 기대값 0.2.0 으로 갱신.

## 2026-10-05 — Phase 4: Signals + Score

만든 것 (`src/lib/interpretation/`)
- 구조: SajuData → `extractFeatures` → `deriveSignals` → `scoreSignals` → (Phase 5 Reading). 사주 원본을 바로 문장으로 만들지 않는다.
- Signal: `id`, `domain`(personality/wealth/love/career/business/relationship/execution/flow), `polarity`(positive/negative/neutral), `strength`(1~3), `evidence`(출처·기둥 위치·근거 요약), `sourceVerification`(근거 데이터 검증 상태 중 최저).
- 특징값: 십성 그룹 개수(일간 제외 천간 + 지지 정기), 오행 과다/결핍, 일간 힘 지표(서비스 단순화, 전통 신강/신약 판정 아님), 합/충/형해파.
- 연애의 배우자 별은 전통 관례대로 남성=재성, 여성=관성 (근거 문구에 기록).
- 7개 점수(재물력·연애력·사업력·직업력·인간관계·실행력·운의 흐름): 난수 없음, 각 점수에 근거 Signal id 저장, `kind: "service-indicator"`, `SCORE_VERSION = score-0.1.0`.
- 점수 공식: raw(Σ+강도 − Σ−강도) → 영역별 center/spread 로 표준화 → `62 + 30·tanh(z/1.6)`. 처음 단순 합산 공식은 직업력 중앙값 96 등 쏠림이 심해 교체. center/spread 는 내부 표본(1962~2026) 값이며 실제 사용자 분포가 아님.
- "운의 흐름"은 대운·세운이 없으므로 타고난 오행 균형·합충 성향만 반영 (시기 판단 아님).
- uncertain 기둥은 근거로 쓰지 않음. 일주 uncertain 이면 Signal 자체를 만들지 않음. 12운성 미사용.

표본 분포 (1962~2026, 5일 간격 × 시간 4종, score-0.1.0)
- 각 점수 평균 약 62, p10 약 40, p90 약 80, 최소 33 / 최대 91.

테스트 (+12 → 총 138)
- 필수 필드, 7개 이름 유지, 근거 id 존재, 스윕(근거·범위·결정론·단조롭지 않음·평균 50~75), 100회 결정론, 배우자 별 성별 기준, uncertain/시간 미상 위치 제외, 일주 uncertain → null, 근거 검증 상태(일간만 verified-internally), 12운성을 바꿔도 Signals 동일.
- 아키텍처: 해석 계층은 12운성·기둥/절기 계산 함수를 쓰지 않는다.
