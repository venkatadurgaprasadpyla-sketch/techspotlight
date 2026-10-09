/**
 * Read content through these helpers, never `getCollection()` directly, so drafts and (when
 * PUBLIC_HIDE_SAMPLES=true) sample entries never reach a production page.
 */
import { getCollection, getEntry, type CollectionEntry, type CollectionKey } from 'astro:content';
import { isPublished, type VisibilityFlags } from './visibility';

const options = {
  dev: import.meta.env.DEV,
  hideSamples: import.meta.env.PUBLIC_HIDE_SAMPLES === 'true',
};

export const isVisible = (entry: { data: object }) =>
  isPublished(entry.data as VisibilityFlags, options);

/** Every visible entry in a collection. */
export async function getPublished<C extends CollectionKey>(
  collection: C,
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection);
  return entries.filter(isVisible);
}

/** One visible entry, or undefined if it is missing, a draft or a hidden sample. */
export async function getPublishedEntry<C extends CollectionKey>(
  collection: C,
  id: string,
): Promise<CollectionEntry<C> | undefined> {
  const entry = (await getEntry(collection, id)) as CollectionEntry<C> | undefined;
  return entry && isVisible(entry) ? entry : undefined;
}

/** Newest first by updatedDate, falling back to publishDate. */
export const byNewest = (
  a: { data: { publishDate: Date; updatedDate?: Date | undefined } },
  b: { data: { publishDate: Date; updatedDate?: Date | undefined } },
) =>
  (b.data.updatedDate ?? b.data.publishDate).getTime() -
  (a.data.updatedDate ?? a.data.publishDate).getTime();
