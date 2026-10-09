/**
 * Content collections. Schemas live in src/lib/content-schema.ts (unit tested); this file wires
 * them to folders under src/content/. See CONTENT-GUIDE.md for how to add an article.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import type { z } from 'astro/zod';
import {
  authorSchema,
  brandSchema,
  dealSchema,
  guideSchema,
  howtoSchema,
  newsSchema,
  reviewSchema,
  versusSchema,
  type EntryRef,
  type ReferencedCollection,
} from '~/lib/content-schema';

// Astro types `reference()` from generated collection types, which do not exist until the first
// sync; this narrows it to what the schema factories expect.
const ref = <C extends ReferencedCollection>(collection: C) =>
  reference(collection) as unknown as z.ZodType<EntryRef<C>, string>;

const articles = (folder: string) =>
  glob({ base: `./src/content/${folder}`, pattern: '**/*.{md,mdx}' });
const data = (folder: string) => glob({ base: `./src/content/${folder}`, pattern: '**/*.yaml' });

export const collections = {
  reviews: defineCollection({
    loader: articles('reviews'),
    schema: ({ image }) => reviewSchema({ image, reference: ref }),
  }),
  guides: defineCollection({
    loader: articles('guides'),
    schema: ({ image }) => guideSchema({ image, reference: ref }),
  }),
  versus: defineCollection({
    loader: articles('versus'),
    schema: ({ image }) => versusSchema({ image, reference: ref }),
  }),
  howtos: defineCollection({
    loader: articles('howtos'),
    schema: ({ image }) => howtoSchema({ image, reference: ref }),
  }),
  news: defineCollection({
    loader: articles('news'),
    schema: ({ image }) => newsSchema({ image, reference: ref }),
  }),
  deals: defineCollection({
    loader: articles('deals'),
    schema: ({ image }) => dealSchema({ image, reference: ref }),
  }),
  authors: defineCollection({
    loader: data('authors'),
    schema: ({ image }) => authorSchema({ image }),
  }),
  brands: defineCollection({
    loader: data('brands'),
    schema: ({ image }) => brandSchema({ image }),
  }),
};
