import { readFileSync } from 'node:fs';
import { z } from 'astro/zod';
import { parse } from 'yaml';
import type { SchemaHelpers } from '~/lib/content-schema';

/** Stand-ins for Astro's `image()` and `reference()`: paths and ids stay plain strings. */
export const helpers: SchemaHelpers<z.ZodString> = {
  image: () => z.string().min(1),
  reference: (collection) => z.string().transform((id) => ({ collection, id })),
};

/** Frontmatter of a Markdown file, or the whole of a YAML file. */
export function readData(file: string): Record<string, unknown> {
  const text = readFileSync(file, 'utf8');
  if (file.endsWith('.yaml')) return parse(text) as Record<string, unknown>;
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match?.[1]) throw new Error(`${file} has no frontmatter`);
  return parse(match[1]) as Record<string, unknown>;
}

/** Messages of a failed parse, for readable assertions. */
export function issues(result: { success: boolean; error?: z.ZodError }) {
  return result.error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];
}
