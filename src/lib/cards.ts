/**
 * Turns content entries into the flat `CardItem` every card, listing and sidebar renders.
 * Pure (type-only imports), so listings can be unit tested without Astro.
 */
import type { CollectionEntry } from 'astro:content';
import { contentTypes, findTopic, type ContentType } from '~/config/taxonomy';
import { lowestOffer } from './affiliate';
import { leafSlug } from './content-schema';
import { dealEndsAt, type DealBadge } from './deals';
import { articlePath, type ArticleCollection } from './urls';

export type ArticleEntry = CollectionEntry<ArticleCollection>;
export type Badge = 'editors-choice' | 'recommended' | 'best-value';

export interface Offer {
  retailer: string;
  url: string;
  price: number;
}

export interface DealInfo {
  product: string;
  originalPrice: number;
  dealPrice: number;
  retailer: string;
  url: string;
  endsAt?: Date;
  couponCode?: string;
  badge?: DealBadge;
  /** From the linked review, when it is published (filled in by getArticles). */
  rating?: number;
  reviewUrl?: string;
  reviewId?: string;
}

export interface CardItem {
  collection: ArticleCollection;
  id: string;
  url: string;
  type: ContentType;
  title: string;
  description: string;
  image: ArticleEntry['data']['heroImage'];
  imageAlt: string;
  hub: string;
  category: string;
  subcategory?: string;
  /** Subcategory, or category when it has no subcategories. */
  leaf: string;
  leafLabel: string;
  brands: string[];
  tags: string[];
  author: string;
  authorName?: string;
  publishDate: Date;
  updatedDate?: Date;
  /** updatedDate ?? publishDate; listings sort on it. */
  date: Date;
  featured: boolean;
  sample: boolean;
  // Reviews only.
  productName?: string;
  rating?: number;
  badge?: Badge;
  verdict?: string;
  /** Up to four spec values, joined for the review-row card. */
  specLine?: string;
  offers?: Offer[];
  /** Cheapest priced offer (reviews and deals). */
  bestOffer?: Offer;
  // Deals only.
  deal?: DealInfo;
}

const typeFor: Record<ArticleCollection, ContentType['type']> = {
  reviews: 'review',
  guides: 'best',
  versus: 'versus',
  howtos: 'how-to',
  news: 'news',
  deals: 'deal',
};

/** Singular label shown on cards, e.g. "Face-off". */
export const typeLabel: Record<ContentType['type'], string> = {
  review: 'Review',
  best: 'Best picks',
  versus: 'Face-off',
  'how-to': 'How-to',
  news: 'News',
  deal: 'Deal',
};

export function contentTypeOf(collection: ArticleCollection): ContentType {
  const type = contentTypes.find((t) => t.type === typeFor[collection]);
  if (!type) throw new Error(`No content type for ${collection}`);
  return type;
}

export function toCardItem(entry: ArticleEntry, authors: ReadonlyMap<string, string>): CardItem {
  const { data } = entry;
  const leaf = leafSlug(data);
  const topic = findTopic(leaf);
  const item: CardItem = {
    collection: entry.collection,
    id: entry.id,
    url: articlePath(entry.collection, entry.id, leaf),
    type: contentTypeOf(entry.collection),
    title: data.title,
    description: data.description,
    image: data.heroImage,
    imageAlt: data.heroAlt,
    hub: data.hub,
    category: data.category,
    ...(data.subcategory && { subcategory: data.subcategory }),
    leaf,
    leafLabel: topic?.subcategory?.label ?? topic?.category.label ?? leaf,
    brands: data.brands.map((b) => b.id),
    tags: data.tags,
    author: data.author.id,
    ...(authors.has(data.author.id) && { authorName: authors.get(data.author.id) }),
    publishDate: data.publishDate,
    ...(data.updatedDate && { updatedDate: data.updatedDate }),
    date: data.updatedDate ?? data.publishDate,
    featured: data.featured,
    sample: data.sample,
  };
  if (entry.collection === 'reviews') {
    const review = entry.data as CollectionEntry<'reviews'>['data'];
    const offers = review.retailers.flatMap((r) =>
      r.price ? [{ retailer: r.name, url: r.url, price: r.price }] : [],
    );
    const best = lowestOffer(offers);
    Object.assign(item, {
      productName: review.product.name,
      rating: review.rating,
      ...(review.badge && { badge: review.badge }),
      verdict: review.verdict,
      specLine: review.specs
        .slice(0, 4)
        .map((s) => s.value)
        .join(' · '),
      offers,
      ...(best && { bestOffer: best }),
    });
    if (review.brands.length === 0) item.brands = [review.product.brand.id];
  } else if (entry.collection === 'deals') {
    const deal = entry.data as CollectionEntry<'deals'>['data'];
    const offer = { retailer: deal.retailer, url: deal.url, price: deal.dealPrice };
    const info: DealInfo = {
      product: deal.product,
      originalPrice: deal.originalPrice,
      dealPrice: deal.dealPrice,
      retailer: deal.retailer,
      url: deal.url,
      ...(deal.expiresAt && { endsAt: dealEndsAt(deal.expiresAt, deal.expiresTime) }),
      ...(deal.couponCode && { couponCode: deal.couponCode }),
      ...(deal.badge && { badge: deal.badge }),
      ...(deal.reviewRef && { reviewId: deal.reviewRef.id }),
    };
    Object.assign(item, { offers: [offer], bestOffer: offer, deal: info });
  }
  return item;
}

/** Gives each deal the rating and URL of its linked review, when that review is published. */
export function linkDealsToReviews(items: CardItem[]) {
  const reviews = new Map(
    items.filter((i) => i.collection === 'reviews').map((i) => [i.id, i] as const),
  );
  for (const item of items) {
    const review = item.deal?.reviewId ? reviews.get(item.deal.reviewId) : undefined;
    if (item.deal && review) {
      item.deal.reviewUrl = review.url;
      if (review.rating !== undefined) item.deal.rating = review.rating;
    }
  }
}

/** Newest first; ties broken by title so builds are stable. */
export const byDate = (a: CardItem, b: CardItem) =>
  b.date.getTime() - a.date.getTime() || a.title.localeCompare(b.title);

/** Highest rated first, then newest. */
export const byRating = (a: CardItem, b: CardItem) =>
  (b.rating ?? 0) - (a.rating ?? 0) || byDate(a, b);
