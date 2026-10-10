/**
 * schema.org JSON-LD for each page type. Pure: pages pass plain values (absolute image URLs
 * included), BaseHead prints the result. Unit tested, and G12 checks every built page.
 */
import { site } from '~/config/site';

export type JsonLd = Record<string, unknown>;

/** Absolute URL on the site for a path like `/reviews/`. */
export const absolute = (path: string) => new URL(path, site.url).href;

const ORG_ID = absolute('/#organization');
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

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

/** WebSite with a SearchAction pointing at /search/?q=. */
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
    datePublished: isoDate(input.publishDate),
    dateModified: isoDate(input.updatedDate ?? input.publishDate),
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
  /** Last day the price holds (deals). */
  validUntil?: Date | undefined;
}

const offer = (o: OfferInput) => ({
  '@type': 'Offer',
  price: o.price,
  priceCurrency: site.currency,
  url: o.url,
  availability: 'https://schema.org/InStock',
  seller: { '@type': 'Organization', name: o.seller },
  ...(o.validUntil && { priceValidUntil: isoDate(o.validUntil) }),
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

/** The ranked picks of a buying guide. */
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
  description: string;
  image: string;
  offer: OfferInput;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.image,
    offers: offer(input.offer),
  };
}
