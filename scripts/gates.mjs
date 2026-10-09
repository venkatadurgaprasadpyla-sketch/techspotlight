#!/usr/bin/env node
// Runs the automated quality gates (G1–G8 plus the dependency audit part of G11).
// See CLAUDE.md for what each gate means. Exits non-zero if any gate fails.
//
//   npm run gates            every gate
//   npm run gates -- G1 G5   only the named gates (G5, G6 and G9 all select the page audit)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const KNOWN = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G11'];
const config = JSON.parse(readFileSync('gates.config.json', 'utf8'));
const only = process.argv.slice(2).map((id) => id.toUpperCase());
const unknown = only.filter((id) => !KNOWN.includes(id));
if (unknown.length) {
  console.error(`Unknown gate(s): ${unknown.join(', ')}. Known: ${KNOWN.join(', ')}`);
  process.exit(2);
}
const results = [];
const selected = (...ids) => !only.length || ids.some((id) => only.includes(id));

function run(id, name, cmd, args, { failOn } = {}) {
  process.stdout.write(`\n▶ ${id} ${name}: ${cmd} ${args.join(' ')}\n`);
  const res = spawnSync(cmd, args, { encoding: 'utf8', env: process.env });
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
  return ok;
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const gzKb = (buf) => gzipSync(buf).length / 1024;
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']?([^"'\\s>]+)`, 'i'))?.[1];

/** Resolve a script/stylesheet URL found in `page` to its key in `sizes` ("/_astro/x.js"). */
function assetKey(url, page) {
  const path = url.split(/[?#]/)[0];
  if (/^(https?:)?\/\//.test(path)) return null; // external; not part of our bundle
  return path.startsWith('/') ? path : posix.join(posix.dirname(page), path);
}

function budgets() {
  process.stdout.write('\n▶ G8 Budgets\n');
  const { islandKbGzip, pageJsKbGzip, cssKbGzip } = config.budgets;
  const files = walk('dist');
  const problems = [];
  const sizes = new Map();
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      sizes.set('/' + relative('dist', file).split('\\').join('/'), gzKb(readFileSync(file)));
    }
  }
  for (const [path, kb] of sizes) {
    if (path.endsWith('.js') && kb > islandKbGzip)
      problems.push(`${path} is ${kb.toFixed(2)} KB gz (> ${islandKbGzip})`);
  }
  for (const file of files.filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    const page = '/' + relative('dist', file).split('\\').join('/');
    let js = 0;
    let css = 0;
    for (const [tag, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/type=["']?application\/(ld\+)?json/i.test(tag)) continue;
      const src = attr(tag, 'src');
      if (src) {
        const key = assetKey(src, page);
        if (key && !sizes.has(key)) problems.push(`${page} references missing script ${src}`);
        js += (key && sizes.get(key)) || 0;
      } else {
        js += gzKb(Buffer.from(body));
      }
    }
    for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
      if (!/\srel=["']?stylesheet/i.test(tag)) continue;
      const href = attr(tag, 'href');
      const key = href && assetKey(href, page);
      if (key && !sizes.has(key)) problems.push(`${page} references missing stylesheet ${href}`);
      css += (key && sizes.get(key)) || 0;
    }
    for (const [, body] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
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
let distReady = existsSync('dist');
if (selected('G1')) {
  distReady = run('G1', 'Clean build', npx, ['astro', 'build'], {
    failOn: /\[WARN\]|\bwarning\b/i,
  });
}
if (selected('G2')) run('G2', 'Types', npx, ['astro', 'check', '--minimumFailingSeverity', 'hint']);
if (selected('G3')) {
  run('G3', 'Lint', npx, ['eslint', '.', '--max-warnings', '0']);
  run('G3', 'Format', npx, ['prettier', '--check', '.']);
}
if (selected('G4')) run('G4', 'Unit tests', npx, ['vitest', 'run']);

// The gates below inspect dist/, so they only count when this run produced (or found) a build.
const needsDist = (id, name, fn) => {
  if (distReady) return fn();
  const why = selected('G1') ? 'skipped: G1 build failed' : 'skipped: no dist/ (run G1 first)';
  results.push({ id, name, ok: false, detail: why });
};
if (selected('G7')) {
  // External https links are reported by the PO review, not gated (they can flake).
  needsDist('G7', 'Internal links', () =>
    run('G7', 'Internal links', npx, [
      'linkinator',
      'dist',
      '--recurse',
      '--check-fragments',
      '--skip',
      '^https://',
    ]),
  );
}
if (selected('G8')) needsDist('G8', 'Budgets', budgets);
if (selected('G11')) {
  run('G11', 'Production dependency audit', 'npm', [
    'audit',
    '--omit=dev',
    '--audit-level=moderate',
  ]);
}
if (selected('G5', 'G6', 'G9')) {
  if (config.pages.length) {
    needsDist('G5/G6/G9', 'Lighthouse, axe and screenshots', () =>
      run('G5/G6/G9', 'Lighthouse, axe and screenshots', 'node', ['scripts/audit-pages.mjs']),
    );
  } else {
    results.push({
      id: 'G5/G6/G9',
      name: 'Page audits',
      ok: true,
      detail: 'N/A: no pages listed in gates.config.json yet',
    });
  }
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
process.exit(results.length > 0 && results.every((r) => r.ok) ? 0 : 1);
