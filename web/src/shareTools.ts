// 배틀 공유 도구 (브라우저). 주소는 만들지 않는다 — src/lib/battle/share.ts 의 createBattleShare() 결과만 받는다.

import qrcode from "qrcode-generator";
import type { BattleShare } from "../../src/lib/battle/share";

declare const __PALJA_KAKAO_JS_KEY__: string | null;

/** 휴대폰·태블릿인가 (문자 앱·공유 시트가 있는 환경) */
export function isMobileDevice(): boolean {
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function hasWebShare(): boolean {
  return typeof navigator.share === "function";
}

/** QR 코드 SVG (이 브라우저 안에서 생성 — 외부 QR 서비스로 링크를 보내지 않는다) */
export function qrSvg(text: string, cellSize = 4): string {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  return qr.createSvgTag({ cellSize, margin: 2, scalable: true });
}

/**
 * 클립보드 복사: ① navigator.clipboard → ② 숨긴 입력창 + execCommand("copy") → ③ 실패 시 false (화면에 직접 복사용 입력창을 띄운다)
 */
export async function copyText(text: string): Promise<"clipboard" | "execCommand" | false> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return "clipboard";
    }
  } catch {
    // 권한 거부 등 → 다음 방법
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    if (ok) return "execCommand";
  } catch {
    // 지원 안 함
  }
  return false;
}

// ── 카카오톡 공유 (JavaScript SDK) ──────────────────────────────
// JavaScript 키가 설정된 경우에만 버튼을 보인다. 키는 공개 키지만 카카오 개발자 콘솔에 사이트 도메인을 등록해야 동작한다.

export const KAKAO_JS_KEY = __PALJA_KAKAO_JS_KEY__;
export const KAKAO_ENABLED = !!__PALJA_KAKAO_JS_KEY__;
/** 공식 CDN 2.8.3, SRI 는 공식 파일에서 계산해 고정 (2026-10-05) */
const KAKAO_SDK = { src: "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js", integrity: "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy" };

interface KakaoGlobal {
  init(key: string): void;
  isInitialized(): boolean;
  Share: { sendDefault(args: unknown): void; uploadImage(args: { file: FileList }): Promise<{ infos: { original: { url: string } } }> };
}

let kakaoLoading: Promise<KakaoGlobal> | null = null;
function loadKakao(): Promise<KakaoGlobal> {
  const existing = (window as unknown as { Kakao?: KakaoGlobal }).Kakao;
  if (existing) {
    // 이미 불러온 SDK 재사용
    if (!existing.isInitialized()) existing.init(KAKAO_JS_KEY as string);
    return Promise.resolve(existing);
  }
  kakaoLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = KAKAO_SDK.src;
    s.integrity = KAKAO_SDK.integrity;
    s.crossOrigin = "anonymous";
    s.onload = () => {
      const K = (window as unknown as { Kakao?: KakaoGlobal }).Kakao;
      if (!K) return reject(new Error("카카오 SDK 없음"));
      if (!K.isInitialized()) K.init(KAKAO_JS_KEY as string);
      resolve(K);
    };
    s.onerror = () => reject(new Error("카카오 SDK 로드 실패"));
    document.head.appendChild(s);
  });
  return kakaoLoading;
}

/** 카카오톡으로 보내기. 전달하는 링크는 share.kakao (= canonical battle URL) 그대로 */
export async function shareKakao(share: BattleShare): Promise<boolean> {
  if (!KAKAO_ENABLED) return false;
  try {
    const K = await loadKakao();
    K.Share.sendDefault(share.kakao);
    return true;
  } catch {
    return false;
  }
}

/** Preload the SDK without uploading or sending anything. */
export function prepareKakaoShare(): void {
  if (KAKAO_ENABLED) void loadKakao().catch(() => {});
}
export async function uploadResultKakao(file: File): Promise<string> {
  if (!KAKAO_ENABLED || file.type !== 'image/png' || file.size > 5 * 1024 * 1024) throw new Error('Image unavailable');
  const K = await loadKakao();
  const files = new DataTransfer(); files.items.add(file);
  const response = await K.Share.uploadImage({ file: files.files });
  const url = new URL(response.infos.original.url);
  // Kakao returns an HTTP CDN URL; use its HTTPS endpoint on our secure site.
  if (url.hostname !== 'k.kakaocdn.net') throw new Error('Invalid image host');
  url.protocol = 'https:';
  return url.href;
}
export function shareResultKakao(text: string, url: string, imageUrl: string): boolean {
  const K = (window as unknown as { Kakao?: KakaoGlobal }).Kakao;
  if (!KAKAO_ENABLED || !K) return false;
  try {
    K.Share.sendDefault({ objectType: 'feed', content: { title: text.slice(0, 200), description: '너는 몇 티어? 무료로 내 팔자 확인하기', imageUrl, imageWidth: 1080, imageHeight: 1350, link: { mobileWebUrl: url, webUrl: url } }, buttons: [{ title: '내 팔자 확인하기', link: { mobileWebUrl: url, webUrl: url } }] });
    return true;
  } catch { return false; }
}

