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
- 테스트·tsc 통과 (개수는 docs/WORKLOG.md). 환경 비교: `tests/tools/env-hash*.ts`.

## 다음: Phase 3C 부터 연속 진행 (docs/BETA_DIRECTION.md 승인됨, 3C→3D→4→5→6 후 통합 보고)
네 기둥을 각각 독립 함수로(calculateYearPillar/MonthPillar/DayPillar/HourPillar). 연/월주는 SolarTermProvider 결과만 소비한다(절기 계산 코드를 넣지 않는다). 각 결과에 stem/branch/ganji/confidence/evidence/policy 의존성/verification 포함. 일주는 기존 독립 공식과 1930-01-01~2026-10-04 전체 재대조(verified-internally 초과 금지). 이후 3D(십성/12운성/합충형, 해석과 분리), 그 뒤 Signals·점수·FREE/PREMIUM·UI.

## 명령
- `npm install` 후 `npm run check` (typecheck + test). Node.js LTS 필요 (Windows 설치 경로 `C:/Program Files/nodejs`, Git Bash 에서는 PATH 에 추가 필요).
- 환경 비교: `TZ=UTC npx tsx tests/tools/env-hash.ts` (해시가 TZ/locale과 무관해야 함)

## 알려진 위험
절기 모델 오차 미측정(수 분~최대 약 15분 가능, 외부 대조 전) / 시간 이력은 tzdata 단일 출처(not-verified) / 1961-08-10은 범위 밖 처리 / 1954-03-21 출처 간 30분 불일치(범위 밖) / 시간 미상+경도 보정 ON 시 날짜 불확실 / overlap 시각 UX 미정.
