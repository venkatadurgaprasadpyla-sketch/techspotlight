import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  brandSummary,
  itemsByAuthor,
  itemsByBrand,
  monthLabel,
  monthListings,
  monthPath,
  similarBrands,
  tagLabel,
  tagListings,
  verdictLabel,
} from '~/lib/archives';
import { byDate, toCardItem, type ArticleEntry, type CardItem } from '~/lib/cards';
import {
  dealSchema,
  guideSchema,
  howtoSchema,
  newsSchema,
  reviewSchema,
  versusSchema,
} from '~/lib/content-schema';
import { searchFields } from '~/lib/search';
import type { ArticleCollection } from '~/lib/urls';
import { helpers, readData } from './helpers/content';

const schemas = {
  reviews: reviewSchema(helpers),
  guides: guideSchema(helpers),
  versus: versusSchema(helpers),
  howtos: howtoSchema(helpers),
  news: newsSchema(helpers),
  deals: dealSchema(helpers),
};
const items: CardItem[] = (Object.keys(schemas) as ArticleCollection[])
  .flatMap((collection) =>
    readdirSync(join('src/content', collection)).map((file) => {
      const data = schemas[collection].parse(readData(join('src/content', collection, file)));
      const entry = {
        id: file.replace(/\.mdx?$/, ''),
        collection,
        data,
      } as unknown as ArticleEntry;
      return toCardItem(entry, new Map());
    }),
  )
  .sort(byDate);

describe('archives', () => {
  it('formats tag and month labels and paths', () => {
    expect(tagLabel('thin-and-light')).toBe('Thin and light');
    expect(monthLabel(2026, 9)).toBe('September 2026');
    expect(monthPath(2026, 9)).toBe('/archive/2026/09/');
  });

  it('lists every tag A to Z with its articles newest first', () => {
    const tags = tagListings(items);
    expect(tags.map((t) => t.tag)).toEqual([...tags.map((t) => t.tag)].sort());
    const battery = tags.find((t) => t.tag === 'battery');
    expect(battery?.path).toBe('/tags/battery/');
    expect(battery?.items.every((i) => i.tags.includes('battery'))).toBe(true);
    expect(battery?.crumbs.map((c) => c.href)).toEqual(['/', '/tags/', '/tags/battery/']);
    const total = tags.reduce((n, t) => n + t.items.length, 0);
    expect(total).toBe(items.reduce((n, i) => n + i.tags.length, 0));
  });

  it('files articles by publish month, newest month first', () => {
    const months = monthListings(items);
    expect(months.map((m) => m.path)).toEqual(['/archive/2026/10/', '/archive/2026/09/']);
    expect(months.flatMap((m) => m.items)).toHaveLength(items.length);
    for (const m of months) {
      expect(m.items.every((i) => i.publishDate.getUTCMonth() + 1 === m.month)).toBe(true);
      const times = m.items.map((i) => i.publishDate.getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
    }
  });

  it('summarises a brand: reviews by rating, average, categories', () => {
    const northwind = itemsByBrand(items, 'northwind');
    const summary = brandSummary(northwind);
    expect(summary.reviews.map((r) => r.rating)).toEqual([4.5, 3.5]);
    expect(summary.averageRating).toBe(4);
    expect(summary.categories).toEqual(['Laptops']);
    expect(brandSummary([]).averageRating).toBeUndefined();
  });

  it('finds an author’s articles and similar brands by shared hubs', () => {
    expect(itemsByAuthor(items, 'asha-testwell').every((i) => i.author === 'asha-testwell')).toBe(
      true,
    );
    expect(similarBrands(items, 'kestrel', ['kestrel', 'northwind', 'orbit'])).toEqual(['orbit']);
    expect(similarBrands(items, 'northwind', ['kestrel', 'northwind', 'orbit'])).toEqual([]);
  });

  it('labels unbadged verdicts from the rating', () => {
    expect(verdictLabel(4)).toBe('Recommended');
    expect(verdictLabel(3.5)).toBe('Worth a look');
    expect(verdictLabel(2.5)).toBe('Skip it');
    expect(verdictLabel(undefined)).toBe('See the review');
  });
});

describe('searchFields', () => {
  it('gives reviews type, hub, product, rating and price, with no commas', () => {
    const review = items.find((i) => i.id === 'northwind-aero-14');
    if (!review) throw new Error('sample review missing');
    const { filters, meta } = searchFields(review, '/_astro/x.webp');
    expect(filters).toEqual([
      ['type', 'Review'],
      ['hub', 'Computing'],
    ]);
    const m = Object.fromEntries(meta);
    expect(m).toMatchObject({ type: 'Review', product: 'Northwind Aero 14', rating: '4.5' });
    expect(m.image).toBe('/_astro/x.webp');
    expect(Number(m.price)).toBe(review.bestOffer?.price);
    for (const [, value] of [...filters, ...meta]) expect(value).not.toMatch(/,/);
  });

  it('uses the deal price for deals and leaves out empty fields', () => {
    const deal = items.find((i) => i.collection === 'deals');
    if (!deal?.deal) throw new Error('sample deal missing');
    const m = Object.fromEntries(searchFields(deal).meta);
    expect(Number(m.price)).toBe(deal.deal.dealPrice);
    expect(m.rating).toBeUndefined();
    expect(m.image).toBeUndefined();
  });
});
