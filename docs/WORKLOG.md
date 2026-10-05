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

## 2026-10-05 — Phase 5: FREE Reading (WHAT)

만든 것 (`src/lib/interpretation/free.ts`, `copy/`, `notices.ts`)
- `buildFreeReading(SajuData)` → 캐릭터 · 핵심 성향 5~7 · 강점 5+ · 주의점 3+ · 오행 밸런스 · 7개 능력치 · 재물/연애/직업/사업/인간관계 해석 · 인생 키워드 · 반전 포인트 · 안내 · 기둥 표시 · 버전.
- 캐릭터: 10개 일간별 (미리보기의 5개 오행 캐릭터를 음양으로 확장). 근거 Signal = `personality.daymaster.<일간>` (일주, verified-internally).
- 모든 문장은 Signal id 를 근거로 가진다. 문구 표는 Signal id → 문구(`copy/signalCopy.ts`). 근거가 적을 때 최소 개수는 같은 일간 근거의 예비 문구로 채움 (근거 없는 문장 없음).
- 반전 포인트: 같은 영역에 positive(revPos) + negative(revNeg) Signal 이 **실제로 있을 때만** "A지만, B" 생성. 표본에서 약 98% 의 결과에 1개 이상(평균 2.7개), 나머지는 0개.
- 안내 코드: BOUNDARY_RISK("절기 경계에 가까운 출생 시각으로, Beta 계산 기준에 따라 결과가 달라질 수 있습니다."), TIME_UNKNOWN, PILLAR_UNCERTAIN, PARTIAL_DATA. 경계 위험이 있어도 결과는 막지 않음.
- 결과에 생년월일·시각·성별 원본을 넣지 않고 버전 묶음(engine/schema/interpretation/score/solarTermProvider/policy)만 넣음 → 피드백 연결용.
- Beta 안내문(`BETA_DISCLAIMER`), 능력치 안내문 준비.
- 캐릭터 문구 중 근거와 충돌할 수 있는 단정(예: 경 "돈을 버는 감각은 좋은 편")을 성향 묘사로 수정.
- `INTERPRETATION_VERSION` 0.1.0-alpha → 0.2.0-beta.

테스트 (+15 → 총 153)
- 구성·최소 개수(스윕 + 확정 기둥 1개 사례), 모든 문장 근거 id 존재, 반전 생성 조건 양방향(있으면 반드시·없으면 절대), 모든 Signal 문구 정의, 반전 문장 형식, 10개 캐릭터 문구 수, 금지 표현(반드시/무조건/100%/정확한/검증된/투자 권유 등), 경계 위험 안내 + 결과 비차단, 버전, 원본 개인정보 미포함, 결정론·동결, 일주 uncertain → 결과 없음.
- 금지 표현 테스트가 "이미 검증된 방식" 문구를 잡아내 "이미 자리 잡은 방식"으로 수정.

테스트 변경 기록
- `policies.test.ts` INTERPRETATION_VERSION 기대값 0.2.0-beta 로 갱신.

## 2026-10-05 — Phase 6: PREMIUM Preview

만든 것
- `src/data/products.ts`: 재물 심층 리포트 / 연애 심층 리포트 / 직업·사업 심층 리포트, 각 4,900원. `betaTestPrice: true`(Beta 테스트 값), `paymentEnabled: false`. 버튼 문구 `PREMIUM_COMING_SOON_MESSAGE` = "팔자PLAY Beta에서 준비 중인 기능입니다." 상품별 클릭 이벤트 이름(premium_money_click / premium_love_click / premium_career_click).
- `src/lib/interpretation/premium.ts` + `copy/premiumCopy.ts`: FREE=WHAT 와 구분된 PREMIUM 구조. WHY(왜 이런 패턴인가)·HOW(어떻게 활용할까) 각 1줄 미리보기 + 근거 요약 + 잠긴 항목 수(실제 근거 Signal 수 − 1). **WHEN 은 대운·세운 미구현이라 항상 "준비 중"** (가짜 시기 없음).
- `src/lib/analytics/events.ts`: Beta 이벤트 9종 이름, 이벤트 형식(sessionId·resultId·props), 개인정보로 보이는 키 제거, 개발용 메모리 sink. 외부 분석 서비스 연결 없음 (Phase 8 에서 결정).
- `engine.computeBetaResult()`: 입력 → SajuData → Signals → FREE + PREMIUM 미리보기 (UI 진입점).

테스트 (+9 → 총 162)
- 가격·Beta 표시·결제 비활성·준비 중 문구, 이벤트 이름, 개인정보 키 제거, WHY/HOW/WHEN 구조, 스윕(WHEN 에 연도·나이·대운 숫자 없음, 미리보기 근거 존재·영역 일치·잠긴 수 정확), 4개 영역 모든 Signal 에 WHY/HOW 문구, 금지 표현, 오류 경로(DST gap/overlap, 일주 uncertain), 결정론.
- 환경 해시 `tests/tools/env-hash-result.ts`(FREE+PREMIUM 전체): TZ=UTC / America/New_York / Asia/Seoul 모두 `cases=13516 hash=874ad2d1`.
- 아키텍처 금지어 테스트가 엔진 주석의 "검증 완료"(입력 검사 의미)를 잡아내 문구 수정.

테스트 변경 기록
- `policies.test.ts` 의 PRODUCTS 테스트: Phase 2 단일 `premium_report`(모의 결제) → Beta 3종 리포트(결제 없음) 구조로 교체.

## 2026-10-05 — Phase 8: Feedback + Analytics (라이브러리)

만든 것
- `src/lib/analytics/events.ts`: 이벤트 12종 (landing_view, input_start, calculation_complete, result_view, share_click, premium_{money,love,career}_click, premium_{money,love,career}_interest, feedback_submit). `track(event, props, resultId)` 추상화(`createTracker`), 여러 sink 동시 전송, sink 오류는 흐름을 막지 않음. 개인정보 키(birth*/date/time/gender/name/phone/email/comment) 제거 — 처음 정규식이 `timeKnown` 같은 정상 키까지 지워 정확 일치 방식으로 수정. 퍼널 지표 계산(방문→입력, 입력→결과, 결과→공유/Premium 클릭/관심).
- `src/lib/feedback/feedback.ts`: 피드백 레코드 = resultId(UUID) + feedbackId(UUID) + 버전 묶음 6종 + 비식별 결과 특성(캐릭터 id, 시간 입력 여부, 경계 안내 여부, 불확실 기둥 수) + 만족도 1~5 + 잘 맞은/안 맞은 영역(복수, "없음") + 공유 의향(아니요/아마도/네) + 한마디(500자). 생년월일·시각·성별·이름 없음. `FeedbackRepository` 인터페이스 + 메모리 저장소 + **미설정 저장소(저장한 척하지 않고 NOT_CONFIGURED)**. 만족도 지표(평균, 5점 비율, 영역별, 공유 의향, 버전별 평균).
- 상품 설정에 `interestEvent`, 질문형 `hook` 추가. "직업/사업" → "직업·사업".
- 안내 문구: 경계 안내를 "출생 시각이 절기 경계와 가까워 Beta 계산 기준에 따라 일부 결과가 달라질 수 있어요."로, 시간 미상 안내에 "출생 시간을 입력하면 더 세밀한 결과를 볼 수 있어요." 추가.

## 2026-10-05 — Phase 7: Web UI

새 dependency
- `esbuild@0.28.2` (devDependency). 이유: TypeScript 엔진 + 화면 코드를 브라우저용 JS 한 파일로 묶기 위함. Next.js/React 마이그레이션 없음. npm 이 esbuild 의 postinstall 스크립트를 보류했지만 플랫폼 바이너리 패키지로 정상 동작 확인 (`npx esbuild --version` 0.28.2).

만든 것
- `web/index.html`: 미리보기(`팔자PLAY 미리보기.html`) 디자인 토큰·컴포넌트 재사용 — dark purple(#171936/#20234a), gold(#FFB347), jade(#4ED1B0), Do Hyeon + Noto Sans KR, 카드, 회전 orb 계산 애니메이션, 캐릭터 카드, 능력치 막대(→ 10칸 게임 스탯 블록), 잠금(blur) 카드, 토스트, 모바일 우선(최대 460px, 데스크톱 520px).
- 미리보기의 Mock 계산(간이 일주, 난수 능력치, 고정 문구, Mock 결제, "샘플" 표시) 전부 제거. 결과는 `computeBetaResult` 만 사용.
- 흐름(한 페이지): Landing → 입력 → 계산 애니메이션 → 결과(캐릭터 → 한 줄 설명 → 핵심 성향 → 7개 능력치 → 강점/주의점 → 오행(+접힌 여덟 글자) → 재물·연애·직업·사업·인간관계 → 반전 → 키워드 → Premium → Feedback → Share → Beta 안내).
- 입력: 생년월일(1962-01-01~오늘 KST), 양력(음력 "Beta 준비 중" disabled), 출생 시간 + "시간을 몰라요", 성별(기본값 없음), 대한민국 고정(해외 "Beta 준비 중"). 검증은 기존 `validateSajuInput`. 서머타임 gap 은 안내, overlap 은 "서머타임/표준시" 선택 버튼.
- "운의 흐름"은 화면에서 **"기본 운 밸런스"** + "올해·이번 달 운세가 아니에요" 안내 (내부 키 flow 유지).
- Premium: "여기까지가 무료 팔자풀이 / 그래서 왜 나는 이럴까?" → 3개 카드(질문형 hook, 4,900원 Beta 테스트 가격, WHY 미리보기 1줄, HOW 잠금, 시기 준비 중) → 버튼 누르면 바텀시트("팔자PLAY Beta / 이 리포트는 현재 준비 중이에요 …") + `premium_*_click`, 시트의 "이 리포트가 나오면 보고 싶어요" → `premium_*_interest`.
- Feedback: "솔직히, 얼마나 나 같았나요?" 😕😐🙂😮🤯 1~5, 잘 맞은 부분(복수), 안 맞은 부분(+없음), 친구 공유 의향, 한마디. 강제 없음(만족도 고르면 제출 가능).
- Share: Web Share API → 없으면 클립보드 → 둘 다 안 되면 직접 복사용 문구. 문구·공유 카드(브랜드, 캐릭터, 한 줄, 상위 3개 능력치)에 생년월일·시간·간지 없음. 공개 URL 은 빌드 시 `PALJA_PUBLIC_URL`.
- resultId/feedbackId/sessionId: 브라우저 `crypto.randomUUID` (web/src/runtime.ts). 사주 계산과 분리(계산 코드에는 난수 없음, 테스트로 강제).
- 화면용 변환 `src/lib/ui/resultView.ts`(개발자 용어 → 자연어), 공유 `src/lib/share/share.ts` — DOM 없이 단위 테스트.
- 저장소/분석 adapter (web/src/runtime.ts, config.ts)
  - development: 분석 = memory + console, 피드백 = 이 브라우저 localStorage(`palja-dev-feedback-v1`) + 화면에 "Beta 개발 환경: … 운영 서버로 전송되지 않아요" 표시, 상단 "개발 환경" 배지.
  - production: 분석 = memory(외부 전송 없음), 피드백 = 미설정(저장 안 됨을 그대로 안내). → Phase 9~10 에서 실제 저장소 결정 필요.
- Debug: `debug.html` (Raw SajuData, 기둥 표, confidence, boundaryRisk, Signals, Scores, FREE/PREMIUM, provenance, 검증 상태, 자시 정책·overlap 선택). **개발 빌드(dist-dev)에만** 생성. production 빌드에는 debug 파일과 개발 hook 코드가 없음(번들 검사로 확인).
- 빌드: `npm run build`(→ dist/, 108.5KB) / `npm run build:dev`(→ dist-dev/) / `npm run dev`(http://127.0.0.1:5173, debug: /debug.html).

브라우저 테스트 (`npm run e2e`, `scripts/e2e.mjs`)
- 추가 패키지 없이 설치된 Microsoft Edge(Edg/154) headless 를 DevTools Protocol 로 직접 조작 (Playwright 미설치).
- 28개 확인 모두 통과, 페이지/콘솔 오류 0, 화면 캡처 20장 `docs/screenshots/`.
- 범위: 모바일 390x844 / 데스크톱 1280x900, 정상 입력, 빈 입력·1961·미래 날짜, 서머타임 gap·overlap, 시간 미상, 절기 경계(2020-02-04 17:50), 입춘 당일 시간 미상(연·월주 "?"), 1962-01-01, 새로고침, Premium 클릭/관심 분리, 피드백 저장 레코드 개인정보 검사, 공유 3경로, 개발자 용어 미노출, 가로 넘침 없음, debug 화면, production 빌드에 debug 없음.
- production 빌드도 로컬 서버에서 수동 확인: 계산·결과 정상, /debug.html 404, 개발 hook 없음, 피드백 "저장소 준비 중" 안내.

캡처로 발견해 고친 UX 문제
- 긴 토스트가 둥근 알약 모양으로 커지며 내용을 가림 → 모서리·최대 폭 조정.
- 데스크톱에서 상단 바(460px)와 본문(520px) 폭 불일치 → 맞춤.
- Premium 잠긴 항목 수가 WHY·HOW 를 이중으로 셈("외 12개") → 추가 근거 수만 표시.
- Windows 에서 🇰🇷 국기 이모지가 "KR" 글자로 보임 → 이모지 제거.

테스트
- 단위 테스트 +14 (화면 데이터 개발자 용어 스윕, 기본 운 밸런스, 경계/시간 미상 표시, 공유 문구, 피드백 검증·레코드·저장소·지표, 이벤트 track·지표, 웹 코드 Mock/난수 검사) → 총 176 통과. `tsc` 는 엔진 + 웹(DOM) 두 설정 모두 통과.
- 테스트 변경 기록: `premium.test.ts` 이벤트 목록 9→12종(관심 이벤트), 상품명 "직업·사업".

## 2026-10-05 — 외부 서비스 연결 상태 점검 + Vercel 설정

- GitHub: 정상 (main push 가능).
- Vercel: 프로젝트 `play-5e80/palja-play` 가 GitHub 저장소와 이미 연결되어 있었고, main push 마다 **Production 배포가 자동 시도**되고 있었다 (GitHub commit status 로 확인). 배포 주소는 모두 Vercel 로그인(SSO) 보호로 외부 비공개. `palja-play.vercel.app` 은 404.
  - Phase 6 까지는 build 스크립트가 없어 저장소 파일을 그대로 정적 배포(성공 표시), Phase 7(`547d4fa`)부터 `npm run build` 결과가 `dist/` 인데 Vercel 기본 출력 폴더를 찾아 **실패**.
  - 사용자 결정에 따라 `vercel.json` 추가: install `npm ci`, build `npm run build`, output `dist`, **main 자동 배포 끔**(`git.deploymentEnabled.main=false`, Phase 9 QA 승인 후 다시 켬), 기본 보안 헤더.
- Supabase: 코드·설정에 연결 없음. 사용자에게 Project URL + anon key 를 받아 연결 예정 (service_role 키는 받지 않음).
- 내장 브라우저는 Vercel/Supabase 에 로그인되어 있지 않아 대시보드는 확인하지 못함 (비밀번호 입력은 하지 않음).

## 2026-10-05 — Supabase 연결 준비 (키 수령 전)

- `supabase/migrations/20261005000000_beta_feedback_events.sql`: `beta_feedback`, `beta_events` 테이블. 개인정보 컬럼 없음, 값 CHECK 제약, RLS 켜고 anon 은 INSERT 만(읽기·수정·삭제 불가).
- `src/lib/storage/supabaseRows.ts`: 피드백/이벤트 → 테이블 행 변환 + REST INSERT 요청(순수 함수).
- `web/src/supabase.ts`: Supabase 피드백 저장소(`kind: remote`) + 이벤트 sink(keepalive, 실패해도 흐름 유지).
- 설정: `PALJA_SUPABASE_URL` / `PALJA_SUPABASE_ANON_KEY` 환경 변수(로컬은 `.env.local`, Vercel 은 Environment Variables). 둘 다 있으면 피드백·이벤트를 Supabase 로, 없으면 기존처럼 dev=localStorage / prod=미설정. 행에 `source`(development/production) 기록.
- 빌드 안전장치: service_role/secret 키가 들어오면 빌드 중단 (확인함).
- `.gitattributes` 로 줄바꿈을 LF 로 고정 (Windows 에서 stash 후 CRLF 로 바뀌어 편집이 깨지는 문제). `docs/BETA_DIRECTION.md` 는 줄바꿈만 LF 로 정규화(내용 동일).
- 테스트 +4 (행 ↔ SQL 컬럼 일치, 이벤트 이름 ↔ SQL CHECK 일치, RLS/권한, REST 요청) → 180 통과. E2E 28/28 통과.

## 2026-10-05 — Supabase 실제 연결 확인

- 사용자 안내로 Supabase SQL Editor 에서 migrations SQL 실행 → "Success. No rows returned".
- 프로젝트: `nqplgqhpkdnmubfycdbs` (리전 ap-south-1, Free). 새 형식 publishable 키(`sb_publishable_…`) 사용. secret 키는 받지 않음.
- 로컬 `.env.local`(git 제외)에 URL/publishable 키 저장. 새 키는 JWT 가 아니므로 REST 요청은 `apikey` 헤더만 보냄(예전 JWT anon 키일 때만 Bearer 추가).
- 직접 확인: INSERT 201 / anon 으로 SELECT → 권한 거부 / 잘못된 이벤트 이름 → 400.
- 실제 앱(개발 서버)에서 입력→결과→피드백 제출 → Supabase 에 feedback 1건, events 8건 저장 확인(SQL 조회, `source=development`).
- E2E 는 `--no-remote` 빌드로 실행해 테스트 기록이 DB 에 쌓이지 않게 함. E2E 28/28 통과.
- 남은 일: Vercel Environment Variables 에 `PALJA_SUPABASE_URL`, `PALJA_SUPABASE_ANON_KEY` 등록 (사용자 계정에서).

## 2026-10-05 — Vercel 환경 변수: 연동이 만든 이름 자동 사용

- Vercel 환경 변수 화면 확인: Vercel–Supabase 연동으로 POSTGRES_* , SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET 이 Production 에 이미 등록되어 있음 (값은 가려져 있어 어느 Supabase 프로젝트인지는 확인 못 함 → 배포 빌드 로그의 "supabase: 설정됨 (호스트)" 로 확인 예정).
- 사용자 결정(1번): 빌드가 PALJA_* 가 없으면 SUPABASE_URL / SUPABASE_ANON_KEY (및 NEXT_PUBLIC_* , SUPABASE_PUBLISHABLE_KEY) 를 읽도록 변경. 사용자가 Vercel 에 따로 입력할 필요 없음.
- 안전장치 강화: 키가 sb_publishable_ 이거나 JWT role=anon 일 때만 허용(service_role JWT, sb_secret_ → 빌드 중단), URL 은 https://xxxx.supabase.co 형식만. POSTGRES_* / SUPABASE_JWT_SECRET 은 읽지 않으며 번들에 들어가지 않음을 확인.
- 빌드 로그에 연결 대상 호스트와 사용한 변수 이름 표시.

## 2026-10-05 — 이름 변경 + 친구와 배틀 + Phase 9 QA

- 서비스 이름 팔자PLAY → 사주팔자PLAY (화면·공유·안내문·테스트).
- "내 캐릭터 자랑하기" → "친구와 배틀하기": `src/lib/battle/battle.ts` (링크 인코딩/검증, 라운드 대결, 조사 처리, 공유 문구), 화면(초대 배너, VS 결과, 리매치). 링크에 개인정보 없음. 이벤트는 기존 이름 + 속성(DB 변경 없음).
- QA 결과는 `docs/QA_REPORT.md`. 단위 189/189, E2E 33/33(320px 작은 폰 추가), 캡처 23장.

## 2026-10-05 — 배포 전 변경 (사용자 요청)

- 지시 문서 저장: `docs/PRODUCTION_PAYMENT_DIRECTION.md` (A 무료 Beta 배포 → B 토스 결제 TEST MODE).
- 가격 4,900원 → 2,900원 (3개 리포트). 관련 테스트 기대값 갱신(사용자 요청에 따른 사양 변경).
- 친구와 배틀하기: "배틀 닉네임"(안내: 실명 대신 별명을 추천해요) + "받을 친구 전화번호" → 휴대폰 문자 앱(sms:)으로 배틀 신청. 안내 문구 "전화번호는 저장되지 않으며 개인정보보호 처리됩니다."
  - 전화번호는 문자 앱 링크에만 쓰고, 보낸 직후 입력칸을 지움. 서버·Supabase·분석 이벤트·브라우저 저장소에 넣지 않음, 자동완성 저장 끔.
  - 다른 방법(카톡 공유·링크 복사)도 유지.
- 테스트: 단위 +3 (번호 검사, 문자 링크, 번호가 저장/전송 코드에 쓰이지 않음) → 192. E2E +2 (문자 보내기 흐름, 모든 인터넷 요청에 생년월일·시간·성별·전화번호·기둥이 없음) → 35/35.
  - 네트워크 검사 정규식이 셸 이스케이프로 깨져 0건만 검사하고 통과한 것을 발견 → 수정하고 "검사한 요청 수 > 5" 확인을 추가해 헛통과 방지.

## 2026-10-05 — A. 무료 Beta Production 배포 시작

배포 전 확인
- git: main 깨끗, origin/main 과 동일 (4098024).
- 비밀 키: 전체 git 히스토리에 실제 secret/service_role 키·JWT·토스 키·DB 비밀번호 없음 (`sb_secret_` 6건은 안전장치 코드·문서·가짜 테스트 값). `.env.local` 미추적, publishable 키도 커밋되지 않음.
- Supabase: 공개 키로 SELECT 401, UPDATE/DELETE 42501(권한 없음), UPSERT 401. 카탈로그 조회 결과 beta_feedback·beta_events 모두 anon=INSERT 만, authenticated 권한 없음, RLS ON, 정책은 INSERT(anon) 하나씩.
- 테스트: 단위 192/192, E2E 35/35, production 번들 검사(개발 코드·비밀 키·debug 없음).
- `vercel.json` main 자동 배포 다시 켬 → main push 로 Production 배포.

## 2026-10-05 — A. 무료 Beta LIVE 확인

- Vercel Production 배포 성공 (커밋 eb62bf2). 공개 주소 **https://palja-play.vercel.app** (로그인 없이 200). 개별 배포 주소(…-play-5e80.vercel.app)는 Vercel 기본 보호(Standard Protection)로 계속 로그인 필요 → 보호 설정 변경 불필요.
- 공개 번들 검사: Supabase 주소 = nqplgqhpkdnmubfycdbs, 키는 JWT role=anon (Vercel–Supabase 연동 값), 비밀 키·개발용 코드·localhost 없음, 가격 2900, /debug.html·/assets/debug.js 404, 보안 헤더(nosniff, referrer-policy) 적용.
- `scripts/prod-qa.mjs` (공개 URL 대상, Edge headless 2개 = 서로 다른 사용자): 11/11 통과.
  - 나: 랜딩 → 입력 → 계산 → 결과 → Premium(클릭·관심) → 피드백 → 배틀(문자 앱 열기 후 번호 지움, 링크 복사)
  - 친구(별도 프로필 브라우저): 배틀 링크 → 초대 → 입력 → 계산 → VS 결과 7라운드
  - Supabase POST 모두 201, source=production. 개인정보 네트워크 검사: 생년월일·시간·성별·전화번호·rawInput·pillars 가 어떤 인터넷 요청에도 없음. 접속 호스트: fonts.googleapis.com, fonts.gstatic.com, Supabase, palja-play.vercel.app.
  - 첫 실행에서 CORS 확인 요청(OPTIONS)까지 세어 실패 → POST 만 세도록 스크립트 수정 후 재실행.
- Supabase 대시보드 확인: production 피드백 2건(모두 "[PROD QA]" 표시, 실행 2회), development 1건("[연결 테스트]"), QA 세션 2개의 이벤트(클릭·관심 포함).
- iPhone Safari: 미확인 → **iPhone Safari manual QA required** (사용자 직접).

## 2026-10-05 — B. 유료결제 준비 (TEST MODE 구조, 키 연결 전)

- 토스 공식 문서 확인: confirm `POST /v1/payments/confirm`(Basic 시크릿키), `Idempotency-Key` 는 모든 POST 지원·15일·같은 키는 첫 응답 반환, 조회 `GET /v1/payments/orders/{orderId}`, 취소 `POST /v1/payments/{paymentKey}/cancel`, 결제창 v2 `js.tosspayments.com/v2/standard` + `ANONYMOUS`, orderId 6~64자. Vercel Functions: `api/*.ts` 에 `export async function POST(request: Request)`.
- 구현: `supabase/migrations/20261005010000_orders.sql`(RLS, 브라우저 권한 없음), `src/server/payments/*`(서버 가격·변조 차단·잠금+멱등 승인·reconcile·실패 기록·권한·환불), `src/server/premium/*`(서버 전용 정식 리포트: 31개 근거별 WHY 심화 + HOW 3가지 + 체크리스트, WHEN 제외), `api/*`(4개 함수), `api-lib/env.ts`(모드·키 검사, LIVE 잠금), `web/src/payments.ts`(결제창·successUrl/failUrl 처리·구매 코드·구매 다시 보기·다른 기기 복구), `scripts/local-server.ts`(로컬 결제 테스트 서버).
- 빌드 안전장치: 클라이언트 키 자리에 시크릿 키 → 중단, TEST 모드에 live 키 → 중단, LIVE 는 `PALJA_ALLOW_LIVE_PAYMENTS=yes` 없으면 중단. 서버 리포트 문구가 브라우저 번들에 0건.
- 결제 모드 기본 off → Production 화면은 기존 "준비 중" 그대로, api 는 503 PAYMENTS_DISABLED.
- 테스트: 결제 단위 25개(가짜 토스·저장소) 포함 217/217, E2E 35/35.
- 문서: `docs/PAYMENT_DESIGN.md`, `docs/PAID_LAUNCH_CHECKLIST.md` (법률 검토 미완료 명시).
- 남은 일(사용자 단계 필요): orders SQL 실행, 토스 TEST 키 발급·입력, Supabase service_role 키 입력 → 실제 TEST 결제.
- Vercel 배포 후 함수 4개가 FUNCTION_INVOCATION_FAILED. 원인: Node ESM 이 확장자 없는 import(`../src/server/...`)를 찾지 못함(로컬 재현: ERR_MODULE_NOT_FOUND). 해결: 소스를 `api-src/` 로 옮기고 `scripts/build-api.mjs` 로 함수별 단일 파일 `api/*.js` 생성·커밋. `npm run check` 에 생성 파일 최신 여부 검사 추가.
