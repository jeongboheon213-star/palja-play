# 팔자PLAY 검색 유입 감사 — 2026-10-06

## 운영 반영 전 최종 검증 (최신 판단)

사용자가 확정한 대표 주소는 **https://www.paljaplay.com**이다. 아래 초기 감사의 apex 주소 제안은 이 결정으로 대체한다. 메인·/free-saju·/guide/saju의 canonical, og:url, JSON-LD 및 sitemap/robots 생성 주소를 www 기준으로 수정했다.

- npm run check: 257개 통과, 실패/건너뜀 0. npm run build와 npm run build:cloudflare 모두 성공.
- 운영 빌드 dist를 로컬 HTTP로 제공해 5개 URL 모두 200 확인. robots는 text/plain, sitemap은 application/xml이며 메인 HTML이 아니다. 서로 다른 제목/설명, www canonical, 일반 a 링크 및 sitemap의 정확한 3개 URL을 검증했다.
- 기존 AdSense 검증 스크립트 1개 통과. 광고 설정/계산/티어/배틀/결제/LIVE/환경 변수는 변경하지 않았다. 로컬 빌드는 운영 환경 변수가 없는 상태이며 실제 결제나 운영 사용자 흐름 전체를 검증한 것은 아니다.
- 실제 www 운영 응답: 루트는 기존 메인 HTML 200. 새 페이지 두 경로와 robots/sitemap도 기존 메인 HTML 200을 반환하므로 SEO 운영 반영은 아직 실패/미완료다.
- apex는 www로 308 영구 이동하며 /free-saju의 경로와 쿼리도 보존한다. 이번 작업에서 도메인 설정은 변경하지 않았다. 기존 Vercel 주소는 여전히 200으로 중복 후보다.
- main 병합 보류: origin/main 대비 87개 파일 변경이 포함되며 결제/관리자 등 SEO 밖의 변경도 들어간다. 현재 운영 브랜치 chatgpt/payment-tier-phase2 대비 SEO 변경은 8개 파일이다. vercel.json은 main 배포를 활성화한다. Cloudflare의 실제 Production branch를 대시보드에서 다시 확인하고 배포 경로를 확정해야 한다. main 병합이 현재 www 운영 배포를 안전하게 수행한다고 판단할 수 없다.
- 안전한 다음 단계: Cloudflare Production branch를 확인한 뒤 SEO 8개 파일만 현재 운영 기준에 반영하는 경로 또는 main 통합을 별도로 결정한다. Vercel 중복은 기존 API/결제 callback 의존성을 확인한 뒤 공개 페이지 GET/HEAD 이동만 별도 설정한다. 이번 작업에서는 어느 호스팅 설정도 변경하지 않았다.
- main 병합/운영 배포/Search Console 제출은 수행하지 않았다. 운영 robots/sitemap이 올바른 파일을 반환하기 전 제출하지 않는다.

이하 표는 초기 감사 당시의 관찰이며 최신 운영 결과는 위 기록을 우선한다.

## 범위와 결론

실제 저장소 코드와 세 공개 주소의 HTTP 응답을 확인했다. Search Console/네이버 서치어드바이저 계정의 색인·검색량·순위는 조회하지 않았다. 검색 로봇의 실제 크롤링 성공이나 현재 순위를 검증했다고 말하지 않는다.

별도 브랜치 `seo/audit-foundation`에서 기본 검색 메타데이터와 검색 파일만 준비한다. main 및 Cloudflare Production 브랜치에 병합/배포하지 않는다. 랜딩페이지를 만들지 않는다. 사주·티어·배틀·Premium·결제 로직, 환경 변수 및 SQL은 변경하지 않는다.

## 18개 점검 결과 (수정 전 공개 서비스 기준)

| 항목 | 실제 확인 결과 | 조치 |
|---|---|---|
| 1 대표 주소 | paljaplay.com과 www 모두 HTTP 200. 코드의 canonical 없음. 기존 공개 공유 주소 설정은 www였으므로 기술적으로 대표 주소가 통일되지 않음 | 사용자 요청 주소에 맞춰 https://paljaplay.com/을 새 대표 주소로 제안. 별도 브랜치 메타데이터에 반영 |
| 2 301 통일 | 두 루트 모두 Location 없이 200. 루트 간 301 없음 | 배포 전 Cloudflare 도메인 리디렉션 별도 설정 필요. 이번 작업에서 런타임/도메인 설정 변경하지 않음 |
| 3 Vercel 중복 | palja-play.vercel.app도 같은 제목/HTML로 200, canonical 없음 | 중복 후보. Vercel의 기존 배포는 이 브랜치 수정만으로 바뀌지 않음. GET/HEAD 페이지의 새 도메인 이동 방안 별도 검토; 결제 API/callback까지 무조건 이동 금지 |
| 4 canonical | 없음 | 메인에 https://paljaplay.com/ 추가 준비. 공유/결제 쿼리도 메인 대표 주소로 안내. 실제 301을 대신하지는 않음 |
| 5 title | 사주팔자PLAY Beta · 내 팔자, 게임처럼 까보자 | 무료 사주팔자 테스트 · 캐릭터와 능력치로 서비스 설명 명확화 |
| 6 description | 생년월일로 나의 사주 캐릭터와 7개 능력치를 게임처럼 확인해 보세요. 사주팔자PLAY Beta. | 제공 영역과 지원 범위 설명으로 보완 준비. 검색엔진이 이 문구를 그대로 사용한다는 보장은 없음 |
| 7 robots.txt | 저장소에 없음. Cloudflare 경로는 200 text/html 메인 fallback, Vercel은 404 | 실제 text robots 파일 생성 준비. 공개 메인 허용, 관리자/API/debug 제외. 인증 보호를 robots에 의존하지 않음 |
| 8 sitemap.xml | 저장소에 없음. Cloudflare 경로는 200 text/html 메인 fallback, Vercel은 404 | 실제 XML 파일 생성 준비. 현재 존재하는 메인 URL만 포함. 관리자/개인 결과/계획 페이지 제외 |
| 9 Googlebot 본문 | web/index.html에 소개 문구·H1·영역 설명·시작 버튼이 이미 있음 | 완전히 빈 HTML은 아님. Google 렌더링 도구/색인 보고서는 미실행 |
| 10 SPA | .scr 표시 전환, 결과 영역 s-result와 s-report는 빈 section으로 시작해 JavaScript에서 생성 | 결과 계산을 크롤러에게 강요하지 않음. 앞으로 주제별 설명은 정적 HTML에 제공해야 함 |
| 11 Open Graph | og:title/description/image/url 모두 없음 | title/description/url/type/locale/site_name 준비. 실제 공유 이미지 선정·og:image는 미완료 |
| 12 Twitter/X | 카드 메타 없음 | summary 카드 및 제목/설명 준비. 이미지가 없으므로 큰 이미지 카드로 선언하지 않음 |
| 13 기능별 URL | 같은 루트에서 화면 전환. 배틀은 ?b= 또는 과거 #b=, 결제는 ?pay= 상태. 재물/연애/직업별 검색 문서 없음 | 계산 결과·구매 주소를 검색용 URL로 공개하지 않음. 제안한 정적 입구들을 다음 단계에서 구현 |
| 14 내부 링크 | 메인 HTML에는 font 링크 외에 콘텐츠 이동용 a href가 없음. 시작/홈은 버튼 | 검색 문서 사이의 실제 링크 필요. 존재하지 않는 랜딩 링크는 아직 추가하지 않음 |
| 15 신뢰 페이지 | 코드상 개인정보처리방침/이용약관/문의 독립 문서·링크 없음. 일부 입력/취소 안내만 존재 | 운영자·문의 창구·실제 저장/이용·환불 정책 확인 후 독립 URL 설계. 임의 연락처/사업자 정보 만들지 않음 |
| 16 JSON-LD | 없음 | 실제 사이트명/언어/URL만 담은 WebSite 준비. 평점·리뷰·운세 효과·검색 기능·FAQ rich result를 꾸며 넣지 않음 |
| 17 AdSense | scripts/adsense-files.mjs가 계정 확인 meta와 ads.txt만 생성. 광고 JS 삽입 없음 | SEO 처리 후 기존 소유권 처리 유지. 광고 활성화/CMP 설정은 수정하지 않음 |
| 18 모바일 | viewport, 반응형 최대 폭, 48px 입력/버튼, 모바일 CSS 존재. fonts는 외부 다운로드, 초기 콘텐츠와 결과는 분리 | 이번 감사에서 모바일 실기기·PageSpeed/Lighthouse/Core Web Vitals 미실행. 기존 UI 수정 없음 |

## 안전한 수정과 아직 남은 일

`scripts/seo-files.mjs`를 빌드에 연결했다. 정적 제목/설명/canonical/OG/summary 카드/WebSite/robots/sitemap만 추가한다. 개발 빌드는 noindex 처리한다. 관리자 HTML의 기존 noindex는 그대로다.

신규 브랜치를 배포하지 않았으므로 공개 서비스의 문제는 아직 그대로일 수 있다. Preview 도메인 색인 차단은 별도 호스팅 설정 검토 대상이다. 실제 공유용 이미지, www→루트 301, Vercel 정리, 신뢰 문서는 미완료다.

www→루트 301은 경로와 쿼리를 보존해야 한다. 기존 배틀 링크와 결제 복귀 URL을 대조하고, 관리자 호스트는 제외해야 한다. 결제 POST/API를 다른 호스트로 강제 이동시키지 않는다. Cloudflare의 도메인 수준 redirect를 사용하면 정적 자산까지 Worker로 보내지 않고 통일할 수 있다. 기존 PUBLIC_URL도 이후 한 번에 정리한다.

Search Console URL 검사에서 대표 주소의 실제 HTML/렌더링·색인 가능 여부를 확인하고, 배포 후 sitemap을 제출한다. 네이버 서치어드바이저도 소유 확인 후 robots/sitemap 수집 상태를 확인한다. 이는 사용자 계정 단계이며 아직 실행하지 않았다.

## 랜딩페이지 후보 — 구현 전 설계

공통: 주제에 맞는 설명 → 실제 결과에서 읽을 수 있는 항목 → 해석의 한계와 지원 범위 → PLAY 시작 → 관련 문서 링크. 검색어만 바꾼 복제 문서를 만들지 않는다. 광고/키워드 수를 목표로 삼지 않는다.

| URL | 찾는 사람의 질문 | 고유한 도움과 내용 | 연결/주의 |
|---|---|---|---|
| /free-saju | 무료로 무엇을 볼 수 있나? | 입력 요건, 무료 캐릭터·능력치·영역 해석, 양력/시간 모름/지원 범위, 결과 읽는 순서 | 무료 테스트 시작. Premium과 무료 범위 구분 |
| /money | 재물운·돈복은 어떻게 읽나? | 서비스 재물 능력치가 나타내는 성향, 점수와 해석 차이, 소비/계획을 돌아볼 질문 | 재물 항목 확인. 자산·수익 예측이나 투자 추천 금지 |
| /compatibility | 둘의 사주 궁합을 볼 수 있나? | 현재 PLAY 배틀은 능력치 비교이며 연애 궁합 판정과 다름. 친구와 비교하는 절차·공유 범위 | 배틀 기능 소개로 정직하게 연결. 궁합 계산 기능을 제공한다고 주장하지 않음. 별도 가치 없으면 보류 |
| /love | 연애운 결과를 어떻게 이해하나? | 관계 성향/표현 방식, 결과 문장과 점수 읽기, 상대와 대화할 질문 | 연애 항목 확인. 특정 시기 결혼·관계 성공 보장 금지 |
| /business | 사업 성향이란 무엇인가? | 실행·기회·협업 관점, 재물/직업과 사업 영역의 차이, 결과를 비교하는 방법 | 사업 항목 확인. 창업 성공이나 매출 보장 금지 |
| /career | 직업운으로 무엇을 알 수 있나? | 일하는 성향·강점·주의점, 재물/사업과 구분, 경험과 결과를 비교하는 질문 | 직업 항목 확인. 채용·직업 적합성을 단정하지 않음 |
| /guide/saju | 사주팔자·오행은 무엇인가? | 네 기둥/오행/일간 등 결과에 등장하는 용어 설명, 출생 시간 미상의 영향, Beta 해석의 한계 | 근거 확인 가능한 용어만 설명. 실제 결과의 도움말과 연결 |

우선순위: /free-saju와 /guide/saju → /money·/love → /career·/business. /compatibility는 실제 기능과 검색 기대가 다르므로 별도 검토. 오늘의 운세는 현재 일별 운세 기능이 없으므로 이번 목록에서 제외. 내 사주 티어는 기준분포 설명과 연결할 수 있지만 인간의 우열/미래 성공 등급으로 표현하지 않는다.

## A/B/C

A. Google이 메인 소개 HTML은 읽을 수 있는 구조다. 그러나 주제별 설명과 URL·대표 주소 신호가 부족하다. 색인/순위를 확인한 것은 아니다.

B. 가장 큰 세 문제: (1) 세 도메인의 중복과 대표 주소 미통일 (2) 검색 파일/메타·내부 링크 부족 (3) 키워드별로 읽을 수 있는 유용한 독립 문서와 신뢰 페이지 부재.

C. 랜딩페이지 설계는 시작할 수 있다. 구현은 이 감사 보고 후 진행하며, 대량 제작 전에 기본 SEO 배포와 대표 주소 통일·실제 색인 검증을 먼저 마무리하는 것이 좋다.

## 지침 근거

- Google Search 스팸 정책: https://developers.google.com/search/docs/essentials/spam-policies
- 사용자에게 유용한 콘텐츠: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- 네이버 웹마스터 가이드: https://searchadvisor.naver.com/guide

검증 결과는 작업 로그 참조. 계획/예상과 실행된 검증을 구분한다.
