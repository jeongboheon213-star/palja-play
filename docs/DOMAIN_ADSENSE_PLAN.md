# 독립 도메인과 AdSense 준비 — 2026-10-05

사용자 우선순위: 무료에 가까운 비용, 낮은 갱신 비용, 외우기 쉬운 주소. 아직 도메인 구매·DNS 연결·광고 신청·호스팅 이전은 하지 않았다.

## 제안

`paljaplay.com`처럼 하이픈 없이 짧은 .com을 먼저 검색한다. 이 이름의 등록 가능 여부와 프리미엄 가격 여부는 미확인이다. 구매 전 실제 장바구니에서 확인하며 사용자가 도메인 이름과 결제를 결정한다. 이메일·웹호스팅 등의 유료 추가 상품은 도메인 연결에 필수가 아니다.

2026-10-05 확인한 Spaceship 일반 .com 표준 가격: 첫해 $8.88 + ICANN $0.20 = $9.08, 갱신 $9.98 + $0.20 = $10.18/년. 환율·세금·프로모션·프리미엄 도메인에 따라 최종 금액이 달라진다. 비교한 Porkbun은 홈페이지 .com from $11.08 표시. 모든 등록업체 중 최저가를 보장하지 않는다.

- https://www.spaceship.com/domains/
- https://porkbun.com/products/domains

일반적인 자체 소유 .com은 등록/갱신 비용이 발생한다. AdSense가 모든 상황에서 자체 구매 도메인을 요구한다고 단정하지 않는다: Google은 도메인 외에 public suffix list 플랫폼의 서브도메인과 파트너 플랫폼 사이트도 허용한다. 무료 플랫폼 주소의 실제 접수 가능 여부/승인 여부는 별도 확인해야 한다.
- https://support.google.com/adsense/answer/12170421

## 호스팅 비용

현재 Vercel Hobby는 개인/비상업용 한정이다. 광고 수익 및 LIVE 판매 운영 전에는 Vercel Pro 또는 상업용을 허용하는 대체 호스팅을 선택한다. 무료 우선인 사용자를 위해 Cloudflare Workers/정적 assets 무료 범위 활용을 검토할 수 있지만 기존 결제 API와 trusted-IP 제한의 호환 검증이 필요하다. 지금 프로젝트를 옮기거나 유료 구독을 신청하지 않는다.
- https://vercel.com/docs/limits/fair-use-guidelines
- https://developers.cloudflare.com/workers/platform/pricing/

독립 도메인만 구매해도 Vercel Hobby의 상업용 제한이 없어지는 것은 아니다. 호스팅 이전을 선택하면 기존 Supabase DB를 유지하고 새 호스트에서 TEST 결제·열람·취소·복구·공유를 재검증한 뒤 연결한다.

## 연결 및 신청 순서

1. 주소 등록 가능 여부·첫해/갱신 금액 확인 후 사용자가 구매.
2. 운영 호스팅 결정. Vercel 유지 시 Domains에 도메인을 추가하고 화면에서 제시된 DNS를 등록한다(예전 고정 IP를 추측해 입력하지 않는다). 무료 대안은 TEST 호환 검증 후 사용.
3. HTTPS·루트/www 대표 주소·배틀 공유·결제 반환 주소 확인. TEST 키는 Preview 한정 유지, LIVE는 사용자의 별도 명시적 승인 전 OFF.
4. 공개 소개·이용방법·독창적인 읽을거리·문의·개인정보/약관 내용을 준비. 실제 사업자와 연락처 정보는 사용자에게 받는다. 도메인만으로 승인 보장하지 않는다.
5. AdSense 계정에서 새 사이트 추가, 사용자 계정에 발급된 사이트 확인 코드/광고 게시자 ID로 연결. ID를 임의 생성하거나 다른 사람의 ads.txt를 쓰지 않는다. 게시 전 운영 반영 범위를 확인한다.
6. 크롤러 접근·공개 페이지·필요한 ads.txt 확인 후 신청, 승인 결과는 Google이 결정.

공식 연결 안내: https://vercel.com/docs/domains/working-with-domains/add-a-domain
AdSense 요건: https://support.google.com/adsense/answer/9724
