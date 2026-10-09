import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { byDate, toCardItem, type ArticleEntry, type CardItem } from '~/lib/cards';
import {
  dealSchema,
  guideSchema,
  howtoSchema,
  newsSchema,
  reviewSchema,
  versusSchema,
} from '~/lib/content-schema';
import { buildListings, trending } from '~/lib/listings';
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
const authors = new Map([['asha-testwell', 'Asha Testwell']]);

/** The sample content, parsed the way Astro would and mapped to cards. */
const items: CardItem[] = (Object.keys(schemas) as ArticleCollection[])
  .flatMap((collection) =>
    readdirSync(join('src/content', collection)).map((file) => {
      const data = schemas[collection].parse(readData(join('src/content', collection, file)));
      const entry = {
        id: file.replace(/\.mdx?$/, ''),
        collection,
        data,
      } as unknown as ArticleEntry;
      return toCardItem(entry, authors);
    }),
  )
  .sort(byDate);

const find = (id: string) => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`missing sample ${id}`);
  return item;
};

describe('toCardItem', () => {
  it('maps a review with its rating, badge, cheapest offer and URL', () => {
    const aero = find('northwind-aero-14');
    expect(aero).toMatchObject({
      url: '/ultrabooks/northwind-aero-14-review/',
      leafLabel: 'Ultrabooks',
      rating: 4.5,
      badge: 'editors-choice',
      productName: 'Northwind Aero 14',
      authorName: 'Asha Testwell',
      bestOffer: { retailer: 'amazon-in', price: 72490 },
    });
    expect(aero.date).toEqual(new Date('2026-10-01'));
    expect(aero.specLine?.split(' · ')).toHaveLength(4);
  });

  it('uses the category as the leaf when it has no subcategories', () => {
    expect(find('kestrel-nova-5g')).toMatchObject({
      leaf: 'android-phones',
      url: '/android-phones/kestrel-nova-5g-review/',
    });
  });

  it('leaves the author name out when the author is not published', () => {
    expect(find('kestrel-nova-5g').authorName).toBeUndefined();
  });

  it('gives deals their deal price as the offer', () => {
    expect(find('northwind-aero-14-deal').bestOffer).toMatchObject({ price: 64990 });
  });
});

describe('buildListings', () => {
  const listings = buildListings(items);
  const at = (path: string) => listings.find((l) => l.path === path);

  it('builds live hubs only; other hubs stay placeholders', () => {
    expect(at('/computing/')?.kind).toBe('hub');
    expect(at('/phones/')?.kind).toBe('hub');
    expect(at('/audio/')).toBeUndefined();
  });

  it('gives every listing a unique path', () => {
    const paths = listings.map((l) => l.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('files articles under hub, category, subcategory and type', () => {
    const ids = (path: string) => at(path)?.items.map((i) => i.id);
    expect(ids('/computing/laptops/gaming-laptops/')).toEqual(['northwind-blaze-16']);
    expect(ids('/computing/laptops/')).toContain('best-ultrabooks');
    expect(ids('/computing/laptops/')).not.toContain('check-laptop-battery-health-windows');
    expect(ids('/phones/reviews/')).toEqual(['kestrel-nova-5g']);
    expect(ids('/reviews/')).toHaveLength(3);
    expect(at('/computing/networking/')?.items).toEqual([]);
  });

  it('keeps items newest first', () => {
    const dates = at('/computing/')?.items.map((i) => i.date.getTime()) ?? [];
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('builds breadcrumbs from Home down to the page', () => {
    expect(at('/computing/laptops/ultrabooks/')?.crumbs.map((c) => c.label)).toEqual([
      'Home',
      'Computing',
      'Laptops',
      'Ultrabooks',
    ]);
    expect(at('/phones/best/')?.crumbs.map((c) => c.href)).toEqual([
      '/',
      '/phones/',
      '/phones/best/',
    ]);
  });
});

describe('trending', () => {
  it('puts featured articles first, then the best-rated reviews', () => {
    const list = trending(items);
    expect(list.slice(0, 3).every((i) => i.featured)).toBe(true);
    expect(list).toHaveLength(4);
    expect(list[3]?.id).toBe('northwind-blaze-16');
  });
});
