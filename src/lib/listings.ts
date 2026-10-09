/**
 * Every listing page the site builds from content: MVP hubs, their categories and
 * subcategories, per-hub content-type pages and the site-wide content-type pages.
 * Pure, so the page set and each page's articles are unit tested.
 */
import {
  categoryPath,
  contentTypePath,
  contentTypes,
  hubPath,
  hubs,
  subcategoryPath,
  type Category,
  type ContentType,
  type Hub,
  type Subcategory,
} from '~/config/taxonomy';
import type { CardItem } from './cards';

export interface Crumb {
  label: string;
  href: string;
}

interface Base {
  path: string;
  title: string;
  crumbs: Crumb[];
  /** Newest first. */
  items: CardItem[];
}

export type Listing =
  | (Base & { kind: 'hub'; hub: Hub })
  | (Base & { kind: 'category'; hub: Hub; category: Category })
  | (Base & { kind: 'subcategory'; hub: Hub; category: Category; subcategory: Subcategory })
  | (Base & { kind: 'type'; type: ContentType; hub?: Hub });

const home: Crumb = { label: 'Home', href: '/' };

/** Hubs that get real pages; the others stay "coming soon" (src/config/routes.ts). */
export const liveHubs = () => hubs.filter((hub) => hub.mvp);

export function buildListings(items: readonly CardItem[]): Listing[] {
  const listings: Listing[] = [];
  for (const type of contentTypes) {
    const path = contentTypePath(type);
    listings.push({
      kind: 'type',
      type,
      path,
      title: type.label,
      crumbs: [home, { label: type.label, href: path }],
      items: items.filter((i) => i.type.type === type.type),
    });
  }
  for (const hub of liveHubs()) {
    const inHub = items.filter((i) => i.hub === hub.slug);
    const hubCrumb = { label: hub.label, href: hubPath(hub) };
    listings.push({
      kind: 'hub',
      hub,
      path: hubPath(hub),
      title: hub.label,
      crumbs: [home, hubCrumb],
      items: inHub,
    });
    for (const type of contentTypes) {
      const path = contentTypePath(type, hub);
      const title = `${hub.label} ${type.label.toLowerCase()}`;
      listings.push({
        kind: 'type',
        type,
        hub,
        path,
        title,
        crumbs: [home, hubCrumb, { label: type.label, href: path }],
        items: inHub.filter((i) => i.type.type === type.type),
      });
    }
    for (const category of hub.categories) {
      const inCategory = inHub.filter((i) => i.category === category.slug);
      const categoryCrumb = { label: category.label, href: categoryPath(hub, category) };
      listings.push({
        kind: 'category',
        hub,
        category,
        path: categoryPath(hub, category),
        title: category.label,
        crumbs: [home, hubCrumb, categoryCrumb],
        items: inCategory,
      });
      for (const subcategory of category.subcategories) {
        const path = subcategoryPath(hub, category, subcategory);
        listings.push({
          kind: 'subcategory',
          hub,
          category,
          subcategory,
          path,
          title: subcategory.label,
          crumbs: [home, hubCrumb, categoryCrumb, { label: subcategory.label, href: path }],
          items: inCategory.filter((i) => i.subcategory === subcategory.slug),
        });
      }
    }
  }
  return listings;
}

/** Featured articles first, then the highest-rated reviews: a stand-in until analytics exist. */
export function trending(items: readonly CardItem[], limit = 4): CardItem[] {
  const featured = items.filter((i) => i.featured);
  const rated = items
    .filter((i) => !i.featured && i.rating !== undefined)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return [...featured, ...rated].slice(0, limit);
}
