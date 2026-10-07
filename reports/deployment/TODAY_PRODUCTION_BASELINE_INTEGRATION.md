# 오늘운세 실제 Production 기준 최소 통합 검증

작성일: 2026-10-07. 이번 단계는 로컬 후보 생성만 수행했다. push, main 병합, Preview/Production 배포, 환경 변수·DNS·DB 변경 및 실제 결제는 수행하지 않았다.

## 기준과 작업 단위

| 항목 | 확인 결과 |
|---|---|
| 실제 운영 브랜치 | `chatgpt/payment-tier-phase2` |
| 기준 SHA | `64fecd7a2acdd48b1f52460214d1c28f70307c4a` |
| 원격 확인 | 작업 시작 시 ls-remote 결과가 위 SHA와 일치 |
| 실제 운영 파일 | `/assets/app.js` HTTP 200, SHA256 `ff9cc814f7938128bbf333690c1aa9907d718c70220b1683c6ca89fd66b73143`; 작업 종료 확인도 동일 |
| 후보 브랜치 | `integration/prod-today` |
| 후보 작업공간 | `work/prod-today` |
| 후보 SHA | 이 보고서를 포함한 로컬 후보 커밋. `git rev-parse HEAD`로 확인 가능하며 최종 사용자 보고에 전체 SHA 제공 |
| 기존 작업 보존 | feature/daily-fortune HEAD·브랜치·status 동일, 62개 파일 SHA256 차이 0건 |

## 이식한 파일과 제외한 변경

커밋된 `feature/daily-fortune`의 오늘운세 구현을 파일/hunk 단위로 가져왔다. 브랜치 merge와 전체 commit cherry-pick은 하지 않았다. 해당 구현 이력은 c703ab2, 3a6f11a, 35215f1, 944dd5e, d897380, f496ca8, 915162b, 3525219다.

| 구분 | 후보 파일 |
|---|---|
| 오늘운세 계산 | `src/lib/daily/reading.ts` |
| 문구·개인화 | `web/src/dailyCopy.ts`, `web/src/dailyNarratives.ts` |
| 기기 프로필 | `web/src/profile.ts` |
| 화면·입력·CTA·진입 링크 | `web/src/main.ts`, `web/index.html`의 오늘운세 관련 hunk |
| 공개 SEO 콘텐츠 | `web/today-content.html` |
| 빌드·sitemap | `scripts/build.mjs`의 `/today` 생성 및 sitemap 경로 추가 hunk |
| 화면/정적 검사 | `scripts/e2e.mjs`의 오늘운세·V2 확인, `scripts/check-today.mjs`, `scripts/inspect-daily-copy.ts` |
| 단위 검사 | daily-copy, daily-language, daily-personalization, daily, profile, today-integration, today-multisample 테스트 및 `tests/tools/daily-copy-samples.ts` |
| 문서 | 기존 DAILY_FORTUNE / DAILY_LANGUAGE_REVIEW / DAILY_PERSONALIZATION / DAILY_STYLE_REVIEW 문서와 본 보고서 |

제외: 과거 무료 V2 파일 변경, 무료 결과 화면에 오늘운세 요약을 끼워 넣는 `renderDaily(c)` hunk, dirty feature 작업공간의 30종 캐릭터·새 공유카드·이미지, 과거 무료 V2 비교 문서/캡처, 다른 WORKLOG 변경. 기존 FREE_SAJU_V2 결과 렌더링 함수부터 파일 끝까지 기준본과 일치한다.

프로필 저장 UI와 불러오기 로직은 기존 오늘운세 구현의 공통 입력 화면에 있는 기능이다. 기본값은 저장하지 않음이며 사용자가 선택할 때만 기기 localStorage에 저장한다. 사주 계산·결과 본문·상품·결제 코드는 바뀌지 않는다. 오늘운세에서 CTA를 누르면 이미 계산한 Current 객체를 그대로 기존 결과 화면에 전달한다.

30종 캐릭터/subtype/characterVersion, 새 캐릭터 이미지 mapping, 공유카드 디자인, 결제·Premium·가격·Battle·관리자·Worker·DB migration·AdSense 코드 변경은 후보에 없다. 생성된 E2E 캡처는 후보 밖 검수 자료로 보존하고 commit에 포함하지 않는다.

## 계산과 승인 샘플

기존 엔진 그대로: 사용자 일간과 오늘 천간/지지 정기의 십성 가중치 ×4/×2. 확정 원국 기둥과 오늘의 간합·육합 +2, 간충·지지충 -2, 합충 합계 보정 ±6. 각 분야는 60점 기준에 가중치와 보정을 더한 뒤 0–100 범위로 제한한다. 다섯 분야 평균을 반올림한다. 오늘 TIER는 A≥80 / B≥70 / C≥60 / D<60이며 기존 팔자 TIER와 별개다. 전통 명리 확률이 아닌 PLAY 지표다.

1990-05-15 14:20 남성·양력·대한민국, 2026-10-06:

| 총점 | TIER | 재물 | 애정 | 직장·사업 | 인간관계 | 컨디션 |
|---|---|---|---|---|---|---|
| 64 | C | 64 | 62 | 72 | 58 | 66 |

총운: 새로운 생각이 떠오르면서 익숙한 경험에서도 힌트를 얻기 쉬운 날이에요. 오래 고민하기보다 해볼 만한 일 하나를 가볍게 시작해보세요.

재물: 눈길 가는 물건이 있어도 꼭 필요한지 함께 생각하게 되는 날이에요. 계획에 없던 구매라면 마음이 가라앉은 뒤 다시 골라보세요.

애정: 마음을 솔직하게 전하면서 상대의 생각도 알고 싶어질 수 있어요. 혼자 짐작했던 부분은 가볍게 물어보세요.

직장·사업: 그동안 익혀온 것에서 새로운 아이디어가 떠오를 수 있어요. 익숙한 일에 내 생각을 조금 더해보는 편이 좋아요.

인간관계: 내 의도와 다르게 말이 전해질 수 있는 날이에요. 바로 답하기보다 상대가 어떻게 받아들였는지 들어보세요.

컨디션: 계속 일을 붙잡기보다 쉬어가고 싶은 마음이 드는 날이에요. 잠깐 숨을 돌린 뒤 남은 일을 이어가는 편이 좋아요.

위 점수와 여섯 문장은 golden regression 테스트로 전부 정확히 비교해 통과했다.

## 입력·날짜·전환 검증

| 항목 | 결과 |
|---|---|
| 결정성 | 동일 명식/날짜의 계산·문구 동일. 기존 daily A/B/C/D 개인화 검사 통과 |
| KST 경계 | 기존 `Date.now()+9시간 → ISO 날짜` 사용. UTC 15:01=KST 00:01, UTC 14:59=KST 23:59, UTC 15:00에서 다음 날짜 전환 검사 통과 |
| 날짜 갱신 | 새 계산/재방문 및 '오늘 날짜로 확인하기'에서 최신 KST 날짜 계산. 숨겼던 탭이 다시 보일 때 날짜가 다르면 갱신 |
| 시간 미상 | hour null, 시주 contacts 없음, 반복 결과 동일 |
| 기기 저장 | opt-in 후 재방문 시 입력 재사용·동일 결과, 삭제 후 입력 화면으로 복귀. 저장 차단·손상 데이터 처리 및 구매 저장 보존 단위 검사 통과 |
| 중간 CTA | '내 사주팔자도 보기 →', 재입력 없이 기존 결과로 이동 |
| 하단 CTA | '🔮 내 사주팔자 확인하기', 기존 결과·Premium 상품·배틀·공유 버튼 확인 |
| 진입 링크 | 기존 홈 주요 영역에 '☀️ 무료 오늘운세' 링크 추가. 대규모 navigation 변경 없음 |
| 모바일 | 360/390/430px 및 desktop 1280px 결과 가로 넘침 없음. 전체 캡처 별도 보존 |

## SEO와 Preview 준비

`https://www.paljaplay.com/today`를 sitemap에 추가했다. title은 '무료 오늘의 운세 | 생년월일로 보는 오늘 사주 - 팔자PLAY'이며 description, canonical, OG가 빌드 시 생성된다. 입력 전 공개 HTML에는 계산 방법·띠 운세와 차이·제공 내용·매일 이용·양력/한국/1962년 이후/시간 미상/Beta 지원 범위가 있다.

로컬 production 산출물의 `/`, `/free-saju`, `/guide/saju`, `/today` HTTP 200, 각 title/description 고유성·canonical 유일성·index 설정, sitemap XML 및 robots 텍스트 검사 통과. robots 정책은 변경하지 않았다. 기존 네이버 인증과 AdSense 소유권 처리 코드는 보존했다. 로컬 빌드는 외부 키가 없는 환경이므로 실제 운영 환경 변수 값의 복제로 표현하지 않는다. 광고 스크립트는 추가하지 않았다.

다음 Preview 단계에서만 확인할 조건:

- Preview 전용 분석 공개 키가 비어 있는지 확인한다. 이전 Preview 연결 해제 승인이 있었다는 사실과 별개로 새 빌드의 환경을 다시 검증해야 한다.
- 빌드는 `PALJA_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등 fallback을 읽으므로 다른 공개 키로 운영 DB 분석 쓰기가 다시 연결되지 않아야 한다.
- Production 변수는 변경하지 않는다. Preview에서 실제 결제/운영 DB 쓰기 없이 화면과 정적 산출물을 검사한다.
- 실제 배포된 `/today` 경로·환경별 메타·Worker 정적 서빙은 Preview 배포 후 검증한다. 이번 단계에서 실환경 PASS로 주장하지 않는다.

## 보호 데이터와 테스트

| 검사 | 이번 후보 결과 |
|---|---|
| npm run check | 타입·API 검사, 276/276 단위 테스트 PASS |
| Cloudflare build | PASS, 로컬 payments off / Supabase 미설정 |
| 정적 /today SEO 검사 | PASS |
| 화면 E2E | 최종 51/51 PASS (기존 공유·Premium 화면 포함) |
| Battle E2E | 고정 dist-dev 빌드 단독 실행, 34/34 PASS |
| Mock 결제 | Node fake SDK/fetch/storage, 9/9 PASS. 실제 결제 아님 |
| 보호 표본 | 14,400 + 151 = 14,551개 |
| 계산 성공 | 14,549개. 나머지 2개는 기준/후보 동일 오류 응답이며 성공으로 집계하지 않음 |
| 보호 데이터 차이 | 0건: 사주·Signals·free 전체·7점수·TIER/percentile/topStat·캐릭터·Premium/리포트·상품·chartKey·Battle·공유 데이터/문구/카드 모델 |
| 재계산 차이 | 0건 |
| 무료 V2 중복/금지/길이/근거 ID 실패 | 각각 0건 |
| 무료 V2 분야별 고유 묶음 | 재물39 / 연애67 / 직업17 / 사업26 / 인간관계63, 기준과 후보 동일 |
| 보호 코드 diff | interpretation, resultView, saju, tier, battle, share, server, products, API, payments, resultCard, shareTools 변경 0건 |
| 기존 결과 렌더링 | renderResult부터 main.ts 끝까지 기준과 동일 |
| 기존 작업 62개 | byte hash·branch·HEAD·status 모두 동일 |
| 실제 운영 파일 | 작업 전후 동일 |

대표 기존 무료 결과도 기준과 동일: 경오/신사/경진/계미, 7점수 40/41/55/80/89/80/68, B+ TIER, 상위43.3%, 독립형 승부사, TOP 인간관계89/S/상위2.4%. 무료 V2 전체 문구·displayKeywords·legacy keywords·evidence·Premium 데이터 동일.

상세 검증 자료는 상위 작업 루트 `reports/deployment/`의 today-check-final.log, today-cloudflare-build.log, today-screen-final.log, today-battle.log, today-mock-results.json, today-protected-gate.json, today-preservation.json에 있다. 기존 승인 자료 복사가 아닌 이번 후보에서 실행한 결과다.

## 남은 범위와 판정

새로운 사주 이론·점수 기준·디자인은 추가하지 않았다. 현재 엔진의 절기/명리 검증 범위 및 양력 지원 한계는 그대로다. 같은 관계에서는 같은 문구가 나올 수 있다. 실제 iPhone·Galaxy·네이버 앱·카카오 전송과 실제 결제는 이번 로컬 검사의 범위 밖이다.

탭을 계속 켠 채 자정을 넘기면 타이머로 즉시 교체하지는 않는다. 다시 보이는 탭, 오늘 날짜 확인 버튼, 재계산에서 갱신되는 기존 동작을 유지했다. Preview에서는 이 동작과 기기 저장 UI의 범위를 사람도 확인할 것을 권장한다.

로컬 최소 후보에는 운영 기능 회귀나 unrelated runtime 혼입이 발견되지 않았다. Preview 검증 단계로 진행할 준비가 됐다. 운영 배포 승인이 아니며 rollback 기준점은 `64fecd7a2acdd48b1f52460214d1c28f70307c4a`다.

## 후속 1단계 지침에 따른 재감사 (2026-10-07, KST 21시대)

새 지침의 상태를 그대로 가정하지 않고 repository, remote, dirty 작업공간 및 Cloudflare 대시보드를 다시 읽었다. 이미 생성한 `integration/prod-today` 후보 `6e66113f6215fcc886e3582f8e535c11667e971a`를 재사용했다. 이 후속 감사에서는 서비스 runtime 변경 없이 다중 표본 테스트와 검증 자료만 보완했다. 최종 후속 commit SHA는 사용자 보고와 `git rev-parse HEAD`에서 확인한다.

### 실제 재확인한 상태

| 항목 | 결과 |
|---|---|
| repository / remote | `jeongboheon213-star/palja-play`, `https://github.com/jeongboheon213-star/palja-play.git` |
| 후보 시작 상태 | integration/prod-today / 6e66113 / git status clean |
| 원격 Production HEAD | 64fecd7a2acdd48b1f52460214d1c28f70307c4a, 예상과 동일 |
| 후보의 Production 공통 조상 | merge-base가 64fecd7 전체 SHA와 동일 |
| 실제 Cloudflare 배포 | 1cbe0258-73c8-4735-838a-c69984b89c78 / chatgpt/payment-tier-phase2 / 64fecd7 / success |
| Cloudflare Production 설정 | 운영 분기 chatgpt/payment-tier-phase2, 자동 배포 사용, npm run build:cloudflare, dist 출력 |
| 기존 feature HEAD | feature/daily-fortune / 28e8ce6f304531d564ff3561cab2e93b86b8c7fe |
| 기존 feature 상태 | 기존 dirty 상태 그대로. 파일 hash 62개 차이 0, branch/HEAD/status 동일 |
| 실제 WWW | 앱 파일 HTTP 200 및 기존 SHA256 일치 |
| 서비스 runtime | 후속 감사 시작 후보 6e66113 대비 변경 0건 |

대표 무료 사주의 추가 요청 값도 실제 계산 출력에서 확인했다: 일간 경금, 목/화/토/금/수=0/2/2/3/1, 총점453, 표시65점. PRODUCTS는 재물/연애/직업·사업 심층 리포트 각 2,900원이며 파일을 변경하지 않았다. 대시보드의 Production 결제 모드는 TEST이고 설정을 변경하거나 결제를 실행하지 않았다.

### 다중 명식 / 일간 검사

6개 출생 연도(1963/1978/1985/1990/2000/2014) × 12개월 × 시간 5종(00:01/06:20/14:20/23:59/미상) × 성별 2종 = 720개 명식. 날짜 2026-10-06/10-07/11-01 각각 계산해 2,160건을 검증했다. 시간 미상 명식은 144개, 그 오늘운세 결과는 432건이다.

10개 일간 모두 실제 표본에서 나왔다. 모든 표본의 5개 분야·점수 범위·평균 총점·TIER·총운/문구·퀘스트·십성/연락 근거 ID·확정 기둥만 사용하는 contact·반복 결과·원국/free/Premium 무변경을 검사했다. 오류/결정성 차이/근거 오류는 각각 0건이다.

아래는 각 일간에서 뽑은 실제 사례이며 날짜는 모두 2026-10-06, 남성, 출생시간00:01이다. 이 사례만 검사한 것은 아니며 전체에는 위 시간/성별/연도 조합이 포함된다.

| 일간 | 생년월일 | 총점/TIER | 재물/애정/직장·사업/인간관계/컨디션 |
|---|---|---|---|
| 갑 | 1985-01-15 | 74/B | 74/72/72/72/82 |
| 을 | 1985-02-15 | 71/B | 72/72/72/68/72 |
| 병 | 1978-03-15 | 75/B | 72/74/88/72/70 |
| 정 | 1963-03-15 | 65/C | 64/64/78/58/62 |
| 무 | 1963-01-15 | 74/B | 76/70/78/72/72 |
| 기 | 1963-02-15 | 73/B | 78/72/72/76/66 |
| 경 | 1963-08-15 | 68/C | 68/66/76/62/70 |
| 신 | 1963-09-15 | 74/B | 72/74/78/68/80 |
| 임 | 1963-11-15 | 68/C | 56/70/74/74/64 |
| 계 | 1985-03-15 | 68/C | 62/66/72/72/68 |

실제 사례별 재물 문구는 동반 파일 `TODAY_MULTISAMPLE_RESULT.json`에 저장했다. 예를 들어 무 일간 사례는 '새 물건보다 평소 쓰던 돈의 흐름이 눈에 들어오는 날이에요. 자주 쓰지 않는 정기 결제가 있다면 정리해보세요.'이고, 임 일간 사례는 '함께하는 소비에서는 내 몫이 어느 정도인지 신경 쓰일 수 있어요. 분위기에 맞추기 전에 부담 없는 금액부터 이야기해보세요.'다. 명식 관계가 같으면 같은 문장이 나올 수 있다는 기존 설계는 유지한다.

### 현재 Preview 설정의 실제 읽기 전용 조사

대시보드 `/settings/preview`에서 변수 이름과 필요한 상태만 확인했다. 저장·삭제·편집하지 않았고 암호화 비밀값을 열지 않았다.

| 현재 Preview 항목 | 확인 결과 |
|---|---|
| 변수 목록 전체 | PALJA_ADSENSE_PUBLISHER_ID, PALJA_PUBLIC_URL, PALJA_SUPABASE_URL의 3개 |
| 분석 공개 키 | PALJA_SUPABASE_ANON_KEY 및 SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY 없음 |
| 결제 모드/클라이언트 키 | PALJA_PAYMENTS_MODE / PALJA_TOSS_CLIENT_KEY 없음 |
| 서버 비밀값 | SUPABASE_SECRET_KEY / TOSS_SECRET_KEY 없음 |
| DB URL | URL은 남아 있지만 공개/서버 키가 없어 현재 목록만으로 분석 쓰기·서버 결제를 연결할 수 없음 |
| 공개 URL | https://www.paljaplay.com 유지. 기존 공유/SEO의 canonical 설정이며 Preview 배포를 뜻하지 않음 |
| Preview 분기 | Production이 아닌 모든 분기. 따라서 원격 push도 이번 단계에서는 하지 않음 |
| build/output | npm run build:cloudflare / dist |

현재 Preview 설정에는 추가로 제거할 연결 키가 발견되지 않았다. 다음 단계에서 이 상태를 유지하고 실제 Preview 빌드 로그의 Supabase 미설정 / payments off 및 생성 번들의 연결 차단을 다시 검사해야 한다. Production 환경 변수, Toss, DB, 광고 설정은 그대로 두어야 한다. 이번 단계에는 Preview 배포가 없으므로 실제 Preview 번들의 안전성을 검증 완료했다고 주장하지 않는다.

### 재실행 여부를 구분한 테스트 기록

| 검사 | 새 후속 지침 접수 후 재실행 | 결과 |
|---|---|---|
| npm run check | 예 | 276/276 및 타입/API 검사 PASS |
| 720명식/2,160오늘운세 | 예, 새 테스트 추가 | 10일간 전체, 오류·결정성·근거 차이0 |
| Cloudflare build | 예 | PASS, 로컬 외부 연결 없음 |
| 정적 today/SEO/robots/sitemap | 예 | PASS |
| Node Mock 결제 | 예 | 9/9 PASS |
| 14,551 운영 보호 비교 | 예 | 차이0, 동일 오류2를 성공으로 집계하지 않음 |
| 화면 E2E | 이 후속 감사에서는 재실행하지 않음 | 직전 후보 생성 단계 51/51 PASS. 이후 서비스 runtime 차이0 |
| Battle E2E | 이 후속 감사에서는 재실행하지 않음 | 직전 후보 생성 단계 34/34 PASS. 이후 Battle/runtime 차이0 |

과거 E2E를 이번 후속 감사에서 다시 실행한 것으로 표현하지 않는다. 이번에는 runtime 변경이 없고 추가된 것은 테스트/보고서뿐이므로 동일 화면 테스트를 반복하지 않았다. 실환경 화면 검사는 다음 승인된 Preview 단계에서 수행한다.

후속 감사 자료: 상위 작업 루트의 `reports/deployment/today-stage1-check.log`, `today-stage1-cloudflare-build.log`, `today-stage1-protected.log`, `today-multisample.json`, `today-preservation.json`. 최종 diff에는 기존 24개 후보 파일과 새 `tests/today-multisample.test.ts`, `reports/deployment/TODAY_MULTISAMPLE_RESULT.json`만 포함된다. 두 추가 파일은 tests/docs 범위다. 마케팅·신규 OG 이미지·광고·궁합·30종 캐릭터·신규 공유카드·상품/결제·DB/관리자/Worker 변경은 없다.

### 다음 담당자에게 남기는 상태

현재 후보를 그대로 재사용하고, 시작 시 git status·HEAD·Production remote를 다시 확인한다. Production이 달라졌다면 덮어쓰지 말고 중단한다. 최초 후보와 후속 감사는 로컬 commit뿐이다. 사용자 승인 전에는 원격 push/Preview/Production 배포를 하지 않는다. 최종 보고 후 대기한다.

TODAY 실제 Production 기준 통합 판정: GO
