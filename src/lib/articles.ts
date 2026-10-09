/** Every published article as a `CardItem`, loaded once per build. */
import { byDate, linkDealsToReviews, toCardItem, type CardItem } from './cards';
import { getPublished } from './content';
import { dealStatus } from './deals';
import { articleCollections } from './urls';

let cache: Promise<CardItem[]> | undefined;

export function getArticles(): Promise<CardItem[]> {
  // The dev server must see content edits, so only builds reuse the first load.
  if (import.meta.env.DEV) cache = undefined;
  cache ??= (async () => {
    const authors = new Map(
      (await getPublished('authors')).map((a) => [a.id, a.data.name] as const),
    );
    const lists = await Promise.all(articleCollections.map((c) => getPublished(c)));
    const items = lists.flat().map((entry) => toCardItem(entry, authors));
    linkDealsToReviews(items);
    // Deals that ended over a week ago leave every list; their own page stays (noindex).
    const now = new Date();
    return items.filter((i) => dealStatus(i.deal?.endsAt, now) !== 'gone').sort(byDate);
  })();
  return cache;
}
