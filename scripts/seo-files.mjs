import { writeFileSync } from 'node:fs';

export const SEO_ORIGIN = 'https://paljaplay.com';
export function seoHtml(html, { dev = false } = {}) {
  const title = '무료 사주팔자 테스트 · 캐릭터와 능력치 | 팔자PLAY';
  const description = '생년월일로 사주 캐릭터와 성격·재물·연애·직업·사업 성향을 게임처럼 확인하세요. 가입 없이 즐기는 팔자PLAY Beta. 양력·대한민국 출생을 지원합니다.';
  const metadata = [
    `<link rel="canonical" href="${SEO_ORIGIN}/">`,
    `<meta name="robots" content="${dev ? 'noindex, nofollow' : 'index, follow'}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="ko_KR">',
    '<meta property="og:site_name" content="팔자PLAY">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${SEO_ORIGIN}/">`,
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: '팔자PLAY', alternateName: '사주팔자PLAY', url: `${SEO_ORIGIN}/`, inLanguage: 'ko-KR' })}</script>`,
  ].join('\n');
  return html.replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}">`)
    .replace('</head>', `${metadata}\n</head>`);
}
export function writeSeoFiles(outdir, { dev = false } = {}) {
  writeFileSync(`${outdir}/robots.txt`, dev ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /debug.html\nSitemap: ${SEO_ORIGIN}/sitemap.xml\n`);
  writeFileSync(`${outdir}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SEO_ORIGIN}/</loc></url></urlset>\n`);
}
