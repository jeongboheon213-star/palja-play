# 팔자PLAY Alpha v0.1 — 작업 지침 (Claude Code용)

AI 사주 해석 엔터테인먼트 웹서비스. 사용자는 코딩 초보 1인 사업자(한국어로 소통). 보고는 한국어, 쉬운 말로.

## 진행 규칙
- 단계(Phase)별로 구현 → 테스트 → 보고 후 **사용자 확인 전에는 다음 단계 시작 금지**.
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
- Phase 3A 완료(확인 대기): 한국 시간 이력 + TimeNormalizer (gap/overlap/시간 미상, tzdata 대조 10,704건 일치, TZ 3종 해시 동일).
- 테스트 50개 통과, tsc 통과.

## 다음: Phase 3B (사용자가 시작을 확인하면)
AlphaSolarTermProvider(not-verified, 자체 계산, 이름/termInstantUtc/이전·다음 절기/경계 거리/boundaryWarning/provider 이름·버전), `boundaryWarningMinutes`를 `reason: "alpha-provisional"` 정책값으로, 시간 미상+절입 당일은 `effectiveDayRangeUtc`로 판정(uncertain/unavailable + 구조화 warning, 결과 페이지는 막지 않음), 절입 경계 테스트(1분 전/정각/1분 후/30분 전/후, 입춘 강화).
이후 3C(네 기둥, 일주는 기존 독립 공식 1930-01-01~2026-10-04 재대조, verified-internally 초과 금지), 3D(십성/12운성/합충형, 해석과 분리), 그 뒤 Signals·점수·FREE/PREMIUM·UI.

## 명령
- `npm install` 후 `npm run check` (typecheck + test). 설치 후 `tests/node-shim.d.ts` 삭제.
- 환경 비교: `TZ=UTC npx tsx tests/tools/env-hash.ts` (해시가 TZ/locale과 무관해야 함)

## 알려진 위험
시간 이력은 tzdata 단일 출처(not-verified) / 1961-08-10은 범위 밖 처리 / 1954-03-21 출처 간 30분 불일치(범위 밖) / 시간 미상+경도 보정 ON 시 날짜 불확실 / overlap 시각 UX 미정.
