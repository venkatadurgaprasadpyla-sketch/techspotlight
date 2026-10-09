import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { folders, scaffold } from '../scripts/new-content.mjs';
import {
  authorSchema,
  brandSchema,
  dealSchema,
  guideSchema,
  howtoSchema,
  newsSchema,
  reviewSchema,
  versusSchema,
} from '~/lib/content-schema';
import { helpers, issues, readData } from './helpers/content';

const schemas = {
  review: reviewSchema(helpers),
  best: guideSchema(helpers),
  versus: versusSchema(helpers),
  howto: howtoSchema(helpers),
  news: newsSchema(helpers),
  deal: dealSchema(helpers),
  author: authorSchema(helpers),
  brand: brandSchema(helpers),
};

const contentDir = mkdtempSync(join(tmpdir(), 'ts-scaffold-'));
cpSync('src/content/authors', join(contentDir, 'authors'), { recursive: true });
cpSync('src/content/brands', join(contentDir, 'brands'), { recursive: true });
afterAll(() => rmSync(contentDir, { recursive: true, force: true }));

describe('npm run new', () => {
  for (const type of ['review', 'best', 'versus', 'howto', 'news', 'deal'] as const) {
    it(`writes a ${type} draft that validates and cannot be published until the TODOs go`, () => {
      const file = scaffold({ type, name: `Sample ${type} item`, contentDir, today: '2026-10-09' });
      expect(file).toBe(join(contentDir, folders[type], `sample-${type}-item.md`));
      const text = readFileSync(file, 'utf8');
      expect(text).toContain('TODO');
      const data = readData(file);
      expect(data.draft).toBe(true);
      expect(issues(schemas[type].safeParse(data))).toEqual([]);
      expect(issues(schemas[type].safeParse({ ...data, draft: false })).join()).toMatch(
        /Replace this TODO/,
      );
    });
  }

  it('fills hub, category and subcategory from --topic', () => {
    const file = scaffold({
      type: 'news',
      name: 'Topic check',
      contentDir,
      topic: { hub: 'phones', category: 'iphones' },
    });
    const data = readData(file);
    expect([data.hub, data.category, data.subcategory]).toEqual(['phones', 'iphones', undefined]);
    expect(issues(schemas.news.safeParse(data))).toEqual([]);
  });

  it.each(['author', 'brand'] as const)('writes a %s YAML file with TODOs', (type) => {
    const file = scaffold({ type, name: `New ${type}`, contentDir });
    expect(file.endsWith(`new-${type}.yaml`)).toBe(true);
    expect(issues(schemas[type].safeParse(readData(file))).join()).toMatch(/TODO/);
  });

  it('writes .mdx when asked', () => {
    expect(scaffold({ type: 'howto', name: 'Mdx one', contentDir, mdx: true })).toMatch(/\.mdx$/);
  });

  it('refuses unknown types, empty names and existing files', () => {
    expect(() => scaffold({ type: 'podcast', name: 'X', contentDir })).toThrow(/Unknown type/);
    expect(() => scaffold({ type: 'news', name: '  ', contentDir })).toThrow(/name/);
    scaffold({ type: 'deal', name: 'Twice', contentDir });
    expect(() => scaffold({ type: 'deal', name: 'Twice', contentDir })).toThrow(/already exists/);
  });
});
