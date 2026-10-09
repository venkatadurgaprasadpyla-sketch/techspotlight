import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  byDate,
  linkDealsToReviews,
  toCardItem,
  type ArticleEntry,
  type CardItem,
} from '~/lib/cards';
import {
  dealSchema,
  guideSchema,
  howtoSchema,
  newsSchema,
  reviewSchema,
  versusSchema,
} from '~/lib/content-schema';
import { findTopic } from '~/config/taxonomy';
import { buildListings, topicCrumbs, trending } from '~/lib/listings';
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

  it('maps deal details, ending at the end of the expiry day in India', () => {
    expect(find('kestrel-nova-5g-deal').deal).toMatchObject({
      product: 'Kestrel Nova 5G',
      originalPrice: 23999,
      dealPrice: 21999,
      retailer: 'flipkart',
      couponCode: 'SAMPLE2000',
      badge: 'great-value',
      reviewId: 'kestrel-nova-5g',
      endsAt: new Date('2026-12-31T18:30:00Z'),
    });
    expect(find('orbit-x2-deal').deal?.endsAt).toBeUndefined();
    expect(find('kestrel-nova-5g').deal).toBeUndefined();
  });

  it('links deals to their published review', () => {
    const copy = () => items.map((i) => ({ ...i, ...(i.deal && { deal: { ...i.deal } }) }));
    const copies = copy();
    linkDealsToReviews(copies);
    const deal = copies.find((i) => i.id === 'northwind-aero-14-deal')?.deal;
    expect(deal).toMatchObject({ rating: 4.5, reviewUrl: '/ultrabooks/northwind-aero-14-review/' });
    // Without the review in the build there is nothing to link.
    const alone = copy().filter((i) => i.id !== 'kestrel-nova-5g');
    linkDealsToReviews(alone);
    expect(alone.find((i) => i.id === 'kestrel-nova-5g-deal')?.deal?.reviewUrl).toBeUndefined();
  });
});

describe('buildListings', () => {
  const listings = buildListings(items);
  const at = (path: string) => listings.find((l) => l.path === path);

  it("lists live deals first, editor's picks before other badges", () => {
    const now = new Date('2026-10-09T12:00:00Z');
    const ended = {
      ...find('northwind-aero-14-deal'),
      id: 'ended-deal',
      url: '/deals/ended-deal/',
      date: new Date('2026-10-09'),
      deal: { ...find('northwind-aero-14-deal').deal, endsAt: new Date('2026-10-05') },
    } as CardItem;
    const deals = buildListings([...items, ended], now).find((l) => l.path === '/deals/');
    expect(deals?.items.map((i) => i.id)).toEqual([
      'orbit-x2-deal',
      'kestrel-nova-5g-deal',
      'northwind-aero-14-deal',
      'ended-deal',
    ]);
  });

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

describe('topicCrumbs', () => {
  it('ends at the subcategory, or the category when it has none', () => {
    const sub = findTopic('ultrabooks');
    const cat = findTopic('android-phones');
    if (!sub || !cat) throw new Error('taxonomy changed');
    expect(topicCrumbs(sub).map((c) => c.href)).toEqual([
      '/',
      '/computing/',
      '/computing/laptops/',
      '/computing/laptops/ultrabooks/',
    ]);
    expect(topicCrumbs(cat).at(-1)).toEqual({
      label: cat.category.label,
      href: '/phones/android-phones/',
    });
  });
});
