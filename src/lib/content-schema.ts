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

/** A number the scaffolder leaves as `TODO`; parses to 0 so drafts still build. */
const orTodo = <T extends z.ZodType<number>>(schema: T) =>
  z.union([schema, z.literal('TODO').transform(() => 0)]);

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
    price: orTodo(rupees).optional(),
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

/** Path of the first string inside `value` that still contains "TODO", if any. */
export function findTodo(
  value: unknown,
  path: (string | number)[] = [],
): (string | number)[] | undefined {
  if (typeof value === 'string') return value.includes('TODO') ? path : undefined;
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) {
      const found = findTodo(item, [...path, i]);
      if (found) return found;
    }
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [key, item] of Object.entries(value)) {
      const found = findTodo(item, [...path, key]);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * The scaffolder marks every field it can't fill with TODO (numbers included, see `orTodo`).
 * This runs on the raw frontmatter, so it sees placeholders before they are parsed, and refuses
 * any that remain. Articles may keep them while `draft: true`; authors and brands never can.
 */
export function guardTodos<T extends z.ZodType>(schema: T, { draftsMayHaveTodos = false } = {}) {
  return z.preprocess((raw, ctx) => {
    const isDraft = typeof raw === 'object' && raw !== null && 'draft' in raw && raw.draft === true;
    if (draftsMayHaveTodos && isDraft) return raw;
    const path = findTodo(raw);
    if (path) {
      ctx.addIssue({
        code: 'custom',
        path,
        input: raw,
        message: draftsMayHaveTodos
          ? 'Replace this TODO before publishing (keep draft: true until then)'
          : 'Replace this TODO (authors and brands have no draft mode)',
      });
    }
    return raw;
  }, schema);
}

/** Cross-field checks shared by every article schema. */
export function checkArticle(value: TopicFields, ctx: z.RefinementCtx) {
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
  return guardTodos(
    articleBase(helpers, 'review')
      .extend({
        product: z.object({
          name: nonEmpty,
          brand: reference('brands'),
          model: z.string().optional(),
          releaseDate: z.coerce.date().optional(),
          msrp: orTodo(rupees),
          currency: z.literal('INR').default('INR'),
        }),
        rating: orTodo(rating),
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
        /** "Buy it if" / "Don't buy it if" boxes in the final verdict. */
        buyIf: z.array(nonEmpty).default([]),
        dontBuyIf: z.array(nonEmpty).default([]),
        faq: z.array(z.object({ q: nonEmpty, a: nonEmpty })).default([]),
      })
      .superRefine((value, ctx) => {
        checkArticle(value, ctx);
        // The page highlights the reviewed product's row by name.
        value.benchmarks.forEach((bench, i) => {
          if (!value.draft && !bench.rows.some((r) => r.product === value.product.name)) {
            ctx.addIssue({
              code: 'custom',
              path: ['benchmarks', i, 'rows'],
              message: `One row's product must be exactly "${value.product.name}" (product.name)`,
            });
          }
        });
      }),
    { draftsMayHaveTodos: true },
  );
}

const productPick = <I extends z.ZodType>(helpers: SchemaHelpers<I>) =>
  z.object({
    reviewRef: helpers.reference('reviews').optional(),
    productName: nonEmpty,
    image: helpers.image(),
    imageAlt: nonEmpty,
    rating: orTodo(rating),
    price: orTodo(rupees),
    retailers: z.array(retailerLink).default([]),
  });

export function guideSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return guardTodos(
    articleBase(helpers, 'best')
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
              /** Short write-up: why it is on the list and how it did in testing. */
              summary: z.string().optional(),
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
      }),
    { draftsMayHaveTodos: true },
  );
}

export function versusSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  const side = z.enum(['a', 'b', 'tie']);
  return guardTodos(
    articleBase(helpers, 'versus')
      .extend({
        productA: productPick(helpers),
        productB: productPick(helpers),
        /** One sentence after the score, e.g. "Pick the Orbit if night photos matter most." */
        shortAnswer: z.string().optional(),
        /** Side-by-side specs; `better` shades the winning cell. */
        specs: z
          .array(z.object({ label: nonEmpty, a: nonEmpty, b: nonEmpty, better: side.optional() }))
          .default([]),
        rounds: z.array(z.object({ name: nonEmpty, winner: side, summary: nonEmpty })).min(3),
        overallWinner: side,
        verdict: nonEmpty,
      })
      .superRefine((value, ctx) => {
        checkArticle(value, ctx);
        if (value.productA.productName === value.productB.productName) {
          ctx.addIssue({
            code: 'custom',
            path: ['productB', 'productName'],
            message: 'The two products need different names',
          });
        }
      }),
    { draftsMayHaveTodos: true },
  );
}

export function howtoSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return guardTodos(
    articleBase(helpers, 'how-to')
      .extend({
        difficulty: z.enum(['easy', 'medium', 'hard']),
        timeRequired: nonEmpty,
        /** e.g. "Windows 10 and 11" or "Android 12 and later". */
        worksOn: z.string().optional(),
        /** The whole answer in one or two sentences, shown above the steps. */
        quickAnswer: z.string().optional(),
        tools: z.array(nonEmpty).default([]),
        steps: z
          .array(
            z.object({
              title: nonEmpty,
              body: nonEmpty,
              image: helpers.image().optional(),
              imageAlt: z.string().optional(),
              tip: z.string().optional(),
            }),
          )
          .min(1),
        /** "If it doesn't work": a problem and its fix. */
        troubleshooting: z.array(z.object({ q: nonEmpty, a: nonEmpty })).default([]),
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
      }),
    { draftsMayHaveTodos: true },
  );
}

export function newsSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return guardTodos(
    articleBase(helpers, 'news')
      .extend({
        source: z.object({ name: nonEmpty, url: z.url({ protocol: /^https$/ }) }).optional(),
        /** Credit for a press image, e.g. "Image: Kestrel". */
        heroCredit: z.string().optional(),
        /** "Key facts" box: India price, on-sale date, launch offers … */
        keyFacts: z.array(spec).default([]),
        relatedReviews: z.array(helpers.reference('reviews')).default([]),
      })
      .superRefine(checkArticle),
    { draftsMayHaveTodos: true },
  );
}

export function dealSchema<I extends z.ZodType>(helpers: SchemaHelpers<I>) {
  return guardTodos(
    articleBase(helpers, 'deal')
      .extend({
        product: nonEmpty,
        originalPrice: orTodo(rupees),
        dealPrice: orTodo(rupees),
        retailer: z.enum(retailerIds),
        url: z.url({ protocol: /^https$/ }),
        /** Last day of the deal (a date, e.g. 2026-12-31); it runs to midnight IST. */
        expiresAt: z.coerce
          .date()
          .refine(
            (d) => d.getTime() % 86_400_000 === 0,
            'Use a date such as 2026-12-31; for a time of day add expiresTime: "18:00" (IST)',
          )
          .optional(),
        /** Ends at this time (24-hour, IST) on expiresAt instead of at midnight. */
        expiresTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour IST time such as "18:00"')
          .optional(),
        couponCode: z
          .string()
          .regex(/^[A-Z0-9-]{3,30}$/, 'Coupon codes use capital letters, digits and hyphens')
          .optional(),
        badge: z.enum(['lowest-price', 'great-value', 'editors-pick']).optional(),
        /** Our review of the product, for its rating and a link. */
        reviewRef: helpers.reference('reviews').optional(),
      })
      .superRefine((value, ctx) => {
        checkArticle(value, ctx);
        if (!value.draft && value.dealPrice >= value.originalPrice) {
          ctx.addIssue({
            code: 'custom',
            path: ['dealPrice'],
            message: 'dealPrice must be lower than originalPrice',
          });
        }
        checkRetailerHost(value.retailer, value.url, ctx);
        if (value.expiresTime && !value.expiresAt) {
          ctx.addIssue({
            code: 'custom',
            path: ['expiresTime'],
            message: 'expiresTime needs expiresAt (the date it applies to)',
          });
        }
      }),
    { draftsMayHaveTodos: true },
  );
}

export function authorSchema<I extends z.ZodType>({ image }: Pick<SchemaHelpers<I>, 'image'>) {
  return guardTodos(
    z.object({
      name: nonEmpty,
      role: nonEmpty,
      bio: nonEmpty,
      avatar: image().optional(),
      expertise: z.array(nonEmpty).default([]),
      social: z
        .array(z.object({ label: nonEmpty, href: z.url({ protocol: /^https$/ }) }))
        .default([]),
      /** Year they started writing about tech, for the author page. */
      since: z.number().int().min(1980).max(2100).optional(),
      location: nonEmpty.optional(),
      /** Test kit they use, one item per line on the author page. */
      kit: z.array(nonEmpty).default([]),
      sample: z.boolean().default(false),
    }),
  );
}

export function brandSchema<I extends z.ZodType>({ image }: Pick<SchemaHelpers<I>, 'image'>) {
  return guardTodos(
    z.object({
      name: nonEmpty,
      description: nonEmpty,
      logo: image().optional(),
      website: z.url({ protocol: /^https$/ }).optional(),
      /** Support and warranty in India: a short factual paragraph for the brand page. */
      support: nonEmpty.optional(),
      sample: z.boolean().default(false),
    }),
  );
}

/** Leaf topic exists? Exposed for the scaffolder. */
export const isKnownTopic = (leaf: string) => findTopic(leaf) !== undefined;
