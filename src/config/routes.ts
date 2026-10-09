/**
 * Routes that exist only as "coming soon" placeholders so navigation never links to a 404.
 * They are noindex and kept out of the sitemap. When a task ships the real page, remove its
 * path here; the Placeholder layout refuses to render a path that is not listed.
 */
import {
  categoryPath,
  contentTypePath,
  contentTypes,
  hubPath,
  hubs,
  subcategoryPath,
} from './taxonomy';

/** Static pages still waiting for their task (T8 search, T10 trust and policy pages). */
export const staticPlaceholders = [
  '/search/',
  '/about/',
  '/how-we-test/',
  '/affiliate-disclosure/',
  '/privacy/',
  '/contact/',
  '/brands/',
] as const;

export function placeholderPaths(): string[] {
  const paths = new Set<string>(staticPlaceholders);
  for (const type of contentTypes) paths.add(contentTypePath(type));
  for (const hub of hubs) {
    paths.add(hubPath(hub));
    for (const type of contentTypes) paths.add(contentTypePath(type, hub));
    for (const category of hub.categories) {
      paths.add(categoryPath(hub, category));
      for (const sub of category.subcategories) paths.add(subcategoryPath(hub, category, sub));
    }
    for (const brand of hub.topBrands) paths.add(`/brands/${brand.slug}/`);
  }
  return [...paths];
}
