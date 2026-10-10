#!/usr/bin/env node
// Renders the default social-share image (public/og-default.png, 1200×630) and the publisher
// logo used in structured data (public/logo.png, 512×512) with the site's own fonts.
// Re-run after changing the name, tagline or brand colours: `npm run images:og`.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { site } from '../src/config/site.ts';

const font = (pkg, file) =>
  readFileSync(`node_modules/@fontsource/${pkg}/files/${file}`).toString('base64');
const faces = `
@font-face{font-family:SG;font-weight:700;src:url(data:font/woff2;base64,${font('space-grotesk', 'space-grotesk-latin-700-normal.woff2')})}
@font-face{font-family:Plex;font-weight:400;src:url(data:font/woff2;base64,${font('ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff2')})}`;
// Brand colours from the DesignSystem board (the --ts-* tokens in light mode).
const ink = '#16181D';
const accent = '#1F4FD8';
const buy = '#F5B700';
const mark = (
  size,
) => `<svg width="${size}" height="${size}" viewBox="0 0 28 28" aria-hidden="true">
  <circle cx="14" cy="14" r="14" fill="${accent}"/><path d="M14 5 L21 22 H7 Z" fill="#fff" opacity=".92"/>
  <circle cx="14" cy="6" r="2.2" fill="${buy}"/></svg>`;

const og = `<html><head><style>${faces}
body{margin:0;width:1200px;height:630px;background:${ink};color:#fff;font-family:Plex;display:flex;flex-direction:column;justify-content:space-between;padding:80px;box-sizing:border-box}
.brand{display:flex;align-items:center;gap:24px;font:700 64px SG;letter-spacing:-.02em}
p{margin:0;font-size:40px;line-height:1.3;color:#C9CED6;max-width:900px}
.bar{height:12px;width:220px;background:${buy};border-radius:6px}
</style></head><body><div class="brand">${mark(96)}${site.name}</div><p>${site.tagline}. Prices in ₹.</p><div class="bar"></div></body></html>`;
const logo = `<html><head><style>body{margin:0;width:512px;height:512px;background:#fff;display:flex;align-items:center;justify-content:center}</style></head><body>${mark(400)}</body></html>`;

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
for (const [html, width, height, out] of [
  [og, 1200, 630, 'public/og-default.png'],
  [logo, 512, 512, 'public/logo.png'],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
}
await browser.close();
