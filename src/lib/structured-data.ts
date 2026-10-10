/**
 * schema.org JSON-LD for each page type. Pure: pages pass plain values (absolute image URLs
 * included), BaseHead prints the result. Unit tested, and G12 checks every built page.
 */
import { site } from '~/config/site';

export type JsonLd = Record<string, unknown>;

/** Absolute URL on the site for a path like `/reviews/`. */
export const absolute = (path: string) => new URL(path, site.url).href;

const ORG_ID = absolute('/#organization');
/** The calendar day an instant falls on in India, e.g. "2026-10-31". */
const istDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
export const istDate = (date: Date) => istDay.format(date);

export interface Byline {
  name: string;
  url: string;
}

export function organization(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.name,
    url: absolute('/'),
    logo: { '@type': 'ImageObject', url: absolute('/logo.png'), width: 512, height: 512 },
    ...(site.social.length > 0 && { sameAs: site.social.map((s) => s.href) }),
  };
}

/**
 * WebSite with a SearchAction pointing at /search/?q=. Google no longer shows the sitelinks
 * search box, but the action still describes the site search to other consumers.
 */
export function website(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: absolute('/'),
    inLanguage: site.locale,
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absolute('/search/')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

interface ArticleInput {
  url: string;
  title: string;
  description: string;
  /** Absolute image URLs. */
  images: string[];
  author?: Byline | undefined;
  publishDate: Date;
  updatedDate?: Date | undefined;
}

const person = (author: Byline) => ({ '@type': 'Person', name: author.name, url: author.url });

function articleFields(input: ArticleInput) {
  return {
    headline: input.title,
    description: input.description,
    image: input.images,
    datePublished: input.publishDate.toISOString(),
    dateModified: (input.updatedDate ?? input.publishDate).toISOString(),
    ...(input.author && { author: person(input.author) }),
    publisher: { '@id': ORG_ID, '@type': 'Organization', name: site.name },
    mainEntityOfPage: absolute(input.url),
    inLanguage: site.locale,
  };
}

/** Article for face-offs, how-tos and buying guides; NewsArticle for news. */
export function article(input: ArticleInput, type: 'Article' | 'NewsArticle' = 'Article'): JsonLd {
  return { '@context': 'https://schema.org', '@type': type, ...articleFields(input) };
}

export interface OfferInput {
  price: number;
  url: string;
  seller: string;
  /** When the price ends (deals): the instant from `dealEndsAt()`. */
  validUntil?: Date | undefined;
  /** Stock we know about; review prices leave it out (we only know the last checked price). */
  availability?: 'InStock' | 'SoldOut' | undefined;
}

const offer = (o: OfferInput) => ({
  '@type': 'Offer',
  price: o.price,
  priceCurrency: site.currency,
  url: o.url,
  seller: { '@type': 'Organization', name: o.seller },
  ...(o.availability && { availability: `https://schema.org/${o.availability}` }),
  // The last day in India the price holds (a deal ending at midnight IST holds through that day).
  ...(o.validUntil && { priceValidUntil: istDate(new Date(o.validUntil.getTime() - 1)) }),
});

interface ReviewInput extends ArticleInput {
  product: { name: string; brand?: string | undefined; image: string };
  rating: number;
  verdict: string;
  offers: OfferInput[];
}

/** A Review whose itemReviewed is the Product, with our rating out of 5 and current prices. */
export function review(input: ReviewInput): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    ...articleFields(input),
    name: input.title,
    reviewBody: input.verdict,
    reviewRating: { '@type': 'Rating', ratingValue: input.rating, bestRating: 5, worstRating: 0 },
    itemReviewed: {
      '@type': 'Product',
      name: input.product.name,
      image: input.product.image,
      ...(input.product.brand && { brand: { '@type': 'Brand', name: input.product.brand } }),
      ...(input.offers.length > 0 && { offers: input.offers.map(offer) }),
    },
  };
}

/**
 * The ranked picks of a buying guide. Items must all be separate pages or all anchors on one
 * page (Google's list rules), so the guide page decides which.
 */
export function itemList(name: string, items: { name: string; url: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: absolute(item.url),
    })),
  };
}

export function faqPage(faq: { q: string; a: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/** A deal: the Product and the discounted Offer. */
export function dealProduct(input: {
  name: string;
  brand?: string | undefined;
  description: string;
  image: string;
  offer: OfferInput;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    ...(input.brand && { brand: { '@type': 'Brand', name: input.brand } }),
    description: input.description,
    image: input.image,
    offers: offer(input.offer),
  };
}
