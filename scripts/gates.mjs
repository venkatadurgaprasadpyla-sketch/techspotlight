#!/usr/bin/env node
// Runs the automated quality gates (G1–G8 plus the dependency audit part of G11).
// See CLAUDE.md for what each gate means. Exits non-zero if any gate fails.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const config = JSON.parse(readFileSync('gates.config.json', 'utf8'));
const only = process.argv.slice(2);
const results = [];

function run(id, name, cmd, args, { failOn } = {}) {
  if (only.length && !only.includes(id)) return;
  process.stdout.write(`\n▶ ${id} ${name}: ${cmd} ${args.join(' ')}\n`);
  const res = spawnSync(cmd, args, { encoding: 'utf8', shell: false, env: process.env });
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  process.stdout.write(output);
  let ok = res.status === 0;
  let detail = ok ? 'exit 0' : `exit ${res.status}`;
  if (ok && failOn) {
    const hit = output.split('\n').find((line) => failOn.test(line));
    if (hit) {
      ok = false;
      detail = `matched ${failOn}: ${hit.trim()}`;
    }
  }
  results.push({ id, name, ok, detail });
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const gzKb = (buf) => gzipSync(buf).length / 1024;

function budgets() {
  if (only.length && !only.includes('G8')) return;
  process.stdout.write('\n▶ G8 Budgets\n');
  const { islandKbGzip, pageJsKbGzip, cssKbGzip } = config.budgets;
  const files = walk('dist');
  const problems = [];
  const sizes = new Map();
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      sizes.set('/' + relative('dist', file), gzKb(readFileSync(file)));
    }
  }
  for (const [path, kb] of sizes) {
    if (path.endsWith('.js') && kb > islandKbGzip)
      problems.push(`${path} is ${kb.toFixed(2)} KB gz (> ${islandKbGzip})`);
  }
  for (const file of files.filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    const page = '/' + relative('dist', file);
    let js = 0;
    let css = 0;
    for (const [, src] of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) js += sizes.get(src) ?? 0;
    for (const [, body] of html.matchAll(
      /<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g,
    )) {
      js += gzKb(Buffer.from(body));
    }
    for (const [, href] of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g))
      css += sizes.get(href) ?? 0;
    for (const [, body] of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
      css += gzKb(Buffer.from(body));
    if (js > pageJsKbGzip)
      problems.push(`${page} ships ${js.toFixed(2)} KB gz JS (> ${pageJsKbGzip})`);
    if (css > cssKbGzip)
      problems.push(`${page} ships ${css.toFixed(2)} KB gz CSS (> ${cssKbGzip})`);
    process.stdout.write(`  ${page}: JS ${js.toFixed(2)} KB, CSS ${css.toFixed(2)} KB (gzip)\n`);
  }
  problems.forEach((p) => process.stdout.write(`  ✗ ${p}\n`));
  results.push({
    id: 'G8',
    name: 'Budgets',
    ok: problems.length === 0,
    detail: problems.length ? problems.join('; ') : 'all pages within budget',
  });
}

const npx = 'npx';
run('G1', 'Clean build', npx, ['astro', 'build'], { failOn: /\[WARN\]|\bwarning\b/i });
run('G2', 'Types', npx, ['astro', 'check', '--minimumFailingSeverity', 'warning']);
run('G3', 'Lint', npx, ['eslint', '.', '--max-warnings', '0']);
run('G3', 'Format', npx, ['prettier', '--check', '.']);
run('G4', 'Unit tests', npx, ['vitest', 'run']);
run('G7', 'Internal links', npx, [
  'linkinator',
  'dist',
  '--recurse',
  '--check-fragments',
  '--skip',
  '^https://',
]);
budgets();
run('G11', 'Production dependency audit', 'npm', ['audit', '--omit=dev', '--audit-level=moderate']);
if (config.pages.length) {
  run('G5/G6/G9', 'Lighthouse, axe and screenshots', 'node', ['scripts/audit-pages.mjs']);
} else if (!only.length) {
  results.push({
    id: 'G5/G6/G9',
    name: 'Page audits',
    ok: true,
    detail: 'N/A: no pages listed in gates.config.json yet',
  });
}

mkdirSync('gate-reports', { recursive: true });
const table = [
  '| Gate | Check | Result | Detail |',
  '|------|-------|--------|--------|',
  ...results.map(
    (r) =>
      `| ${r.id} | ${r.name} | ${r.ok ? 'Pass' : 'FAIL'} | ${r.detail.replaceAll('|', '\\|')} |`,
  ),
].join('\n');
writeFileSync('gate-reports/summary.md', `# Gate results\n\n${table}\n`);
process.stdout.write(`\n${table}\n`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
