/** What the homepage shows where. Pure, unit tested. */
import type { CardItem } from './cards';
import { byDealOrder, dealStatus } from './deals';
import { liveHubs, trending } from './listings';

const TRENDING = 5;
const PER_HUB = 4;

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
  /** Buying guides with a budget in the title ("under ₹30,000"), for the chip row. */
  guideChips: CardItem[];
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
  const reviews = of('reviews', 3);
  const guides = of('guides', 4);
  const faceOffs = of('versus', 3);
  const howtos = of('howtos', 4);
  // Hub rows prefer stories no row above shows; they repeat one only when a hub runs short.
  const shown = new Set([...hero, ...reviews, ...guides, ...faceOffs, ...howtos].map((i) => i.url));
  const hubs = liveHubs()
    .map((hub) => {
      const inHub = stories.filter((i) => i.hub === hub.slug);
      const fresh = inHub.filter((i) => !shown.has(i.url));
      const items = [...fresh, ...inHub.filter((i) => shown.has(i.url))].slice(0, PER_HUB);
      return { hub, items };
    })
    .filter((row) => row.items.length > 0);
  // Trending leaves out the hero and tops up with the latest stories.
  const popular = trending(
    rest.filter((i) => i.collection !== 'deals'),
    TRENDING,
  );
  const popularUrls = new Set(popular.map((i) => i.url));
  const topUp = rest.filter((i) => i.collection !== 'deals' && !popularUrls.has(i.url));
  return {
    hero,
    reviews,
    guides,
    faceOffs,
    deals: liveDeals.slice(0, 4),
    howtos,
    hubs,
    trending: [...popular, ...topUp].slice(0, TRENDING),
    topDeal: liveDeals[0],
    guideChips: items
      .filter((i) => i.collection === 'guides' && /under ₹/i.test(i.title))
      .slice(0, 6),
  };
}
