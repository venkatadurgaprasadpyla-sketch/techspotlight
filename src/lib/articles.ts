/** Every published article as a `CardItem`, loaded once per build. */
import { byDate, toCardItem, type CardItem } from './cards';
import { getPublished } from './content';
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
    return lists
      .flat()
      .map((entry) => toCardItem(entry, authors))
      .sort(byDate);
  })();
  return cache;
}
