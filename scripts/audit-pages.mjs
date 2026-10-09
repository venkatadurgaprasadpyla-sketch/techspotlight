#!/usr/bin/env node
// G5 Lighthouse (mobile), G6 axe (light/dark, 1280/390) and G9 screenshots for the pages in
// gates.config.json. Expects `dist/` to exist; serves it with `astro preview`.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

const config = JSON.parse(readFileSync('gates.config.json', 'utf8'));
const PORT = 4329;
const BASE = `http://localhost:${PORT}`;
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

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
const failures = [];
const lines = [];

try {
  await waitForServer(BASE + '/');
  mkdirSync('gate-reports/screens', { recursive: true });

  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox'],
  });
  try {
    for (const page of config.pages) {
      const scores = {};
      for (let i = 0; i < config.lighthouse.runs; i++) {
        const result = await lighthouse(BASE + page, {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        });
        for (const [key, cat] of Object.entries(result.lhr.categories)) {
          (scores[key] ??= []).push(cat.score ?? 0);
        }
      }
      const summary = Object.entries(scores).map(([key, values]) => {
        const score = median(values);
        const min = config.lighthouse[key];
        if (score < min)
          failures.push(`G5 ${page} ${key} ${Math.round(score * 100)} < ${min * 100}`);
        return `${key} ${Math.round(score * 100)}`;
      });
      lines.push(`G5 ${page}: ${summary.join(', ')}`);
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
          const { violations } = await new AxeBuilder({ page: tab }).analyze();
          const serious = violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical',
          );
          for (const v of serious)
            failures.push(`G6 ${page} ${vp.name}/${theme}: ${v.id} (${v.nodes.length})`);
          const name = `${page.replaceAll('/', '_') || 'home'}-${vp.name}-${theme}.png`;
          await tab.screenshot({ path: `gate-reports/screens/${name}`, fullPage: true });
          lines.push(`G6 ${page} ${vp.name}/${theme}: ${serious.length} serious/critical`);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}

const report = [...lines, '', failures.length ? 'Failures:' : 'No failures.', ...failures].join(
  '\n',
);
writeFileSync('gate-reports/pages.md', report + '\n');
console.log(report);
process.exit(failures.length ? 1 : 0);
