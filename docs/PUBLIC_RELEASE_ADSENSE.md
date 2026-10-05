# 정식 도메인·최신 기능·AdSense 전환

2026-10-05 사용자 확인: paljaplay.com 구매, Vercel Production 도메인 연결, HTTPS 정상 접속. Preview에서 피드백 제출 성공과 Supabase 해당 시각 신규 행 확인. 원문/주문 식별자/키 저장 없음.

## 최신 기능 공개

현재 Production은 main 구버전이며 최신 37c9e2b 이후 변경은 Draft PR #1에 있다. 도메인만 연결해도 Preview 코드는 자동 공개되지 않는다. 호스팅 결정 → 검증된 코드 배포 → 환경 연결 → 실제 도메인 동작 확인 순서로 진행한다. 사용자 이번 요청은 최신 기능 정식 공개 준비를 요청한 것이며 LIVE 활성화 승인이 아니다. 결제는 off 또는 test로 유지한다. 이전 문서의 Production 변경 금지는 과거 기본 제한이며 이번 공개 범위와 구분한다. 아직 main 병합/배포 전환하지 않았다.

Vercel 유지 시 Production 공개 키/DB 서버 설정은 사용자 직접 입력, PALJA_PUBLIC_URL=https://www.paljaplay.com. Preview 환경 변수는 Production에 자동 복사되지 않는다. 무료 호스팅 이전 시 Node API/신뢰 IP/환경 변수/TEST 결제 리다이렉트/DB 요청 제한을 모두 검증한 후 DNS 전환한다. Preview를 단순 Promote하여 환경 적용이 끝났다고 간주하지 않는다.

## AdSense

사용자가 Google AdSense 로그인 → Sites에서 paljaplay.com 추가 → 소유권 확인의 meta tag 옵션에서 ca-pub-16자리 게시자 ID를 확인한다. ID는 공개 식별자이며 비밀번호/로그인 정보가 아니다.

빌드 환경 PALJA_ADSENSE_PUBLISHER_ID에 실제 ca-pub-16자리 값을 입력하면 index.html에 Google 계정 meta와 루트 ads.txt를 생성한다. 미설정 시 생성하지 않고 광고 스크립트도 자동 활성화하지 않는다. 개발/모의 빌드는 제외. 임의 ID를 운영에 넣지 않는다. 실제 ID 적용과 공개 도메인에서 HTML/ads.txt 접속 확인 후 사용자 Google 확인/검토 요청을 진행한다.

독창적 공개 콘텐츠, 서비스 설명, 실제 문의 창구, 정확한 개인정보 처리 안내 및 쿠키/광고 정책을 운영 사실에 맞춰 준비한다. 사업자 정보/문의 주소/보관 기간을 임의로 만들지 않는다. 도메인만으로 승인을 보장하지 않는다. Vercel Hobby에서 광고 수익 운영하지 않도록 호스팅 선택이 필요하다.

공식 자료:
- https://support.google.com/adsense/answer/9724
- https://support.google.com/adsense/answer/12131223
- https://support.google.com/adsense/answer/12171612
- https://vercel.com/docs/limits/fair-use-guidelines
