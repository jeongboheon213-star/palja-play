# 피드백 관리자

관리자 주소: https://admin.paljaplay.com/admin/

최근 7/30/90일 production 피드백을 읽기 전용으로 조회한다. 원본 생년월일, 결과 ID, 주문 정보는 조회하지 않는다. 기간/해석 버전/공감 점수/의견 검색, 공감 평균·4/5점 비율·영역별 복수 선택·공유 의향·한국 날짜별 추이·최신 의견·CSV 제공. 최신 10,000건 초과는 제한 표시, 목록은 200건까지만 표시한다. 키워드는 단순 포함 응답 수이며 AI 감정 분석/인과 추론이 아니다. 테스트도 production으로 저장되므로 포함될 수 있다.

## 사용자 설정 순서

1. Cloudflare Zero Trust에서 Self-hosted Access application을 만든다. 호스트 **admin.paljaplay.com 전체**를 보호한다(경로 제한 없음). 이메일 OTP 로그인을 활성화하고 Allow policy에는 관리자 본인의 정확한 이메일만 지정한다. Everyone/Bypass 정책 금지.
2. 해당 Application Audience(AUD), 팀 도메인을 확인한다.
3. Pages production 환경에 텍스트 변수 4개 추가: `ADMIN_HOST=admin.paljaplay.com`, `ADMIN_ACCESS_TEAM_DOMAIN=https://팀이름.cloudflareaccess.com`, `ADMIN_ACCESS_AUD=해당앱AUD`, `ADMIN_EMAILS=본인이메일`. 기존 SUPABASE_URL/SUPABASE_SECRET_KEY는 그대로 사용한다. 비밀 키는 사용자 직접 입력/관리하며 브라우저에 넣지 않는다.
4. Pages 사용자 설정 도메인에 admin.paljaplay.com을 추가하고 기존 빌드 명령 npm run build:cloudflare로 재배포한다. 설정이 없으면 서버는 403으로 차단한다. public/www/pages.dev의 관리자 경로에서도 거부한다.
5. 관리자 주소에서 이메일 인증 후 실제 데이터·새로고침·검색·CSV를 확인한다. 다른 이메일 거절, 로그아웃 후 거절도 확인한다.

Cloudflare Access 인증 헤더를 그대로 믿지 않고 RS256 서명, issuer, audience, exp, nbf, iat, 이메일 허용 목록과 호스트를 서버에서 확인한다. JWKS는 고정된 팀 도메인에서만 읽는다. 인증과 DB 오류는 닫힌 상태로 실패한다. 응답은 no-store, 자유 의견은 HTML escape, CSV 수식 접두사는 무력화한다. 외부 AI로 피드백을 전송하지 않는다.

공식 검증 문서: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/

새 SQL/패키지 없음. 기존 service_role SELECT 권한을 사용한다. 실제 DB 읽기는 설정 완료 후 확인한다. UI·서버에는 결제/환불/삭제 기능을 추가하지 않았다.
