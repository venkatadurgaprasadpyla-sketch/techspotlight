/**
 * Zod schemas for every content collection. They are built from factories that receive Astro's
 * `image()` and `reference()` helpers, so unit tests can run them with simple stand-ins.
 * src/content.config.ts wires them to real collections.
 */
import { z } from 'astro/zod';
import { site } from '~/config/site';
import { findTopic, getHub, type ContentType } from '~/config/taxonomy';

export type ReferencedCollection = 'authors' | 'brands' | 'reviews';

/** What `reference(collection)` parses to: the id of an entry in that collection. */
export type EntryRef<C extends ReferencedCollection> = { collection: C; id: string };

export interface SchemaHelpers<I extends z.ZodType = z.ZodType> {
  /** Astro's `image()` from the schema context (validates and imports a local image). */
  image: () => I;
  /** Astro's `reference(collection)`. */
  reference: <C extends ReferencedCollection>(collection: C) => z.ZodType<EntryRef<C>, string>;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slug = z.string().regex(SLUG, 'Use lowercase words joined by hyphens');

/** 0–5 in half steps: 3, 3.5, 4 … */
export const rating = z
  .number()
  .min(0)
  .max(5)
  .refine((n) => Number.isInteger(n * 2), 'Ratings go in half steps (e.g. 3.5, 4, 4.5)');

/** Whole rupees. */
export const rupees = z.number().int().nonnegative();

const nonEmpty = z.string().trim().min(1);
const sentenceList = (min: number, max: number) => z.array(nonEmpty).min(min).max(max);

export const retailerIds = site.retailers.map((r) => r.id) as [string, ...string[]];

/** Adds an issue when `url` is not on one of the retailer's known hosts. */
function checkRetailerHost(retailerId: string, url: string, ctx: z.RefinementCtx) {
  const retailer = site.retailers.find((r) => r.id === retailerId);
  const host = URL.canParse(url) ? new URL(url).hostname : '';
  if (retailer && !(retailer.hosts as readonly string[]).includes(host)) {
    ctx.addIssue({
      code: 'custom',
      path: ['url'],
      message: `${retailer.name} links must use ${retailer.hosts.join(' or ')}, got "${host}"`,
    });
  }
}

/** A retailer link. The URL must be https and on one of that retailer's known hosts. */
export const retailerLink = z
  .object({
    /** Retailer id from src/config/site.ts, e.g. `amazon-in`. */
    name: z.enum(retailerIds),
    url: z.url({ protocol: /^https$/ }),
    price: rupees.optional(),
    lastChecked: z.coerce.date(),
  })
  .superRefine((value, ctx) => {
    checkRetailerHost(value.name, value.url, ctx);
  });

export const spec = z.object({ label: nonEmpty, value: nonEmpty });
export const score = z.object({ label: nonEmpty, score: rating, note: z.string().optional() });

/**
 * Fields shared by every article. `hub`, `category` and `subcategory` must describe one leaf of
 * src/config/taxonomy.ts (`subcategory` is omitted when the category has none).
 */
export function articleBase<I extends z.ZodType, T extends ContentType['type']>(
  { image, reference }: SchemaHelpers<I>,
  type: T,
) {
  return z.object({
    /** Content type; fixed per collection, so it can be left out of frontmatter. */
    type: z.literal(type).default(type),
    title: nonEmpty.max(110),
    /** Optional URL slug; defaults to the file name. */
    slug: slug.optional(),
    description: nonEmpty.max(160, 'Meta descriptions must be 160 characters or fewer'),
    hub: slug,
    category: slug,
    subcategory: slug.optional(),
    tags: z.array(slug).default([]),
    brands: z.array(reference('brands')).default([]),
    author: reference('authors'),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: image(),
    heroAlt: nonEmpty.min(5, 'Describe the image for screen readers'),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    noindex: z.boolean().default(false),
    /** Placeholder content used to exercise templates; hidden when PUBLIC_HIDE_SAMPLES=true. */
    sample: z.boolean().default(false),
  });
}

type TopicFields = {
  draft: boolean;
  hub: string;
  category: string;
  subcategory?: string | undefined;
  publishDate: Date;
  updatedDate?: Date | undefined;
};

/** The scaffolder fills every field with TODO; anything still holding one can't be published. */
export function checkNoTodos(
  value: unknown,
  ctx: z.RefinementCtx,
  message = 'Replace every TODO in this file (authors and brands have no draft mode)',
) {
  if (JSON.stringify(value).includes('TODO')) ctx.addIssue({ code: 'custom', message });
}

/** Cross-field checks shared by every article schema. */
export function checkArticle(value: TopicFields, ctx: z.RefinementCtx) {
  if (!value.draft) {
    checkNoTodos(value, ctx, 'Replace every TODO before publishing (keep draft: true until then)');
  }
  const hub = getHub(value.hub);
  if (!hub) {
    ctx.addIssue({ code: 'custom', path: ['hub'], message: `Unknown hub "${value.hub}"` });
    return;
  }
  const category = hub.categories.find((c) => c.slug === value.category);
  if (!category) {
    ctx.addIssue({
      code: 'custom',
      path: ['category'],
      message: `"${value.category}" is not a category of ${hub.label}`,
    });
    return;
  }
  if (category.subcategories.length === 0) {
    if (value.subcategory) {
      ctx.addIssue({
        code: 'custom',
        path: ['subcategory'],
        message: `${category.label} has no subcategories; remove "subcategory"`,
      });
    }
  } else if (!category.subcategories.some((s) => s.slug === value.subcategory)) {
    ctx.addIssue({
      code: 'custom',
      path: ['subcategory'],
      message: `Pick one of ${category.label}'s subcategories: ${category.subcategories
        .map((s) => s.slug)
        .join(', ')}`,
    });
  }
  if (value.updatedDate && value.updatedDate < value.publishDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['updatedDate'],
      message: 'updatedDate cannot be before publishDate',
    });
  }
}

/** The leaf topic slug an article is filed under (used in review URLs). */
export const leafSlug = (value: { category: string; subcategory?: string | undefined }) =>
  value.subcategory ?? value.category;

export function reviewSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  const { image, reference } = helpers;
  return articleBase(helpers, 'review')
    .extend({
      product: z.object({
        name: nonEmpty,
        brand: reference('brands'),
        model: z.string().optional(),
        releaseDate: z.coerce.date().optional(),
        msrp: rupees,
        currency: z.literal('INR').default('INR'),
      }),
      rating,
      badge: z.enum(['editors-choice', 'recommended', 'best-value']).nullable().default(null),
      verdict: nonEmpty,
      pros: sentenceList(3, 6),
      cons: sentenceList(3, 6),
      cheatSheet: z.object({
        whatIsIt: nonEmpty,
        whoIsItFor: nonEmpty,
        price: nonEmpty,
        likes: nonEmpty,
        dislikes: nonEmpty,
      }),
      specs: z.array(spec).min(1),
      scores: z.array(score).default([]),
      benchmarks: z
        .array(
          z.object({
            title: nonEmpty,
            unit: z.string(),
            higherIsBetter: z.boolean(),
            rows: z.array(z.object({ product: nonEmpty, value: z.number() })).min(2),
          }),
        )
        .default([]),
      retailers: z.array(retailerLink).min(1),
      youtubeId: z
        .string()
        .regex(/^[\w-]{11}$/, 'Use the 11-character YouTube video id')
        .optional(),
      gallery: z
        .array(z.object({ src: image(), alt: nonEmpty, caption: z.string().optional() }))
        .default([]),
      testingNotes: z.string().optional(),
      faq: z.array(z.object({ q: nonEmpty, a: nonEmpty })).default([]),
    })
    .superRefine(checkArticle);
}

const productPick = <I extends z.ZodType>(helpers: SchemaHelpers<I>) =>
  z.object({
    reviewRef: helpers.reference('reviews').optional(),
    productName: nonEmpty,
    image: helpers.image(),
    imageAlt: nonEmpty,
    rating,
    price: rupees,
    retailers: z.array(retailerLink).default([]),
  });

export function guideSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return articleBase(helpers, 'best')
    .extend({
      picks: z
        .array(
          productPick(helpers).extend({
            rank: z.number().int().positive(),
            label: nonEmpty,
            tagline: nonEmpty,
            specs: z.array(spec).default([]),
            pros: sentenceList(1, 6),
            cons: sentenceList(1, 6),
            buyIf: z.array(nonEmpty).default([]),
            dontBuyIf: z.array(nonEmpty).default([]),
            scores: z.array(score).default([]),
            bestFor: z.string().optional(),
          }),
        )
        .min(1),
      alsoTested: z
        .array(
          z.object({
            productName: nonEmpty,
            rating,
            summary: nonEmpty,
            reviewRef: helpers.reference('reviews').optional(),
          }),
        )
        .default([]),
      faq: z.array(z.object({ q: nonEmpty, a: nonEmpty })).default([]),
    })
    .superRefine((value, ctx) => {
      checkArticle(value, ctx);
      value.picks.forEach((pick, i) => {
        if (pick.rank !== i + 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['picks', i, 'rank'],
            message: `Picks must be listed in rank order 1, 2, 3…; expected ${i + 1}`,
          });
        }
      });
    });
}

export function versusSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  const side = z.enum(['a', 'b', 'tie']);
  return articleBase(helpers, 'versus')
    .extend({
      productA: productPick(helpers),
      productB: productPick(helpers),
      rounds: z.array(z.object({ name: nonEmpty, winner: side, summary: nonEmpty })).min(3),
      overallWinner: side,
      verdict: nonEmpty,
    })
    .superRefine(checkArticle);
}

export function howtoSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return articleBase(helpers, 'how-to')
    .extend({
      difficulty: z.enum(['easy', 'medium', 'hard']),
      timeRequired: nonEmpty,
      tools: z.array(nonEmpty).default([]),
      steps: z
        .array(
          z.object({
            title: nonEmpty,
            body: nonEmpty,
            image: helpers.image().optional(),
            imageAlt: z.string().optional(),
          }),
        )
        .min(1),
    })
    .superRefine((value, ctx) => {
      checkArticle(value, ctx);
      value.steps.forEach((step, i) => {
        if (step.image && !step.imageAlt?.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['steps', i, 'imageAlt'],
            message: 'Step images need alt text',
          });
        }
      });
    });
}

export function newsSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return articleBase(helpers, 'news')
    .extend({
      source: z.object({ name: nonEmpty, url: z.url({ protocol: /^https$/ }) }).optional(),
      relatedReviews: z.array(helpers.reference('reviews')).default([]),
    })
    .superRefine(checkArticle);
}

export function dealSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return articleBase(helpers, 'deal')
    .extend({
      product: nonEmpty,
      originalPrice: rupees,
      dealPrice: rupees,
      retailer: z.enum(retailerIds),
      url: z.url({ protocol: /^https$/ }),
      expiresAt: z.coerce.date().optional(),
      couponCode: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      checkArticle(value, ctx);
      if (value.dealPrice >= value.originalPrice) {
        ctx.addIssue({
          code: 'custom',
          path: ['dealPrice'],
          message: 'dealPrice must be lower than originalPrice',
        });
      }
      checkRetailerHost(value.retailer, value.url, ctx);
    });
}

export function authorSchema<I extends z.ZodType>({ image }: Pick<SchemaHelpers<I>, 'image'>) {
  return z
    .object({
      name: nonEmpty,
      role: nonEmpty,
      bio: nonEmpty,
      avatar: image().optional(),
      expertise: z.array(nonEmpty).default([]),
      social: z
        .array(z.object({ label: nonEmpty, href: z.url({ protocol: /^https$/ }) }))
        .default([]),
      sample: z.boolean().default(false),
    })
    .superRefine((value, ctx) => checkNoTodos(value, ctx));
}

export function brandSchema<I extends z.ZodType>({ image }: Pick<SchemaHelpers<I>, 'image'>) {
  return z
    .object({
      name: nonEmpty,
      description: nonEmpty,
      logo: image().optional(),
      website: z.url({ protocol: /^https$/ }).optional(),
      sample: z.boolean().default(false),
    })
    .superRefine((value, ctx) => checkNoTodos(value, ctx));
}

/** Leaf topic exists? Exposed for the scaffolder. */
export const isKnownTopic = (leaf: string) => findTopic(leaf) !== undefined;
