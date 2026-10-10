#!/usr/bin/env node
// G5 image audit over every built page: each <img> is an optimised astro:assets file (or a
// data-lightbox-img the gallery island fills from one) with width, height, alt, loading and
// decoding set, and a page asks for at most one high-priority (LCP) image.
//
//   node scripts/image-check.mjs        checks dist/ (run after astro build)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const attrs = (tag) =>
  new Map(
    [...tag.matchAll(/\s([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map((m) => [
      m[1].toLowerCase(),
      m[2] ?? m[3] ?? m[4] ?? '',
    ]),
  );

/** Problems with the images on one built page. */
export function checkImages(html) {
  const problems = [];
  let priority = 0;
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(tag.slice(4));
    const src = a.get('src') ?? '';
    const name = src.split('/').pop() || tag.slice(0, 60);
    if (!a.has('alt')) problems.push(`${name}: no alt attribute`);
    if (a.has('data-lightbox-img')) continue; // empty until the gallery island opens it
    if (!src.startsWith('/_astro/')) problems.push(`${name}: not an astro:assets image`);
    for (const key of ['width', 'height', 'decoding'])
      if (!a.get(key)) problems.push(`${name}: no ${key}`);
    const eager = a.get('loading') === 'eager' || a.get('fetchpriority') === 'high';
    if (!eager && a.get('loading') !== 'lazy') problems.push(`${name}: no loading="lazy"`);
    if (a.get('fetchpriority') === 'high') priority += 1;
  }
  if (priority > 1) problems.push(`${priority} images with fetchpriority="high" (max 1)`);
  return problems;
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pages = walk('dist').filter((f) => f.endsWith('.html'));
  let images = 0;
  const problems = pages.flatMap((file) => {
    const html = readFileSync(file, 'utf8');
    images += (html.match(/<img\b/gi) ?? []).length;
    return checkImages(html).map((p) => `/${relative('dist', file)}: ${p}`);
  });
  problems.forEach((p) => console.log(`  ✗ ${p}`));
  console.log(
    `G5 images: ${images} images on ${pages.length} pages, ${problems.length} problem(s)`,
  );
  process.exit(problems.length ? 1 : 0);
}
