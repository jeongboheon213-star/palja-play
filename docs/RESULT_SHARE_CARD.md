# 결과 공유카드 — 2026-10-06

결과 화면의 계산·티어·percentile·배틀·Premium은 그대로 두고, ‘내 팔자 카드 공유하기’를 누를 때만 별도 dialog/PNG를 만든다. 새 npm 패키지, DB migration, 환경 변수 변경은 없다.

## 표시와 개인정보

- 기존 renderResult에서 계산한 tiers 객체를 모델에 전달한다. 카드 모델은 등급을 재계산하지 않고 전체 티어·상위 비율·percentile 및 재물/연애/사업/실행 등급을 그대로 복사한다.
- 1080×1350 PNG, 남색·금색·민트색. PLAY 표본 기준이라는 안내, 비교를 권하는 짧은 문구와 ‘너는 몇 티어?’ CTA. 높은 능력치는 기존 topPercent로 선택하고 동일 결과에서 문구가 동일하다.
- 모델을 명시적으로 선별하여 생년월일·출생시간·성별·실명·전화번호·기둥·구매 정보가 포함되지 않는다. Canvas는 로컬 생성, 외부 이미지/QR 서비스에 결과를 전송하지 않는다.
- 공유 URL은 https://www.paljaplay.com/?utm_source=share&utm_medium=result_card 로 고정한다. 현재 location/query/hash/배틀 토큰/결제 코드를 복사하지 않는다.

## 공유와 측정

- 준비된 PNG File을 Web Share API에 전달한다. 파일 공유가 안 되면 링크 공유, API가 없거나 실패하면 이미지 저장/링크 복사 안내를 제공한다. 취소는 성공 이벤트가 아니다.
- PNG 다운로드와 직접 이미지 열기, 기존 copyText를 통한 clipboard/execCommand/직접 복사 입력 fallback. 닫기/Escape 후 URL 해제 및 결과 버튼 포커스 복귀.
- Instagram 자동 게시 기능은 없다. 기기가 제공하는 앱 공유 또는 사용자의 수동 업로드만 지원한다. 기존 카카오 배틀 구조는 변경하지 않는다.
- Supabase 이벤트 이름 CHECK 제약을 유지한다. 기존 share_click의 props.mode=result_card, props.action에 result_share_open/result_card_created/result_share_native/result_image_download/result_link_copy를 기록한다. 별도의 새 이벤트 이름으로 DB INSERT를 시도하지 않는다. result_image_download는 다운로드 시작 행동을 뜻하며 OS 저장 완료 여부는 측정하지 않는다.
- 공유 링크 신규 유입은 landing_view.props.via=result_card로 구분한다. 임의 UTM 값이나 개인정보는 이벤트에 복사하지 않는다.

## 검증 범위

tests/result-card.test.ts는 실제 기존 티어 객체와 카드 값 일치/결정론/입력 불변/개인정보 선별/고정 URL을 검사한다. scripts/e2e.mjs는 실제 PNG 생성·다운로드·링크 복사·모의 파일 공유/링크 공유/취소/미지원/권한 거부·포커스 복귀·유입 측정을 검사한다. 기존 검사는 삭제하거나 약화하지 않았다.

scripts/e2e-result-card-prod.mjs는 실제 www 주소의 계산→카드→복귀 및 SEO 5개 응답을 검사한다. PALJA_TEST_PUBLIC_DNS=1은 이 테스트 브라우저만 1.1.1.1의 www 주소로 연결하며 OS/도메인 DNS를 수정하지 않는다. 리포트에 실제 연결 IP를 기록한다. 통신사 DNS가 옛 Vercel을 반환하는 문제와 실제 Google 색인 성공은 별도 문제다.

실기기 iPhone Safari/Android 공유 시트, Instagram/Threads/카카오 실제 앱 전송, 실제 Toss 결제는 자동화 검증과 구분한다. 운영 배포·실행 결과는 완료 시 보고한다.

## SNS chooser (2026-10-06)
- Branded KakaoTalk, Instagram, Threads and X buttons appear above the existing PNG preview.
- Kakao reuses the existing SDK/key and sends a text template with the fixed public result-card URL. Without a key, uses native sharing/copy fallback. No image upload or additional key/settings changes.
- Instagram sends PNG files only to the OS share sheet, where the user chooses Instagram. Unsupported devices get save-image instructions and an Instagram HTTPS link. The website cannot force a particular native share target.
- Threads/X open compose intents with fixed anonymous link and public tier text. They do not attach the locally generated PNG automatically or publish a post. A normal anchor remains for blocked popups. App-vs-browser routing depends on installation and OS link handling.
- Browser tests mock SDK/share/compose calls; actual device app launching and SNS posting are not claimed tested.
- References: https://developers.kakao.com/docs/ko/kakaotalk-share/js-link and https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share . Meta web-intents documentation could not be fetched (429); compose destination is tested for correct URL construction, not live authenticated posting.
