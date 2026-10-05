// 소유권 확인만 준비한다. 광고 스크립트는 자동 활성화하지 않는다.
import { writeFileSync } from 'node:fs';
export function adsenseFiles(html, publisherId) {
  if (!publisherId) return { html, adsTxt: null };
  if (!/^ca-pub-[0-9]{16}$/.test(publisherId)) throw new Error('PALJA_ADSENSE_PUBLISHER_ID must be ca-pub- followed by 16 digits');
  return {
    html: html.replace('</head>', `<meta name="google-adsense-account" content="${publisherId}">\n</head>`),
    adsTxt: `google.com, ${publisherId.slice(3)}, DIRECT, f08c47fec0942fa0\n`,
  };
}
export function writeAdsenseFiles(outdir, html, publisherId) {
  const files = adsenseFiles(html, publisherId);
  writeFileSync(`${outdir}/index.html`, files.html);
  if (files.adsTxt) writeFileSync(`${outdir}/ads.txt`, files.adsTxt);
}
