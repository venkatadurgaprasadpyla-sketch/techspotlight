/** What the homepage shows where. Pure, unit tested. */
import type { CardItem } from './cards';
import { byDealOrder, dealStatus } from './deals';
import { liveHubs, trending } from './listings';

export interface HomeSections {
  /** Lead story, then up to three secondary stories. */
  hero: CardItem[];
  reviews: CardItem[];
  guides: CardItem[];
  faceOffs: CardItem[];
  deals: CardItem[];
  howtos: CardItem[];
  hubs: { hub: ReturnType<typeof liveHubs>[number]; items: CardItem[] }[];
  trending: CardItem[];
  topDeal: CardItem | undefined;
}

/**
 * `items` must be newest first (as `getArticles()` returns them). The hero takes featured
 * articles (deals aside), newest first, topped up with the latest stories. The type rows leave
 * out what the hero already shows; hub rows show the latest four in each live hub.
 */
export function homeSections(items: readonly CardItem[], now = new Date()): HomeSections {
  const stories = items.filter((i) => i.collection !== 'deals');
  const hero = [...stories.filter((i) => i.featured), ...stories.filter((i) => !i.featured)].slice(
    0,
    4,
  );
  const inHero = new Set(hero.map((i) => i.url));
  const rest = items.filter((i) => !inHero.has(i.url));
  const of = (collection: CardItem['collection'], limit: number) =>
    rest.filter((i) => i.collection === collection).slice(0, limit);
  const liveDeals = items
    .filter((i) => i.deal && dealStatus(i.deal.endsAt, now) === 'live')
    .sort(byDealOrder(now));
  return {
    hero,
    reviews: of('reviews', 3),
    guides: of('guides', 4),
    faceOffs: of('versus', 3),
    deals: liveDeals.slice(0, 4),
    howtos: of('howtos', 4),
    hubs: liveHubs()
      .map((hub) => ({ hub, items: stories.filter((i) => i.hub === hub.slug).slice(0, 4) }))
      .filter((row) => row.items.length > 0),
    trending: trending(stories, 5),
    topDeal: liveDeals[0],
  };
}
