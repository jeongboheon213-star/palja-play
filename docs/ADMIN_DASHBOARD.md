# 운영자 통계 페이지 (`/admin.html`)

피드백·행동 이벤트를 모아 통계로 보여 주는 운영자 전용 화면. 주소: https://palja-play.vercel.app/admin.html

## 보이는 것
- 핵심 숫자: 방문자, 결과 본 수, 피드백 수·참여율, 평균 공감도(5점), 배틀 공유율, 유료 리포트 관심
- 한눈에 요약 (숫자를 문장으로)
- 방문 → 입력 → 계산 → 결과 → 공유·피드백 단계별 흐름 (어디서 많이 빠지는지)
- 날짜별 추이 (한국 날짜 기준)
- 피드백: 공감도 분포, 공유 의향, 잘 맞은/안 맞은 영역, 캐릭터별·출생시간 입력 여부별·절기 경계별·해석 버전별 평균 공감도
- 유입(직접/배틀 링크), 공유 방법·기기, 배틀 승패, 나온 캐릭터 분포
- 사용자 의견 (최신 200건, 검색 가능), 피드백 엑셀(CSV) 내려받기
- 기간: 24시간 / 7일 / 30일 / 90일 / 1년, 대상: 실제 사용자 / 개발·테스트 / 전체

## 처음 한 번 설정 (사용자 작업)
1. 운영자 비밀번호 만들기: 터미널에서 `npm run admin:token` → 32자 무작위 문자열이 나온다 (어디에도 저장되지 않음).
2. Vercel → palja-play → Settings → Environment Variables
   - `ADMIN_DASHBOARD_TOKEN` = 1번 값 (Production 체크, Sensitive 켜기)
   - `SUPABASE_SECRET_KEY` 가 Production 에 없다면 함께 추가 (Supabase → Settings → API Keys → Secret keys 복사)
3. Deployments 에서 최신 Production 배포 → Redeploy (환경 변수는 다시 배포해야 적용됨)
4. `/admin.html` 에서 비밀번호 입력

비밀번호는 비밀번호 관리 앱 등에 보관하고 채팅·GitHub 에 올리지 않는다. 바꾸고 싶으면 1~3을 다시 하면 예전 비밀번호는 바로 무효.

## 보안
- 서버(`/api/admin/stats`)가 운영자 비밀번호를 확인한 뒤에만 Supabase 를 읽는다. 24자 미만이거나 미설정이면 잠김(503). 틀리면 0.7초 지연 후 401.
- Supabase Secret Key·운영자 비밀번호는 서버 환경 변수에만 있고 화면 코드에 없다 (테스트로 검사).
- 비밀번호는 브라우저 탭의 sessionStorage 에만 (탭을 닫으면 사라짐). [잠그기] 버튼으로 즉시 삭제.
- 화면은 검색엔진 노출 차단(noindex), 다른 사이트에 끼워 넣기 차단, 캐시 안 함.
- 읽는 컬럼은 정해진 목록뿐이며 생년월일·출생시간·성별·이름·전화번호는 저장 자체를 하지 않는다. 사용자 의견은 HTML 이 아닌 글자로만 표시, CSV 는 엑셀 수식 실행 방지 처리.

## 해석 시 주의
- "방문자"는 브라우저 세션 기준이라 같은 사람이 다른 기기로 오면 2명으로 센다.
- 피드백 30건 미만이면 비율·평균은 참고용 (화면에 안내가 뜬다).
- "유료 리포트 관심"은 결제 전 클릭·관심 버튼이며 실제 결제 수가 아니다.
- 한 번에 최대 5만 행까지 집계. 넘으면 화면에 안내 → 기간을 줄여서 본다.

## 코드
- 집계(순수 함수): `src/server/admin/stats.ts` · 비밀번호 확인·Supabase 읽기: `api-lib/admin.ts` · API: `api-src/admin/stats.ts` → `api/admin/stats.js`
- 화면: `web/admin.html`, `web/src/admin.ts` · 테스트: `tests/admin.test.ts`
