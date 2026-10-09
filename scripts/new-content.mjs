#!/usr/bin/env node
// Scaffolds a new content file with every frontmatter field present and marked TODO.
//
//   npm run new -- <type> "Name" [--topic <leaf>] [--author <id>] [--mdx]
//
// --topic takes a leaf slug from src/config/taxonomy.ts (e.g. gaming-laptops, android-phones).
//
// Types: review, best, versus, howto, news, deal, author, brand.
// Articles start as `draft: true`. The schema refuses to publish anything that still contains
// "TODO", so flip `draft` to false only when every field is filled in. See CONTENT-GUIDE.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { findTopic, slugify } from '../src/config/taxonomy.ts';

export const folders = {
  review: 'reviews',
  best: 'guides',
  versus: 'versus',
  howto: 'howtos',
  news: 'news',
  deal: 'deals',
  author: 'authors',
  brand: 'brands',
};

const DEFAULT_TOPIC = { hub: 'computing', category: 'laptops', subcategory: 'ultrabooks' };
const IMAGE = '../../assets/samples/TODO-replace.jpg';

/** YAML double-quoted string (JSON strings are valid YAML). */
const q = (text) => JSON.stringify(text);

/**
 * A default author or brand id: the first real (non-sample) entry, else the first sample one so
 * the draft still builds. Tests stop a published article from pointing at a sample entry.
 */
function defaultId(contentDir, folder) {
  const dir = join(contentDir, folder);
  if (!existsSync(dir)) return undefined;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  const isSample = (f) => /^sample:\s*true\b/m.test(readFileSync(join(dir, f), 'utf8'));
  const file = files.find((f) => !isSample(f)) ?? files[0];
  return file?.replace(/\.yaml$/, '');
}

function base({ name, type, topic, author, today }) {
  const sub = topic.subcategory
    ? `subcategory: ${topic.subcategory}`
    : '# subcategory: only when the category has subcategories';
  return `title: ${q(`TODO: headline for ${name}`)}
description: ${q('TODO: one or two sentences for search results (160 characters max)')}
type: ${type}
hub: ${topic.hub} # check: hub, category and subcategory must match src/config/taxonomy.ts
category: ${topic.category}
${sub}
tags: [] # lowercase-hyphenated, e.g. [thin-and-light]
brands: [] # brand ids from src/content/brands, e.g. [northwind]
author: ${author} # check: author id from src/content/authors
publishDate: ${today}
# updatedDate: ${today}
heroImage: ${IMAGE}
heroAlt: ${q('TODO: describe the hero image for screen readers')}
draft: true # set to false once every TODO is gone
featured: false
noindex: false`;
}

const retailer = (today) => `  - name: amazon-in # amazon-in or flipkart
    url: https://www.amazon.in/dp/TODO
    price: TODO # rupees, whole number
    lastChecked: ${today}`;

const bodies = {
  review: ({ name, brand, today }) => `product:
  name: ${q(name)}
  brand: ${brand} # check: brand id from src/content/brands
  model: ${q('TODO: model number')}
  # releaseDate: 2026-01-01
  msrp: TODO # launch price in rupees
rating: TODO # 0 to 5 in half steps
badge: null # editors-choice, recommended, best-value or null
verdict: ${q('TODO: one short paragraph')}
pros:
  - ${q('TODO: pro 1')}
  - ${q('TODO: pro 2')}
  - ${q('TODO: pro 3')}
cons:
  - ${q('TODO: con 1')}
  - ${q('TODO: con 2')}
  - ${q('TODO: con 3')}
cheatSheet:
  whatIsIt: ${q('TODO')}
  whoIsItFor: ${q('TODO')}
  price: ${q('TODO: e.g. ₹74,990 for 16 GB / 512 GB')}
  likes: ${q('TODO')}
  dislikes: ${q('TODO')}
specs:
  - { label: ${q('TODO: e.g. Display')}, value: ${q('TODO')} }
scores: [] # e.g. - { label: Battery, score: 4.5, note: optional }
benchmarks: [] # see CONTENT-GUIDE.md
retailers:
${retailer(today)}
# youtubeId: 11-character id
gallery: [] # - { src: ../../assets/..., alt: ..., caption: optional }
testingNotes: ${q('TODO: how long and how it was tested')}
buyIf: [] # e.g. - You carry your laptop all day
dontBuyIf: [] # e.g. - You need lots of ports
faq: [] # - { q: ..., a: ... }`,
  best: ({ name }) => `picks:
  - rank: 1
    label: ${q('TODO: e.g. Best overall')}
    # reviewRef: review id, e.g. northwind-aero-14
    productName: ${q('TODO: product name')}
    image: ${IMAGE}
    imageAlt: ${q('TODO: describe the image')}
    tagline: ${q(`TODO: one line on why it leads ${name}`)}
    summary: ${q('TODO: why it is here and how it did in our tests')}
    # bestFor: e.g. Students
    rating: TODO # 0 to 5 in half steps
    price: TODO # rupees
    specs: []
    pros: [${q('TODO')}]
    cons: [${q('TODO')}]
    buyIf: []
    dontBuyIf: []
    scores: []
    retailers: []
alsoTested: [] # - { productName: ..., rating: 3.5, summary: ..., reviewRef: optional }
faq: [] # - { q: ..., a: ... }`,
  versus: () => {
    const side = (label) => `  # reviewRef: review id
  productName: ${q(`TODO: product ${label}`)}
  image: ${IMAGE}
  imageAlt: ${q('TODO: describe the image')}
  rating: TODO # 0 to 5 in half steps
  price: TODO # rupees
  retailers: []`;
    const round = (n) =>
      `  - { name: ${q(`TODO: round ${n}`)}, winner: tie, summary: ${q('TODO')} }`;
    return `productA:
${side('A')}
productB:
${side('B')}
# shortAnswer: Pick B if … (one sentence after the score)
specs: [] # - { label: Battery (our test), a: '14:10', b: '12:05', better: a }
rounds: # winner: a, b or tie
${[1, 2, 3].map(round).join('\n')}
overallWinner: tie # a, b or tie
verdict: ${q('TODO: which one to buy and why')}`;
  },
  howto: () => `difficulty: easy # easy, medium or hard
timeRequired: ${q('TODO: e.g. 10 minutes')}
# worksOn: Windows 10 and 11
# quickAnswer: the whole answer in one or two sentences
tools: []
steps:
  - title: ${q('TODO: step 1')}
    body: ${q('TODO')}
    # image: ../../assets/...
    # imageAlt: required when there is an image
    # tip: optional editor's tip
troubleshooting: [] # - { q: problem, a: fix }`,
  news: () => `# source: { name: ..., url: https://... }
# heroCredit: 'Image: Brand'
keyFacts: [] # - { label: India price, value: '₹24,999 (8GB/128GB)' }
relatedReviews: [] # review ids`,
  deal: ({ name }) => `product: ${q(name)}
originalPrice: TODO # rupees
dealPrice: TODO # rupees, lower than originalPrice
retailer: amazon-in # amazon-in or flipkart
url: https://www.amazon.in/dp/TODO
# expiresAt: 2026-12-31
# couponCode: CODE
# badge: lowest-price # lowest-price, great-value or editors-pick
# reviewRef: review id`,
};

const dataFiles = {
  author: ({ name }) => `name: ${q(name)}
role: ${q('TODO: e.g. Senior laptops editor')}
bio: ${q('TODO: two or three sentences')}
# avatar: ../../assets/authors/<file>.jpg
expertise: []
social: [] # - { label: X, href: https://... }
`,
  brand: ({ name }) => `name: ${q(name)}
description: ${q('TODO: one sentence about the brand')}
# logo: ../../assets/brands/<file>.svg
# website: https://...
`,
};

const articleTypes = {
  review: 'review',
  best: 'best',
  versus: 'versus',
  howto: 'how-to',
  news: 'news',
  deal: 'deal',
};

/**
 * Builds the file. Returns its path. Throws on bad input or an existing file.
 * @param {{
 *   type: string;
 *   name: string;
 *   topic?: { hub: string; category: string; subcategory?: string | undefined };
 *   author?: string;
 *   mdx?: boolean;
 *   contentDir?: string;
 *   today?: string;
 * }} options
 */
export function scaffold({
  type,
  name,
  topic,
  author,
  mdx = false,
  contentDir = 'src/content',
  today,
}) {
  if (!folders[type]) {
    throw new Error(`Unknown type "${type}". Use one of: ${Object.keys(folders).join(', ')}`);
  }
  const slug = slugify(name ?? '');
  if (!slug) throw new Error('Give the new entry a name, e.g. "Northwind Aero 14"');
  if (author !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(author)) {
    throw new Error(`--author takes an author id such as asha-rao, got "${author}"`);
  }
  const date = today ?? new Date().toISOString().slice(0, 10);
  const dir = join(contentDir, folders[type]);
  const isData = type in dataFiles;
  const file = join(dir, `${slug}.${isData ? 'yaml' : mdx ? 'mdx' : 'md'}`);
  if (existsSync(file)) throw new Error(`${file} already exists`);

  let content;
  if (isData) {
    content = dataFiles[type]({ name });
  } else {
    const fm = [
      base({
        name,
        type: articleTypes[type],
        topic: topic ?? DEFAULT_TOPIC,
        author: author ?? defaultId(contentDir, 'authors') ?? 'TODO-author',
        today: date,
      }),
      bodies[type]({ name, brand: defaultId(contentDir, 'brands') ?? 'TODO-brand', today: date }),
    ].join('\n');
    content = `---\n${fm}\n---\n\nTODO: write the article. See CONTENT-GUIDE.md for the sections each type needs.\n`;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, content, { flag: 'wx' });
  return file;
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      topic: { type: 'string' },
      author: { type: 'string' },
      mdx: { type: 'boolean', default: false },
    },
  });
  const [type, ...nameParts] = positionals;
  let topic;
  if (values.topic) {
    const found = findTopic(values.topic);
    if (!found)
      throw new Error(`Unknown topic "${values.topic}". Use a subcategory slug, e.g. ultrabooks`);
    topic = {
      hub: found.hub.slug,
      category: found.category.slug,
      subcategory: found.subcategory?.slug,
    };
  }
  const file = scaffold({
    type,
    name: nameParts.join(' '),
    topic,
    author: values.author,
    mdx: values.mdx,
  });
  const next =
    type in dataFiles
      ? 'Fill in every TODO before the next build.'
      : 'Fill in every TODO, then set draft: false.';
  console.log(`Created ${relative(process.cwd(), file)}. ${next}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
