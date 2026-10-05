# Phase 9 QA 보고 (2026-10-05)

대상: 사주팔자PLAY Beta (이름 변경 + 친구와 배틀 포함), 커밋 기준 main.
Production 배포는 하지 않음 (Vercel main 자동 배포 꺼짐).

## 자동 검사

| 항목 | 결과 |
|---|---|
| 단위 테스트 (`npm run check`) | 189 / 189 통과, tsc(엔진 + 웹) 통과 |
| 실제 브라우저 E2E (`npm run e2e`, Edge 154 headless) | 33 / 33 통과, 페이지·콘솔 오류 0 |
| 환경 독립성 (`tests/tools/env-hash-result.ts`) | TZ=UTC / America/New_York 결과 해시 동일 (`bd18ba7`) |
| Production 번들 | 116KB (gzip 약 41KB), debug 화면 없음, 개발용 코드 0건, 비밀 키 흔적 0건, 옛 이름 0건 |
| Production 빌드 로컬 실행 | 계산·결과·배틀 링크 생성/입장·배틀 결과 정상, `/debug.html` 404, 개발 hook 없음 |

## 체크리스트 (BETA_DIRECTION Phase 9)

| 항목 | 결과 | 비고 |
|---|---|---|
| 모바일 | ✅ | 390x844, 320x640(작은 폰) 가로 넘침 없음 |
| PC | ✅ | 1280x900 중앙 정렬, 넘침 없음 |
| Chrome | △ | 이 PC 에 Chrome 없음. Edge(같은 Chromium 엔진)로 확인 |
| Safari | ❌ 미확인 | Windows 에서 불가. 실제 iPhone 확인 필요 |
| Edge | ✅ | E2E 전체 |
| 새로고침 | ✅ | 처음 화면, 입력 정보 남지 않음 |
| 잘못된 입력 | ✅ | 빈 값, 1961, 미래 날짜 |
| 시간 미상 | ✅ | 결과 표시 + 시간 입력 권유, 시주 "–" |
| 절입 경계 | ✅ | 자연어 안내, 결과 표시. 입춘 당일 시간 미상 → 연·월주 "?" |
| DST | ✅ | 없는 시각 안내, 두 번 있는 시각 선택지 |
| 공유(배틀) | ✅ | Web Share / 클립보드 / 직접 복사, 링크에 개인정보 없음 |
| 배틀 입장·결과 | ✅ | 초대 배너, 7라운드, 승패·총점, 리매치, 조작 링크 무시 |
| 피드백 | ✅ | 개발: Supabase 실제 저장 확인 / E2E: 저장 없이 레코드 검사 |
| Premium 버튼 | ✅ | 결제 없음, 클릭·관심 이벤트 분리 |
| 개발자 용어·debug 노출 | ✅ | 화면 문구 검사, production 에 debug 없음 |

## 이번에 바뀐 것
- 서비스 이름: 팔자PLAY → **사주팔자PLAY** (로고, 제목, 안내문, 공유 문구, Premium 안내).
- 결과 맨 끝 "내 캐릭터 자랑하기" → **"친구와 배틀하기"**.
  - 배틀 링크 `#b=b1~캐릭터~점수7개~닉네임` (URL 조각이라 서버로 전송되지 않음). 생년월일·시각·성별·간지 없음.
  - 링크를 연 친구: 초대 배너(상대 점수는 숨김) → 자기 팔자 입력 → 결과 상단에 VS 배틀 결과(7라운드, 라운드 승수 → 총점 → 무승부).
  - 리매치·다른 친구에게 도전장 보내기. 조작·손상 링크는 무시하고 평소처럼 진행.
  - 이벤트는 DB 변경 없이 기존 이름에 속성 추가: `landing_view.via`(direct/battle/battle-invalid), `result_view.battleOutcome`, `share_click.mode=battle/rematch`.

## QA 중 발견해서 고친 것
- 이미 열린 탭에 배틀 링크를 붙여 넣으면 페이지가 다시 시작되지 않아 배틀이 안 보임 → 링크가 바뀌면 새로 시작.
- 배틀 문구 조사 오류("6로", "친구을(를)") → 받침 판별 + 문장 수정.
- production 번들에 개발용 콘솔 기록·로컬 저장 코드가 남아 있음(사용되진 않음) → 빌드에서 제거.

## 남은 위험 / 배포 전 확인
1. Safari·실제 iPhone/Android 미확인 (특히 날짜·시간 입력창 모양, 공유 시트).
2. Vercel 의 SUPABASE_URL 이 같은 프로젝트(nqplgqhpkdnmubfycdbs)인지 → 배포 빌드 로그 "supabase: 설정됨 (호스트)" 로 확인.
3. Supabase 공개 키로 누구나 INSERT 가능 → 스팸 위험. CHECK 제약으로 모양만 제한. 사용자 늘면 속도 제한 검토.
4. 배틀 점수는 링크를 고치면 조작 가능 (재미용 기능이라 허용, 안내 문구 있음).
5. 개발 중 테스트 기록(source=development)이 Supabase 에 있음 → 분석 시 production 만 보거나 삭제.
6. 계산 검증 상태는 그대로 (일주만 verified-internally, 나머지 not-verified).
