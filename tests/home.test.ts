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
import { homeSections } from '~/lib/home';
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

describe('homeSections', () => {
  const now = new Date('2026-10-09T12:00:00Z');
  const home = homeSections(items, now);

  it('leads with featured stories, never deals, topped up with the latest', () => {
    const featured = items.filter((i) => i.featured && i.collection !== 'deals');
    expect(home.hero).toHaveLength(4);
    expect(home.hero.slice(0, featured.length).map((i) => i.id)).toEqual(featured.map((i) => i.id));
    expect(home.hero.some((i) => i.collection === 'deals')).toBe(false);
  });

  it('keeps hero stories out of the type rows', () => {
    const hero = new Set(home.hero.map((i) => i.url));
    for (const row of [home.reviews, home.guides, home.faceOffs, home.howtos]) {
      expect(row.some((i) => hero.has(i.url))).toBe(false);
    }
    expect(home.reviews.every((i) => i.collection === 'reviews')).toBe(true);
  });

  it('shows live deals only, best first, with the top one in the sidebar', () => {
    expect(home.deals.map((i) => i.id)).toEqual([
      'orbit-x2-deal',
      'kestrel-nova-5g-deal',
      'northwind-aero-14-deal',
    ]);
    expect(home.topDeal?.id).toBe('orbit-x2-deal');
    const later = homeSections(items, new Date('2027-01-02'));
    expect(later.deals.map((i) => i.id)).toEqual(['orbit-x2-deal']);
  });

  it('has a row per live hub with up to four stories and no deals', () => {
    expect(home.hubs.map((r) => r.hub.slug)).toEqual(['computing', 'phones']);
    for (const row of home.hubs) {
      expect(row.items.length).toBeLessThanOrEqual(4);
      expect(row.items.every((i) => i.hub === row.hub.slug && i.collection !== 'deals')).toBe(true);
    }
  });

  it('handles a site with no articles', () => {
    const empty = homeSections([], now);
    expect(empty.hero).toEqual([]);
    expect(empty.hubs).toEqual([]);
    expect(empty.topDeal).toBeUndefined();
  });
});

describe('homeSections with made-up stories', () => {
  const story = (n: number, extra: Partial<CardItem> = {}): CardItem =>
    ({
      ...items.find((i) => i.collection === 'news'),
      id: `s${n}`,
      url: `/news/s${n}/`,
      title: `Story ${n}`,
      hub: 'computing',
      featured: false,
      rating: undefined,
      date: new Date(2026, 8, 30 - n),
      ...extra,
    }) as CardItem;
  const many = Array.from({ length: 12 }, (_, n) => story(n));

  it('fills hub rows with stories not shown above before repeating any', () => {
    const home = homeSections(many);
    const above = new Set([...home.hero, ...home.reviews, ...home.howtos].map((i) => i.url));
    const row = home.hubs.find((r) => r.hub.slug === 'computing');
    expect(row?.items).toHaveLength(4);
    expect(row?.items.some((i) => above.has(i.url))).toBe(false);
  });

  it('repeats stories in a hub row only when the hub runs short', () => {
    const home = homeSections(many.slice(0, 5));
    expect(home.hubs.find((r) => r.hub.slug === 'computing')?.items.map((i) => i.id)).toEqual([
      's4',
      's0',
      's1',
      's2',
    ]);
  });

  it('trends five stories, none of them in the hero', () => {
    const home = homeSections(many);
    const hero = new Set(home.hero.map((i) => i.url));
    expect(home.trending).toHaveLength(5);
    expect(home.trending.some((i) => hero.has(i.url))).toBe(false);
  });
});
