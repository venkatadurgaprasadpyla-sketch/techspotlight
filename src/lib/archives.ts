/**
 * Archive pages: every article by brand, author, tag or month of publication. Pure, so the page
 * set and each page's articles are unit tested. Routes live in src/pages/{brands,authors,tags,archive}.
 */
import { findTopic } from '~/config/taxonomy';
import { byDate, byRating, type CardItem } from './cards';
import type { Crumb } from './listings';

const home: Crumb = { label: 'Home', href: '/' };

export const brandPath = (id: string) => `/brands/${id}/`;
export const authorPath = (id: string) => `/authors/${id}/`;
export const tagPath = (tag: string) => `/tags/${tag}/`;
export const monthPath = (year: number, month: number) =>
  `/archive/${year}/${String(month).padStart(2, '0')}/`;

/** "thin-and-light" -> "Thin and light". */
export const tagLabel = (tag: string) => {
  const words = tag.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' });
/** "October 2026" for month 10 of 2026. */
export const monthLabel = (year: number, month: number) =>
  `${monthName.format(new Date(Date.UTC(year, month - 1, 1)))} ${year}`;

export const itemsByBrand = (items: readonly CardItem[], brand: string) =>
  items.filter((i) => i.brands.includes(brand));

export const itemsByAuthor = (items: readonly CardItem[], author: string) =>
  items.filter((i) => i.author === author);

export interface TagListing {
  tag: string;
  label: string;
  path: string;
  crumbs: Crumb[];
  items: CardItem[];
}

/** One listing per tag in use, A to Z; each lists its articles newest first. */
export function tagListings(items: readonly CardItem[]): TagListing[] {
  const tags = [...new Set(items.flatMap((i) => i.tags))].sort();
  return tags.map((tag) => {
    const path = tagPath(tag);
    const label = tagLabel(tag);
    return {
      tag,
      label,
      path,
      crumbs: [home, { label: 'Tags', href: '/tags/' }, { label, href: path }],
      items: items.filter((i) => i.tags.includes(tag)).sort(byDate),
    };
  });
}

export interface MonthListing {
  year: number;
  month: number;
  label: string;
  path: string;
  crumbs: Crumb[];
  items: CardItem[];
}

/**
 * One listing per month that has articles, newest month first. Articles are filed by publish
 * date (an update does not move a story into a later month) and listed newest first.
 */
export function monthListings(items: readonly CardItem[]): MonthListing[] {
  const months = new Map<string, CardItem[]>();
  for (const item of items) {
    const key = item.publishDate.toISOString().slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), item]);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => {
      const [year = 0, month = 0] = key.split('-').map(Number);
      const label = monthLabel(year, month);
      const path = monthPath(year, month);
      return {
        year,
        month,
        label,
        path,
        crumbs: [home, { label: 'Archive', href: '/archive/' }, { label, href: path }],
        items: [...list].sort(
          (a, b) => b.publishDate.getTime() - a.publishDate.getTime() || byDate(a, b),
        ),
      };
    });
}

export interface BrandSummary {
  /** Reviews of the brand's products, highest rated first. */
  reviews: CardItem[];
  /** Mean review rating to one decimal, when there are rated reviews. */
  averageRating?: number;
  /** Category labels the brand's articles are filed under, most used first. */
  categories: string[];
}

export function brandSummary(items: readonly CardItem[]): BrandSummary {
  const reviews = items.filter((i) => i.collection === 'reviews').sort(byRating);
  const ratings = reviews.flatMap((r) => (r.rating === undefined ? [] : [r.rating]));
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = findTopic(item.leaf)?.category.label;
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const categories = [...counts.entries()]
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([label]) => label);
  return {
    reviews,
    ...(ratings.length > 0 && {
      averageRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
    }),
    categories,
  };
}

/** The verdict column on a brand page for a review without a badge: a plain call from its rating. */
export function verdictLabel(rating: number | undefined): string {
  if (rating === undefined) return 'See the review';
  if (rating >= 4) return 'Recommended';
  if (rating >= 3) return 'Worth a look';
  return 'Skip it';
}

/**
 * Brands that share the most hubs with `brand` among the given articles (most overlap first,
 * then A to Z), for "Similar brands".
 */
export function similarBrands(
  items: readonly CardItem[],
  brand: string,
  known: readonly string[],
  limit = 4,
): string[] {
  const hubsOf = (id: string) => new Set(itemsByBrand(items, id).map((i) => i.hub));
  const mine = hubsOf(brand);
  return known
    .filter((id) => id !== brand)
    .map((id) => ({ id, shared: [...hubsOf(id)].filter((h) => mine.has(h)).length }))
    .filter((b) => b.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((b) => b.id);
}
