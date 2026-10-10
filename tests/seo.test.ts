import { describe, expect, it } from 'vitest';
import { checkFeed, checkPage, expectedTypes } from '../scripts/seo-check.mjs';
import type { CardItem } from '~/lib/cards';
import { dealEndsAt } from '~/lib/deals';
import { feedItems } from '~/lib/feeds';
import {
  absolute,
  article,
  dealProduct,
  faqPage,
  itemList,
  organization,
  review,
  website,
  type JsonLd,
} from '~/lib/structured-data';

const base = {
  url: '/best/best-ultrabooks/',
  title: 'The best ultrabooks',
  description: 'Thin laptops we tested.',
  images: [absolute('/hero.jpg')],
  author: { name: 'Asha Testwell', url: absolute('/authors/asha-testwell/') },
  publishDate: new Date('2026-10-01T00:00:00Z'),
};
const crumbs: JsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') }],
};

/** A minimal built page with the head tags G12 looks for and the given JSON-LD. */
function page(
  path: string,
  jsonLd: JsonLd[],
  { title = 'A page | TechSpotlight', noindex = false } = {},
) {
  const canonical = absolute(path);
  return [
    `<title>${title}</title>`,
    '<meta name="description" content="About this page" />',
    `<link rel="canonical" href="${canonical}" />`,
    '<meta property="og:site_name" content="TechSpotlight" />',
    `<meta property="og:url" content="${canonical}" />`,
    noindex ? '<meta name="robots" content="noindex, follow" />' : '',
    '<meta property="og:image" content="https://techspotlight.pages.dev/og-default.png" />',
    ...jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`),
  ].join('\n');
}

describe('structured data', () => {
  it('gives the homepage an Organization and a WebSite with a search action', () => {
    const org = organization();
    expect(org['@id']).toBe('https://techspotlight.pages.dev/#organization');
    expect(org.logo).toMatchObject({ url: 'https://techspotlight.pages.dev/logo.png' });
    expect(website()).toMatchObject({
      potentialAction: {
        target: { urlTemplate: 'https://techspotlight.pages.dev/search/?q={search_term_string}' },
      },
    });
  });

  it('gives full timestamps and falls back to the publish date for dateModified', () => {
    const a = article(base);
    expect(a).toMatchObject({
      '@type': 'Article',
      headline: 'The best ultrabooks',
      datePublished: '2026-10-01T00:00:00.000Z',
      dateModified: '2026-10-01T00:00:00.000Z',
      mainEntityOfPage: 'https://techspotlight.pages.dev/best/best-ultrabooks/',
      author: { '@type': 'Person', name: 'Asha Testwell' },
    });
    expect(article({ ...base, updatedDate: new Date('2026-10-05') }, 'NewsArticle')).toMatchObject({
      '@type': 'NewsArticle',
      dateModified: '2026-10-05T00:00:00.000Z',
    });
  });

  it('describes a review as a rating of a Product with rupee offers', () => {
    const r = review({
      ...base,
      product: { name: 'Northwind Aero 14', brand: 'Northwind', image: absolute('/p.jpg') },
      rating: 4.5,
      verdict: 'A great laptop.',
      offers: [{ price: 64990, url: 'https://www.amazon.in/dp/X', seller: 'Amazon.in' }],
    });
    expect(r).toMatchObject({
      '@type': 'Review',
      reviewBody: 'A great laptop.',
      reviewRating: { ratingValue: 4.5, bestRating: 5, worstRating: 0 },
      itemReviewed: {
        '@type': 'Product',
        brand: { name: 'Northwind' },
        offers: [{ price: 64990, priceCurrency: 'INR', seller: { name: 'Amazon.in' } }],
      },
    });
    const unpriced = review({
      ...r,
      ...base,
      product: { name: 'X', image: 'https://a/b.jpg' },
      rating: 3,
      verdict: 'Ok',
      offers: [],
    });
    expect(unpriced.itemReviewed).not.toHaveProperty('offers');
    expect(unpriced.itemReviewed).not.toHaveProperty('brand');
  });

  it('numbers guide picks and makes their URLs absolute', () => {
    const list = itemList('Best', [
      { name: 'A', url: '/a-review/' },
      { name: 'B', url: '/best/x/#pick-2' },
    ]);
    expect(list).toMatchObject({
      numberOfItems: 2,
      itemListElement: [
        { position: 1, url: 'https://techspotlight.pages.dev/a-review/' },
        { position: 2, url: 'https://techspotlight.pages.dev/best/x/#pick-2' },
      ],
    });
  });

  it('gives deals a price-valid-until date', () => {
    const deal = dealProduct({
      name: 'Kestrel Nova 5G',
      description: 'A deal',
      image: absolute('/p.jpg'),
      offer: {
        price: 19999,
        url: 'https://www.flipkart.com/x',
        seller: 'Flipkart',
        validUntil: dealEndsAt(new Date('2026-10-31'), '02:00'),
        availability: 'SoldOut',
      },
    });
    // 02:00 IST on the 31st is still the 30th in UTC; the price holds through the 31st in India.
    expect(deal.offers).toMatchObject({
      priceValidUntil: '2026-10-31',
      priceCurrency: 'INR',
      availability: 'https://schema.org/SoldOut',
    });
    const midnight = dealProduct({
      name: 'X',
      description: 'Y',
      image: absolute('/p.jpg'),
      offer: {
        price: 1,
        url: 'https://a.in/',
        seller: 'A',
        validUntil: dealEndsAt(new Date('2026-10-31')),
      },
    });
    expect(midnight.offers).toMatchObject({ priceValidUntil: '2026-10-31' });
    expect(midnight.offers).not.toHaveProperty('availability');
  });
});

describe('G12 check', () => {
  it('expects the right structured data per page type', () => {
    expect(expectedTypes('/')).toEqual(['Organization', 'WebSite']);
    expect(expectedTypes('/laptops/aero-14-review/')).toContain('Review');
    expect(expectedTypes('/best/best-ultrabooks/')).toEqual(
      expect.arrayContaining(['BreadcrumbList', 'Article', 'ItemList']),
    );
    expect(expectedTypes('/news/x/')).toContain('NewsArticle');
    expect(expectedTypes('/deals/x/')).toContain('Product');
    expect(expectedTypes('/computing/')).toEqual(['BreadcrumbList']);
  });

  it('passes pages built from the structured-data helpers', () => {
    const guide = page('/best/best-ultrabooks/', [
      article(base),
      itemList('Best', [{ name: 'A', url: '/a/' }]),
      faqPage([{ q: 'Q?', a: 'A.' }]),
      crumbs,
    ]);
    expect(checkPage('/best/best-ultrabooks/', guide).problems).toEqual([]);
    expect(checkPage('/', page('/', [organization(), website()])).problems).toEqual([]);
  });

  it('reports missing page-type data, bad fields, bad JSON and missing head tags', () => {
    expect(checkPage('/best/x/', page('/best/x/', [crumbs])).problems).toEqual([
      'missing Article JSON-LD',
      'missing ItemList JSON-LD',
    ]);
    const noAuthor = article({ ...base, author: undefined });
    expect(checkPage('/vs/x/', page('/vs/x/', [noAuthor, crumbs])).problems).toEqual([
      'Article: bad author.name and author.url',
    ]);
    const broken = '<title>x</title><script type="application/ld+json">{oops</script>';
    const problems = checkPage('/x/', broken).problems;
    expect(problems).toContain('missing meta description');
    expect(problems).toContain('canonical is not this page: undefined');
    expect(problems).toContain('missing og:image');
    expect(problems.some((p: string) => p.startsWith('JSON-LD does not parse'))).toBe(true);
  });

  it('flags a rating outside its scale and unknown types', () => {
    const r = review({
      ...base,
      product: { name: 'X', image: absolute('/p.jpg') },
      rating: 7,
      verdict: 'Ok',
      offers: [],
    });
    expect(checkPage('/l/x-review/', page('/l/x-review/', [r, crumbs])).problems).toEqual([
      'Review: bad reviewRating.ratingValue within worstRating..bestRating',
    ]);
    const odd = { '@context': 'https://schema.org', '@type': 'Recipe' };
    expect(checkPage('/x/', page('/x/', [odd, crumbs])).problems).toEqual([
      'Recipe: no G12 rules for this @type',
    ]);
  });

  it('rejects mixed list URLs, empty offers and a missing FAQPage when the page has an FAQ', () => {
    const mixed = itemList('Best', [
      { name: 'A', url: '/a-review/' },
      { name: 'B', url: '/best/x/#pick-2' },
    ]);
    expect(
      checkPage('/best/x/', page('/best/x/', [article(base), mixed, crumbs])).problems,
    ).toEqual(['ItemList: bad urls all pages or all anchors']);
    const deal = dealProduct({
      name: 'X',
      description: 'Y',
      image: absolute('/p.jpg'),
      offer: { price: 1, url: 'https://a.in/', seller: 'A' },
    });
    expect(
      checkPage('/deals/x/', page('/deals/x/', [{ ...deal, offers: [] }, crumbs])).problems,
    ).toEqual(['Product: bad offers with price, priceCurrency and url']);
    const withFaq = page('/vs/x/', [article(base), crumbs]) + '<section id="faq"></section>';
    expect(checkPage('/vs/x/', withFaq).problems).toEqual(['missing FAQPage JSON-LD']);
  });

  it('checks the title template and that the canonical is the page itself', () => {
    const html = page('/other/', [crumbs], { title: 'Bare title' });
    expect(checkPage('/x/', html).problems).toEqual([
      'title does not follow "%s | site name": Bare title',
      'canonical is not this page: https://techspotlight.pages.dev/other/',
    ]);
  });

  it('checks RSS items', () => {
    const ok =
      '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>A</title><link>https://x.in/a/</link><pubDate>Thu, 08 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>';
    expect(checkFeed('rss.xml', ok)).toEqual([]);
    expect(checkFeed('rss.xml', ok.replace('https://x.in', ''))).toEqual([
      'rss.xml: item 1 link is not absolute',
    ]);
    const empty = '<?xml version="1.0"?><rss version="2.0"></rss>';
    expect(checkFeed('rss.xml', empty)).toEqual(['rss.xml: no items']);
    // A launch build before the first real article has empty feeds, and that is fine.
    expect(checkFeed('rss.xml', empty, { allowEmpty: true })).toEqual([]);
  });

  it('only asks noindex pages for well-formed JSON-LD', () => {
    expect(checkPage('/best/x/', page('/best/x/', [], { noindex: true })).problems).toEqual([]);
  });
});

describe('RSS feed items', () => {
  const item = (id: string, date: string, extra: Partial<CardItem> = {}) =>
    ({
      id,
      url: `/news/${id}/`,
      title: `Story ${id}`,
      description: 'About it',
      type: { slug: 'news', type: 'news', label: 'News' },
      leafLabel: 'Laptops',
      publishDate: new Date(date),
      ...extra,
    }) as CardItem;

  it('lists the newest first publications, capped', () => {
    const items = [
      item('a', '2026-10-01'),
      item('b', '2026-10-03', { updatedDate: new Date('2026-10-04') }),
      item('c', '2026-10-02'),
    ];
    const feed = feedItems(items, 2);
    expect(feed.map((f) => f.link)).toEqual(['/news/b/', '/news/c/']);
    expect(feed[0]).toEqual({
      title: 'Story b',
      link: '/news/b/',
      description: 'About it',
      pubDate: new Date('2026-10-03'),
      categories: ['News', 'Laptops'],
    });
  });
});
