# 팔자PLAY Alpha v0.1 — 작업 지침 (Claude Code용)

AI 사주 해석 엔터테인먼트 웹서비스. 사용자는 코딩 초보 1인 사업자(한국어로 소통). 보고는 한국어, 쉬운 말로.

## 개발 방향 (최신, 반드시 먼저 읽을 것)
**`docs/BETA_DIRECTION.md`** 가 현재 개발 방향이다 (Beta 우선 배포 + 검증은 별도 트랙). 아래 진행 규칙은 그 문서가 우선한다.
- Track A(Beta Product)와 Track B(Verification, `docs/VERIFICATION_BACKLOG.md`)를 섞지 않는다.
- 순서: 3C 네 기둥 → 3D 기본 사주 데이터 → 4 Signals+Score → 5 FREE → 6 PREMIUM Preview → (통합 보고) → 7 UI, 8 피드백/분석 → (보고) → 9 QA → (보고) → **Production 배포 직전 멈춤**.
- 3C~6은 연속 진행 가능. 각 Phase마다 테스트·커밋·간단한 작업 로그(`docs/WORKLOG.md`)를 남기고, Phase 6 완료 후 한 번 통합 보고.
- 배포 완료 보고는 실제 public URL 접속 확인 후에만.

## 진행 규칙
- (이전 규칙) 단계별 사용자 확인 대기는 위 "개발 방향"으로 대체되었다. 단, 보고 후 멈추라고 지시된 지점에서는 반드시 멈춘다.
- 보고 형식: 만든 것 / 테스트한 것 / 테스트 결과 / 아직 구현하지 않은 것 / 현재 위험요소 / 다음 Phase.
- 검증되지 않은 것을 "정확한 만세력/검증됨"이라 표현 금지. 상태는 `src/lib/saju/verification.ts`가 기준.
- 금지: 난수, 현재 시각·OS 시간대 의존, 임의 시간/기둥 생성, 음력→양력 추측, uncertain을 confirmed로 변환, AI가 사주 계산, 네트워크 제한 우회.

## 구조 (계층, 각자 교체/독립 테스트 가능)
Validation → CalendarProvider → TimeNormalizer → SolarTermProvider → SajuCalculator → SajuData → Signals → Scoring → FREE/PREMIUM
- `src/lib/saju` 계산 계층 (데이터는 주입받음, `src/data` 직접 import 금지, Date 생성/시계 금지)
- `src/lib/validation`, `src/lib/interpretation`(타입만), `src/lib/engine`(조립 지점), `src/data`

## Alpha 정책 (최종 정답 아님, `policies.ts`에서 교체)
양력만 / 한국 출생 / 1962-01-01 이후 / historicalOffsets ON(코드 고정 데이터) / longitudeCorrection false(기준경도 127.5는 옵션으로 보존) / jasiPolicy "midnight" / SolarTermProvider = alpha (not-verified).

## 현재 상태
- Phase 2 완료(승인): 타입·정책·검증 상태·입력 검증·PRODUCTS·버전.
- Phase 3A 완료(승인): 한국 시간 이력 + TimeNormalizer (gap/overlap/시간 미상).
- Phase 3B 완료: 24절기 정의 + AlphaSolarTermProvider(internal-alpha, not-verified) + 절기 컨텍스트(시간 미상 → uncertain/NEEDS_BIRTH_TIME_FOR_SOLAR_TERM_DAY). 연주/월주는 아직 없음.
- 외부 기준 대조(KASI 등): NOT RUN. 확보하면 `tests/fixtures/solar-term-reference.json` 에 넣는다(가짜 데이터 금지).
- Phase 3C 완료: 네 기둥 (`src/lib/saju/pillars/`), confidence + boundaryRisk, 시간 미상 시주 null.
- Phase 3D 완료: SajuData(`src/lib/saju/chart/`) 일간·오행·지장간·십성·12운성(unverified, 해석 비연결)·관계. uncertain 기둥은 제외 목록으로.
- Phase 4 완료: Signals(`src/lib/interpretation/signals.ts`) + 7개 점수(score-0.1.0, 서비스 지표). 12운성 미사용.
- Phase 5 완료: FREE 결과(`src/lib/interpretation/free.ts`), 모든 문장 Signal 근거, 반전은 반대 polarity 있을 때만.
- 테스트·tsc 통과 (개수는 docs/WORKLOG.md). 환경 비교: `tests/tools/env-hash*.ts`.

- Phase 6 완료: PREMIUM 미리보기(WHY/HOW 한 줄 + WHEN 준비 중), 3종 리포트 4,900원(Beta 테스트 가격, 결제 없음), 이벤트 이름·sink 구조(`src/lib/analytics/events.ts`). 진입점 `engine.computeBetaResult()`.
- 3C~6 통합 보고 완료 → **사용자 승인 후** Phase 7(UI)·8(피드백/분석) 진행.

## 다음: Phase 7 Web UI + Phase 8 Feedback/Analytics (승인 대기)
`팔자PLAY 미리보기.html`(작업 폴더 상위) 디자인 유지(dark purple/gold/jade, 모바일 우선, 카드, 계산 애니메이션, 캐릭터 카드, 능력치, premium lock). Mock 계산 제거하고 `computeBetaResult` 연결. "팔자PLAY Beta" 표시, 결과 하단 `BETA_DISCLAIMER`. 피드백(1~5점, 잘 맞은/안 맞은 영역, 자유 의견)은 생년월일 대신 resultId + versions 로 저장. 이벤트 9종. 외부 분석 서비스 가짜 연결 금지.

## 명령
- `npm install` 후 `npm run check` (typecheck + test). Node.js LTS 필요 (Windows 설치 경로 `C:/Program Files/nodejs`, Git Bash 에서는 PATH 에 추가 필요).
- 환경 비교: `TZ=UTC npx tsx tests/tools/env-hash.ts` (해시가 TZ/locale과 무관해야 함)

## 알려진 위험
절기 모델 오차 미측정(수 분~최대 약 15분 가능, 외부 대조 전) / 시간 이력은 tzdata 단일 출처(not-verified) / 1961-08-10은 범위 밖 처리 / 1954-03-21 출처 간 30분 불일치(범위 밖) / 시간 미상+경도 보정 ON 시 날짜 불확실 / overlap 시각 UX 미정.
