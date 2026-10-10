#!/usr/bin/env node
// G5 Lighthouse (mobile), G6 axe (light/dark, 1280/390) plus a no-sideways-scroll check at 390,
// 1024 and 1280, and G9 screenshots for the pages in gates.config.json. Expects `dist/` to exist
// and serves it on a local port.
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

const config = JSON.parse(readFileSync('gates.config.json', 'utf8'));
// AUDIT_PAGES="/,/about/" audits just those pages (handy locally; CI audits every page).
if (process.env.AUDIT_PAGES) config.pages = process.env.AUDIT_PAGES.split(',');
// Image audits that must pass outright on every page, whatever the category scores: images have
// explicit sizes and true ratios, and the LCP image is prioritised, not lazy and (unless a script
// renders it, as search results are) found in the HTML.
const IMAGE_AUDITS = ['unsized-images', 'image-aspect-ratio'];

/** Problems with the LCP image from Lighthouse's LCP discovery insight, plus notes. */
function lcpProblems(audit, html) {
  if (!audit) return { problems: ['lcp-discovery-insight missing from Lighthouse results'] };
  const items = audit.details?.items ?? [];
  const checks = items.find((i) => i.type === 'checklist')?.items;
  if (!checks) return { problems: [] }; // the LCP is text, not an image
  const src = items.find((i) => i.type === 'node')?.snippet?.match(/src="([^"]+)"/)?.[1] ?? '';
  const inHtml = src !== '' && html.includes(new URL(src, BASE).pathname);
  const problems = [];
  const notes = [];
  if (!checks.priorityHinted?.value) problems.push('LCP image has no fetchpriority="high"');
  if (!checks.eagerlyLoaded?.value) problems.push('LCP image is lazy-loaded');
  if (!checks.requestDiscoverable?.value)
    (inHtml ? problems : notes).push(
      inHtml ? 'LCP image is not discoverable in the HTML' : 'LCP image rendered by script',
    );
  return { problems, notes };
}
const PORT = 4329;
const BASE = `http://127.0.0.1:${PORT}`;
// CHROME_PATH wins; otherwise Playwright's own Chromium, falling back to a preinstalled one.
const chromePath =
  process.env.CHROME_PATH ||
  [chromium.executablePath(), '/opt/pw-browsers/chromium'].find((p) => existsSync(p));
if (!chromePath)
  throw new Error('No Chromium found: set CHROME_PATH or run `npx playwright install chromium`.');
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const themes = ['light', 'dark'];

async function isUp(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

/** Pixels the page scrolls sideways (0 when nothing overflows the viewport). */
const sideScroll = (tab) =>
  tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

if (!existsSync('dist')) throw new Error('dist/ not found: run `npm run build` first.');
if (await isUp(BASE + '/')) {
  throw new Error(`Port ${PORT} is already in use; stop whatever is on it and retry.`);
}
// A tiny in-process static server for dist/ (astro preview daemonises itself in non-TTY shells,
// which made it easy to leave stale servers behind). Mirrors Cloudflare Pages: /x/ -> x/index.html.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};
const root = resolve('dist');
const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', BASE).pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  let file = resolve(join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (file !== root && !file.startsWith(root + sep)) file = join(root, '404.html');
  try {
    const body = await readFile(file);
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    // Compress text like Cloudflare Pages does, so Lighthouse measures what visitors download.
    if (
      /^(text|application\/(json|xml|javascript))|svg/.test(type) &&
      /\bgzip\b/.test(String(req.headers['accept-encoding']))
    ) {
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Encoding': 'gzip',
        Vary: 'Accept-Encoding',
      });
      res.end(gzipSync(body));
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(body);
  } catch {
    const notFound = await readFile(join(root, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(notFound);
  }
});
await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok));
const stopServer = () => server.close();

const failures = [];
const lines = [];

try {
  mkdirSync('gate-reports/screens', { recursive: true });

  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox'],
  });
  try {
    for (const page of config.pages) {
      const scores = {};
      const cls = [];
      const imageFails = new Set();
      const imageNotes = new Set();
      // A page that is deliberately noindex (placeholders, style guide) would always lose the
      // "is-crawlable" SEO audit. Skip only that audit, and only when the page says noindex.
      const html = await (await fetch(BASE + page)).text();
      const noindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);
      for (let i = 0; i < config.lighthouse.runs; i++) {
        const result = await lighthouse(
          BASE + page,
          {
            port: chrome.port,
            output: 'json',
            logLevel: 'error',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          },
          noindex
            ? { extends: 'lighthouse:default', settings: { skipAudits: ['is-crawlable'] } }
            : undefined,
        );
        for (const [key, cat] of Object.entries(result.lhr.categories)) {
          (scores[key] ??= []).push(cat.score ?? 0);
        }
        cls.push(result.lhr.audits['cumulative-layout-shift']?.numericValue ?? 0);
        const lcp = lcpProblems(result.lhr.audits['lcp-discovery-insight'], html);
        lcp.problems.forEach((p) => imageFails.add(p));
        lcp.notes?.forEach((n) => imageNotes.add(n));
        for (const id of IMAGE_AUDITS) {
          const audit = result.lhr.audits[id];
          if (!audit) imageFails.add(`${id} missing from Lighthouse results`);
          else if (audit.score !== null && audit.score < 1) imageFails.add(`${id}: ${audit.title}`);
        }
      }
      const shift = median(cls);
      for (const fail of imageFails) failures.push(`G5 ${page} ${fail}`);
      if (shift > config.lighthouse.maxCls)
        failures.push(`G5 ${page} CLS ${shift.toFixed(3)} > ${config.lighthouse.maxCls}`);
      const summary = Object.entries(scores).map(([key, values]) => {
        const score = median(values);
        const min = config.lighthouse[key];
        if (score < min)
          failures.push(`G5 ${page} ${key} ${Math.round(score * 100)} < ${min * 100}`);
        return `${key} ${Math.round(score * 100)}`;
      });
      lines.push(
        `G5 ${page}: ${summary.join(', ')}, CLS ${shift.toFixed(3)}${noindex ? ' (noindex: is-crawlable skipped)' : ''}${[...imageNotes].map((n) => ` (${n})`).join('')}`,
      );
    }
  } finally {
    chrome.kill();
  }

  const browser = await chromium.launch({ executablePath: chromePath });
  try {
    for (const page of config.pages) {
      for (const vp of viewports) {
        for (const theme of themes) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme,
          });
          const tab = await context.newPage();
          await tab.goto(BASE + page, { waitUntil: 'networkidle' });
          await tab.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
          const overflow = await sideScroll(tab);
          if (overflow > 0)
            failures.push(`G6 ${page} ${vp.name}/${theme}: page scrolls sideways by ${overflow}px`);
          const { violations } = await new AxeBuilder({ page: tab }).analyze();
          const serious = violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical',
          );
          for (const v of serious)
            failures.push(`G6 ${page} ${vp.name}/${theme}: ${v.id} (${v.nodes.length})`);
          const slug = page.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]+/gi, '_') || 'home';
          const name = `${slug}-${vp.name}-${theme}.png`;
          await tab.screenshot({ path: `gate-reports/screens/${name}`, fullPage: true });
          lines.push(`G6 ${page} ${vp.name}/${theme}: ${serious.length} serious/critical`);
          await context.close();
        }
      }
      // Small-laptop width, between the two audited layouts, where header overflow once slipped by.
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
      const tab = await context.newPage();
      await tab.goto(BASE + page, { waitUntil: 'networkidle' });
      const overflow = await sideScroll(tab);
      if (overflow > 0) failures.push(`G6 ${page} 1024: page scrolls sideways by ${overflow}px`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  stopServer();
}

const report = [...lines, '', failures.length ? 'Failures:' : 'No failures.', ...failures].join(
  '\n',
);
writeFileSync('gate-reports/pages.md', report + '\n');
console.log(report);
process.exit(failures.length ? 1 : 0);
