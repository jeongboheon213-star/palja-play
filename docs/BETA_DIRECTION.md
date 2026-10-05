개발 방향을 변경합니다.

지금까지 진행한 검증 작업은 폐기하지 않습니다.

다만 모든 외부 검증이 완료될 때까지 서비스를 공개하지 않는 방식 대신, **Beta 서비스를 먼저 실제 배포하고 사용자 피드백을 받으면서 계산·해석·UX를 병행 개선하는 방향**으로 전환합니다.

목표는:

# 팔자PLAY Beta를 실제 사용자가 접속 가능한 상태까지 빠르게 완성하는 것

입니다.

기존 검증 원칙과 provenance 구조는 그대로 유지하세요.

---

# 전체 개발 원칙

두 개의 트랙으로 분리합니다.

## Track A — Beta Product

실제 사용 가능한 서비스를 빠르게 완성합니다.

## Track B — Verification

기존 계산 검증을 계속합니다.

두 트랙을 섞지 마세요.

Beta 출시를 위해 Verification 전체 완료를 기다리지 않습니다.

다만 검증되지 않은 계산을 검증됐다고 표현해서도 안 됩니다.

---

# 지금부터의 개발 순서

다음 순서로 진행합니다.

```text
Phase 3C
네 기둥

↓

Phase 3D
기본 사주 데이터

↓

Phase 4
Signals + Score

↓

Phase 5
FREE Reading

↓

Phase 6
PREMIUM Preview

↓

Phase 7
Web UI

↓

Phase 8
Feedback + Analytics

↓

Phase 9
Beta QA

↓

Phase 10
Deployment
```

Beta 배포 후 Verification Track을 계속 진행합니다.

---

# Phase 3B.1 처리

앞서 요청한 Solar Term 추가 검증 작업은 삭제하지 마세요.

다만 지금 당장은 실행하지 않고 다음 TODO로 이동합니다.

```text
Verification Backlog

- Solar Term formula audit
- Meeus source verification
- KASI comparison
- independent astronomy comparison
- solar-term external fixtures
- boundary accuracy measurement
```

AlphaSolarTermProvider는 계속:

```text
verificationStatus: not-verified
```

상태를 유지합니다.

---

# Phase 3C — Beta용 네 기둥 계산

이제 Phase 3C를 진행하세요.

구현:

```text
year pillar
month pillar
day pillar
hour pillar
```

각각 독립 함수로 만드세요.

예:

```ts
calculateYearPillar()
calculateMonthPillar()
calculateDayPillar()
calculateHourPillar()
```

---

# 연주

입춘을 경계로 계산합니다.

반드시 SolarTermProvider 결과를 소비하세요.

입춘 계산을 연주 함수 안에서 다시 구현하면 안 됩니다.

---

# 월주

절기(節) 경계를 사용합니다.

SolarTermProvider가 제공하는 절기 결과를 사용하세요.

절입 시간을 월주 코드에 하드코딩하지 마세요.

---

# 일주

기존에 사용했던 독립 계산 방식을 사용합니다.

기존 내부 대조 결과를 다시 확인하세요.

하지만 상태는:

```text
verified-internally
```

이상으로 올리지 마세요.

---

# 시주

출생 시간이 있을 때만 계산합니다.

시간 미상:

```text
hourPillar = null
```

입니다.

절대 임의의 시간을 넣지 마세요.

---

# Confidence와 BoundaryRisk

다음을 구분하세요.

```ts
confidence:
  | "confirmed"
  | "uncertain"
  | "unavailable"
```

그리고 별도로:

```ts
boundaryRisk: boolean
```

을 둘 수 있게 하세요.

의미:

### confirmed

현재 Alpha 엔진의 정책상 결과를 하나로 결정할 수 있음.

### uncertain

출생 시간 미상 등으로 현재 엔진에서도 어느 결과인지 결정할 수 없음.

### unavailable

계산 자체가 불가능함.

### boundaryRisk

현재 Alpha 엔진에서는 결과가 결정되지만 검증되지 않은 절기 경계 근처라 외부 엔진과 결과가 달라질 가능성이 있음.

예:

```text
confidence = confirmed
boundaryRisk = true
```

가 가능합니다.

---

# 중요한 Beta 원칙

boundaryRisk가 있다고 사용자의 전체 결과를 막지 마세요.

결과는 보여주되 내부 데이터에 위험 상태를 유지합니다.

나중에 UI에서는 필요하면:

"절기 경계에 가까운 출생 시각으로, Beta 계산 기준에 따라 결과가 달라질 수 있습니다."

정도로 안내할 수 있게 하세요.

---

# 시간 미상

시간 미상이라도 가능한 결과는 보여줍니다.

예:

```text
year pillar → confirmed
month pillar → confirmed
day pillar → confirmed
hour pillar → unavailable
```

절입 당일이고 시간 미상이라 월주를 확정할 수 없다면:

```text
month pillar → uncertain
```

으로 처리합니다.

임의 선택 금지.

---

# Beta 지원 범위

현재 Beta는 다음만 지원합니다.

```text
양력
1962-01-01 이후
대한민국 출생
```

음력은 UI에서:

```text
Beta 준비 중
```

으로 표시할 수 있습니다.

가짜 음력 변환을 구현하지 마세요.

---

# Phase 3D

3C 완료 후 다음을 구현할 예정입니다.

```text
Day Master
Five Elements
Ten Gods
Twelve Stages
Relations
```

단 TwelveStages는 계속:

```text
not-verified
```

상태를 유지합니다.

검증되지 않은 항목을 사용자 해석의 핵심 근거로 사용하지 않습니다.

---

# Phase 4 — Signals

사주 원본 데이터를 바로 문장으로 만들지 않습니다.

반드시:

```text
SajuData
↓
Signals
↓
Score
↓
Reading
```

구조를 유지하세요.

각 Signal에는 최소:

```ts
id
domain
polarity
strength
evidence
```

가 있어야 합니다.

---

# Phase 4 — 7개 점수

기존 UI의:

```text
재물력
연애력
사업력
직업력
인간관계
실행력
운의 흐름
```

을 유지합니다.

난수 금지.

같은 SajuData는 항상 같은 점수를 반환해야 합니다.

각 점수에는 근거 Signal ID를 저장하세요.

점수는 전통 사주의 절대적 측정값이라고 주장하지 않습니다.

팔자PLAY 서비스용 해석 지표입니다.

---

# Phase 5 — FREE 결과

FREE 결과는 충분히 재미있고 풍부해야 합니다.

최소:

```text
캐릭터
핵심 성향 5~7
강점 5+
주의점 3+
오행 밸런스
7개 능력치
재물
연애
직업
사업
인간관계
인생 키워드
반전 포인트
```

를 제공합니다.

---

# 개인화 반전 문장

반드시 실제 Signal 근거가 있을 때만 생성하세요.

예:

```text
돈을 벌 때는 과감하지만
지킬 때는 신중한 타입
```

같은 문장을 무조건 넣으면 안 됩니다.

동일 domain 안에서 실제 반대 polarity signal이 있을 때만 생성하세요.

---

# Phase 6 — PREMIUM

Beta에서는 실제 결제를 아직 구현하지 않습니다.

대신 PREMIUM preview를 만드세요.

FREE:

```text
WHAT
나는 어떤 사람인가
```

PREMIUM:

```text
WHY
왜 이런 패턴이 생기는가

HOW
어떻게 활용할 것인가

WHEN
언제 흐름이 강해지는가
```

라는 구조 차이를 유지합니다.

단 실제 대운/세운 계산이 아직 구현되지 않았다면 WHEN을 가짜로 만들면 안 됩니다.

그 경우:

```text
준비 중
```

으로 표시하세요.

---

# 가격 테스트

Beta UI에서는 상품 가격을 표시할 수 있습니다.

하지만 실제 결제는 하지 않습니다.

예:

```text
재물 심층 리포트
4,900원

연애 심층 리포트
4,900원

직업/사업 심층 리포트
4,900원
```

가격은 Beta 테스트 값임을 코드 설정으로 관리하세요.

사용자가 버튼을 눌렀을 때 결제 대신:

```text
팔자PLAY Beta에서 준비 중인 기능입니다.
```

를 보여주세요.

그리고 가능하다면 클릭 이벤트를 기록할 수 있는 구조를 만드세요.

목적은 구매 의향 측정입니다.

---

# Phase 7 — UI

기존:

`palja-play-preview.html`

의 디자인을 최대한 유지합니다.

특히:

* dark purple
* gold
* jade
* mobile-first
* card UI
* 계산 애니메이션
* 캐릭터 카드
* 능력치
* premium lock

을 살립니다.

계산 Mock은 모두 제거합니다.

실제 Alpha 계산 엔진과 연결하세요.

---

# Beta 표시

사이트 어딘가에 과도하게 방해되지 않는 수준으로:

```text
팔자PLAY Beta
```

를 표시하세요.

그리고 결과 페이지 하단에:

```text
팔자PLAY는 전통 명리 요소를 기반으로 만든
엔터테인먼트 서비스입니다.

현재 Beta 기간 동안 계산 및 해석 시스템을
지속적으로 검증하고 개선하고 있습니다.
```

와 같은 안내 영역을 준비하세요.

---

# Phase 8 — 사용자 피드백

이것은 Beta의 핵심 기능입니다.

결과 페이지에 반드시 추가하세요.

질문:

```text
이 결과가 나와 얼마나 비슷했나요?
```

1~5점.

예:

```text
1 전혀 아님
2
3 보통
4
5 매우 비슷함
```

추가 선택:

```text
가장 잘 맞았던 부분은?
□ 성격
□ 재물
□ 연애
□ 직업
□ 사업
□ 인간관계
```

그리고:

```text
안 맞았던 부분
```

선택/텍스트 입력.

마지막:

```text
자유 의견
```

텍스트 입력.

---

# 중요한 피드백 데이터

가능하면 피드백에는 원본 생년월일 대신:

```text
resultId
engineVersion
schemaVersion
interpretationVersion
scoreVersion
solarTermProviderVersion
```

등을 연결하세요.

향후 엔진을 수정했을 때:

```text
v0.1 결과 만족도
vs
v0.2 결과 만족도
```

를 비교하기 위한 것입니다.

불필요하게 개인정보를 저장하지 마세요.

---

# Phase 8 — 행동 데이터

Beta에서 최소 다음 행동을 측정할 수 있게 이벤트 구조를 준비하세요.

```text
landing_view
input_start
calculation_complete
result_view
share_click
premium_money_click
premium_love_click
premium_career_click
feedback_submit
```

분석 서비스 자체 선택은 현재 환경에 맞게 결정하되, 특정 외부 서비스가 없다고 가짜 연결하지 마세요.

연결할 수 없다면 이벤트 인터페이스와 로컬 개발 구현까지만 만드세요.

---

# Beta에서 알고 싶은 핵심 숫자

향후 다음을 계산할 수 있어야 합니다.

```text
방문 → 입력 시작률

입력 → 결과 완료율

결과 → 공유율

결과 → Premium 클릭률

평균 만족도

5점 비율

가장 잘 맞는 영역

가장 안 맞는 영역
```

---

# Phase 9 — QA

배포 전 최소 확인:

```text
모바일
PC
Chrome
Safari 가능 범위
Edge
새로고침
잘못된 입력
시간 미상
절입 경계
DST
공유
피드백
Premium 버튼
```

그리고 사용자에게 코드 오류나 debug 정보가 그대로 노출되지 않게 하세요.

`/debug/saju`는 production에서 일반 사용자에게 공개하지 않거나 보호하세요.

---

# Phase 10 — 실제 배포

목표는:

GitHub main
→ production build
→ public URL

입니다.

현재 환경에서 가능한 배포 방식을 조사하세요.

Next.js/Vercel이 현재 프로젝트 구조상 가장 현실적이면 마이그레이션/설정하세요.

하지만 npm/network 제약 때문에 불가능하다면 억지로 Next.js를 사용하지 말고 현재 정적 구조를 실제 배포 가능한 형태로 완성하는 것을 우선하세요.

중요:

"배포됐다"고 말하려면 실제 public URL에서 접속 확인까지 해야 합니다.

로컬 서버 실행만으로 배포 완료라고 보고하지 마세요.

---

# GitHub

현재 저장소:

`jeongboheon213-star/palja-play`

main을 계속 사용하세요.

각 Phase마다 의미 있는 커밋을 남기세요.

기존 검증 코드와 테스트를 삭제하지 마세요.

---

# 앞으로 진행 방식 변경

이제 매 작은 Phase마다 제 승인을 기다리면 Beta 출시가 너무 늦어집니다.

따라서 다음 방식으로 진행하세요.

Phase 3C부터 Phase 6까지는 연속으로 진행해도 됩니다.

단 각 Phase마다:

* 테스트
* 커밋
* 간단한 작업 로그

를 남기세요.

Phase 6까지 완료한 뒤 한 번 보고하세요.

그 다음 Phase 7~8을 진행하고 다시 보고하세요.

Phase 9 QA 결과를 보고한 뒤 실제 Production 배포 직전에 멈추세요.

배포 방식과 설정을 확인한 후 Production 배포를 진행합니다.

---

# 최우선 목표

현재 목표는:

"완벽하게 검증된 만세력"

을 먼저 만드는 것이 아닙니다.

현재 목표는:

**실제 사용자가 팔자PLAY를 사용하고 결과를 보고 공유하고 피드백을 남길 수 있는 Beta 제품을 빠르게 공개하는 것**

입니다.

그러나 속도를 위해 다음 원칙은 희생하지 마세요.

* 난수 금지
* 가짜 계산 금지
* 가짜 음력 변환 금지
* 가짜 AI 결과 금지
* 시간 미상 임의 보정 금지
* 검증되지 않은 것을 검증됐다고 표현 금지
* calculation provenance 유지
* deterministic calculation 유지

이제 Phase 3C부터 시작하세요.

Phase 3C → 3D → 4 → 5 → 6까지 진행한 후 통합 보고하고 멈추세요.
