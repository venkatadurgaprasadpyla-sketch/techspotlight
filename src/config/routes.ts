/**
 * Routes that exist only as "coming soon" placeholders so navigation never links to a 404.
 * Hubs not yet launched (`mvp: false`) and their whole tree, and menu brands that have no
 * brand file yet. Every placeholder is noindex, which also keeps it out of the sitemap.
 * Live hubs and the content-type pages are real listings (src/lib/listings.ts).
 * When a task ships a real page, remove its entry here.
 */
import {
  categoryPath,
  contentTypePath,
  contentTypes,
  hubPath,
  hubs,
  subcategoryPath,
} from './taxonomy';

export type PlaceholderPage = {
  path: string;
  title: string;
  intro?: string;
};

function buildPlaceholders(): PlaceholderPage[] {
  const pages: PlaceholderPage[] = [];
  for (const hub of hubs.filter((h) => !h.mvp)) {
    pages.push({ path: hubPath(hub), title: hub.label, intro: hub.intro });
    for (const type of contentTypes) {
      pages.push({
        path: contentTypePath(type, hub),
        title: `${hub.label} ${type.label.toLowerCase()}`,
      });
    }
    for (const category of hub.categories) {
      pages.push({ path: categoryPath(hub, category), title: category.label });
      for (const sub of category.subcategories) {
        pages.push({ path: subcategoryPath(hub, category, sub), title: sub.label });
      }
    }
  }
  const brands = new Map(hubs.flatMap((hub) => hub.topBrands).map((b) => [b.slug, b.label]));
  // src/pages/brands/[...path].astro skips any of these that has a brand file.
  for (const [slug, label] of brands) pages.push({ path: `/brands/${slug}/`, title: label });
  return pages;
}

/** Paths served by the brands route, not by the [section] routes. */
export const isOutsideSections = (path: string) => path.startsWith('/brands/');

export const placeholderPages: readonly PlaceholderPage[] = buildPlaceholders();
export const placeholderPaths: ReadonlySet<string> = new Set(placeholderPages.map((p) => p.path));

/** Placeholders whose path has exactly `depth` segments under `prefix` (default: the root). */
export function placeholdersAt(depth: number, prefix = '/'): PlaceholderPage[] {
  return placeholderPages.filter((page) => {
    if (!page.path.startsWith(prefix)) return false;
    const segments = page.path.slice(prefix.length).split('/').filter(Boolean);
    return segments.length === depth;
  });
}

/** `getStaticPaths` entries for a dynamic route whose params are the path segments, in order. */
export function placeholderStaticPaths<K extends string>(
  paramNames: readonly K[],
  prefix = '/',
  skip: (path: string) => boolean = () => false,
) {
  return placeholdersAt(paramNames.length, prefix)
    .filter((page) => !skip(page.path))
    .map((page) => {
      const segments = page.path.slice(prefix.length).split('/').filter(Boolean);
      const params = Object.fromEntries(paramNames.map((name, i) => [name, segments[i]])) as Record<
        K,
        string
      >;
      return { params, props: page };
    });
}
