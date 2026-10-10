#!/usr/bin/env node
// G12 SEO sanity: every built page has a templated title, description, self-referencing
// canonical (matching og:url) and share image; indexable pages have unique titles; every JSON-LD
// block parses and has the fields search engines require for its @type; each page type carries
// the structured data it should; feeds are well formed; the sitemap lists only indexable first
// pages. JSON-LD is expected as one object per script (no @graph), which is how BaseHead prints it.
//
//   node scripts/seo-check.mjs        checks dist/ (run after astro build)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const has = (value) =>
  Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
const isUrl = (value) => typeof value === 'string' && /^https:\/\//.test(value);
const isDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** Required fields per schema.org @type, as [description, test] pairs. */
const RULES = {
  Organization: [
    ['name', (d) => has(d.name)],
    ['url', (d) => isUrl(d.url)],
    ['logo.url', (d) => isUrl(d.logo?.url ?? d.logo)],
  ],
  WebSite: [
    ['name', (d) => has(d.name)],
    ['url', (d) => isUrl(d.url)],
    [
      'SearchAction urlTemplate with {search_term_string}',
      (d) => String(d.potentialAction?.target?.urlTemplate).includes('{search_term_string}'),
    ],
  ],
  BreadcrumbList: [
    [
      'itemListElement with position, name and item',
      (d) =>
        has(d.itemListElement) &&
        d.itemListElement.every(
          (e, i) => e.position === i + 1 && has(e.name) && isUrl(e.item?.['@id'] ?? e.item),
        ),
    ],
  ],
  Article: articleRules(),
  NewsArticle: articleRules(),
  Review: [
    ...articleRules(),
    ['itemReviewed.name', (d) => has(d.itemReviewed?.name)],
    [
      'reviewRating.ratingValue within worstRating..bestRating',
      (d) => {
        const r = d.reviewRating ?? {};
        return (
          typeof r.ratingValue === 'number' &&
          r.ratingValue >= (r.worstRating ?? 1) &&
          r.ratingValue <= (r.bestRating ?? 5)
        );
      },
    ],
    ['itemReviewed offers', (d) => offersOk(d.itemReviewed?.offers, true)],
  ],
  Product: [
    ['name', (d) => has(d.name)],
    ['image', (d) => isUrl(d.image) || (Array.isArray(d.image) && d.image.every(isUrl))],
    ['offers with price, priceCurrency and url', (d) => offersOk(d.offers, false)],
  ],
  ItemList: [
    [
      'itemListElement with position and url',
      (d) =>
        has(d.itemListElement) &&
        d.itemListElement.every((e, i) => e.position === i + 1 && isUrl(e.url)),
    ],
    ['urls all pages or all anchors', (d) => listUrlsOk(d.itemListElement ?? [])],
  ],
  FAQPage: [
    [
      'mainEntity questions with answers',
      (d) =>
        has(d.mainEntity) &&
        d.mainEntity.every(
          (q) => q['@type'] === 'Question' && has(q.name) && has(q.acceptedAnswer?.text),
        ),
    ],
  ],
  AboutPage: [
    ['name', (d) => has(d.name)],
    ['url', (d) => isUrl(d.url)],
  ],
  Person: [
    ['name', (d) => has(d.name)],
    ['url', (d) => isUrl(d.url)],
  ],
};

function articleRules() {
  return [
    ['headline', (d) => has(d.headline) && d.headline.length <= 110],
    ['image', (d) => has(d.image) && [d.image].flat().every(isUrl)],
    ['datePublished', (d) => isDate(d.datePublished)],
    ['dateModified', (d) => isDate(d.dateModified)],
    ['author.name and author.url', (d) => has(d.author?.name) && isUrl(d.author?.url)],
    ['publisher', (d) => has(d.publisher)],
  ];
}

const AVAILABILITY = new Set(['https://schema.org/InStock', 'https://schema.org/SoldOut']);

/** Offers are optional on a review's product (some have no price yet) but required on a deal. */
function offersOk(offers, optional) {
  if (offers === undefined) return optional;
  const list = [offers].flat();
  return (
    list.length > 0 &&
    list.every(
      (o) =>
        typeof o.price === 'number' &&
        o.priceCurrency === 'INR' &&
        isUrl(o.url) &&
        (o.availability === undefined || AVAILABILITY.has(o.availability)) &&
        (o.priceValidUntil === undefined || /^\d{4}-\d{2}-\d{2}$/.test(o.priceValidUntil)),
    )
  );
}

/** A guide's list points at separate pages or at anchors on one page, never a mix. */
function listUrlsOk(items) {
  const anchors = items.filter((e) => String(e.url).includes('#')).length;
  return anchors === 0 || anchors === items.length;
}

/** The structured data each page type must carry, by URL path (and FAQ section in `html`). */
export function expectedTypes(path, html = '') {
  if (path === '/') return ['Organization', 'WebSite'];
  const types = ['BreadcrumbList', ...(/ id="faq"/.test(html) ? ['FAQPage'] : [])];
  if (/^\/best\/[^/]+\/$/.test(path)) return [...types, 'Article', 'ItemList'];
  if (/^\/news\/[^/]+\/$/.test(path)) return [...types, 'NewsArticle'];
  if (/^\/(vs|how-to)\/[^/]+\/$/.test(path)) return [...types, 'Article'];
  if (/^\/deals\/[^/]+\/$/.test(path)) return [...types, 'Product'];
  if (/^\/[^/]+\/[^/]+-review\/$/.test(path)) return [...types, 'Review'];
  if (/^\/authors\/[^/]+\/$/.test(path)) return [...types, 'Person'];
  return types;
}

const meta = (html, attr, name) =>
  html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

/**
 * Problems on one built page. `path` is its URL path ("/best/x/"). Noindex pages only need
 * well-formed JSON-LD; indexable ones also need their page type's structured data.
 */
export function checkPage(path, html) {
  const problems = [];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const siteName = meta(html, 'property', 'og:site_name');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!title) problems.push('missing <title>');
  else if (path !== '/' && !(siteName && title.endsWith(` | ${siteName}`)))
    problems.push(`title does not follow "%s | site name": ${title}`);
  if (!meta(html, 'name', 'description')) problems.push('missing meta description');
  if (!isUrl(canonical) || new URL(canonical).pathname !== path)
    problems.push(`canonical is not this page: ${canonical}`);
  else if (meta(html, 'property', 'og:url') !== canonical)
    problems.push('og:url differs from canonical');
  if (!isUrl(meta(html, 'property', 'og:image'))) problems.push('missing og:image');

  const found = [];
  for (const [, body] of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    let data;
    try {
      data = JSON.parse(body);
    } catch (error) {
      problems.push(`JSON-LD does not parse: ${error.message}`);
      continue;
    }
    const type = data['@type'];
    found.push(type);
    if (data['@context'] !== 'https://schema.org') problems.push(`${type}: @context missing`);
    const rules = RULES[type];
    if (!rules) {
      problems.push(`${type}: no G12 rules for this @type`);
      continue;
    }
    for (const [field, test] of rules) if (!test(data)) problems.push(`${type}: bad ${field}`);
  }
  if (!noindex) {
    for (const type of expectedTypes(path, html))
      if (!found.includes(type)) problems.push(`missing ${type} JSON-LD`);
  }
  return { title, noindex, types: found, problems };
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Checks every page in `dist`; returns the problem lines. */
export function checkSite(dist) {
  const problems = [];
  const titles = new Map();
  let pages = 0;
  let hasArticles = false;
  for (const file of walk(dist).filter((f) => f.endsWith('index.html'))) {
    const path =
      '/' +
      relative(dist, file)
        .split('\\')
        .join('/')
        .replace(/index\.html$/, '');
    const html = readFileSync(file, 'utf8');
    // Every article template marks its root for search; listings and trust pages do not.
    hasArticles ||= /\sdata-pagefind-body[\s=>]/.test(html);
    const page = checkPage(path, html);
    pages += 1;
    page.problems.forEach((p) => problems.push(`${path}: ${p}`));
    if (!page.noindex && page.title) {
      const other = titles.get(page.title);
      if (other) problems.push(`${path}: same <title> as ${other}`);
      else titles.set(page.title, path);
    }
  }
  problems.push(...checkFeeds(dist, hasArticles), ...checkSitemap(dist));
  return { pages, problems };
}

/**
 * Every RSS feed is RSS 2.0 and each item has a title, an absolute link and a date. A feed may be
 * empty when `allowEmpty` (hub feeds before the hub's first article; the site feed before any).
 */
export function checkFeed(name, xml, { allowEmpty = false } = {}) {
  const problems = [];
  if (!/^<\?xml[^>]*\?><rss version="2\.0"/.test(xml)) problems.push(`${name}: not RSS 2.0`);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  if (items.length === 0 && !allowEmpty) problems.push(`${name}: no items`);
  items.forEach((item, i) => {
    if (!/<title>[^<]+<\/title>/.test(item)) problems.push(`${name}: item ${i + 1} has no title`);
    if (!/<link>https:\/\/[^<]+<\/link>/.test(item))
      problems.push(`${name}: item ${i + 1} link is not absolute`);
    if (!/<pubDate>[^<]+<\/pubDate>/.test(item))
      problems.push(`${name}: item ${i + 1} has no date`);
  });
  return problems;
}

function checkFeeds(dist, hasArticles) {
  const feeds = walk(dist).filter((f) => f.endsWith('rss.xml'));
  if (feeds.length === 0) return ['no RSS feeds built'];
  return feeds.flatMap((file) => {
    const name = relative(dist, file);
    return checkFeed(name, readFileSync(file, 'utf8'), {
      allowEmpty: name !== 'rss.xml' || !hasArticles,
    });
  });
}

/** The sitemap lists built, indexable first pages only. */
function checkSitemap(dist) {
  const problems = [];
  const files = walk(dist).filter((f) => /sitemap-\d+\.xml$/.test(f));
  if (files.length === 0) return ['no sitemap built'];
  for (const file of files) {
    for (const [, loc] of readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const path = new URL(loc).pathname;
      const page = join(dist, path, 'index.html');
      if (/\/page\/\d+\/$/.test(path)) problems.push(`sitemap lists page 2+: ${path}`);
      else if (!existsSync(page)) problems.push(`sitemap lists a missing page: ${path}`);
      else if (/<meta name="robots" content="noindex/.test(readFileSync(page, 'utf8')))
        problems.push(`sitemap lists a noindex page: ${path}`);
    }
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { pages, problems } = checkSite('dist');
  problems.forEach((p) => console.log(`  ✗ ${p}`));
  console.log(`G12: ${pages} pages checked, ${problems.length} problem(s)`);
  process.exit(problems.length ? 1 : 0);
}
