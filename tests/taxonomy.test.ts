import { describe, expect, it } from 'vitest';
import {
  categoryPath,
  contentTypes,
  findTopic,
  hubs,
  leafTopics,
  slugify,
  subcategoryPath,
} from '../src/config/taxonomy';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dupes = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i);

describe('taxonomy', () => {
  it('uses valid, unique hub slugs that never clash with site-wide content types', () => {
    const slugs = hubs.map((h) => h.slug);
    expect(dupes(slugs)).toEqual([]);
    for (const slug of slugs) expect(slug).toMatch(SLUG);
    for (const type of contentTypes) expect(slugs).not.toContain(type.slug);
  });

  it('keeps category slugs unique per hub and distinct from content-type segments', () => {
    const typeSlugs = contentTypes.map((t) => t.slug);
    for (const hub of hubs) {
      const slugs = hub.categories.map((c) => c.slug);
      expect(dupes(slugs), hub.slug).toEqual([]);
      for (const slug of slugs) {
        expect(slug).toMatch(SLUG);
        expect(typeSlugs, `${hub.slug}/${slug}`).not.toContain(slug);
      }
    }
  });

  it('gives every leaf topic a site-wide unique slug (review URLs use it)', () => {
    const leaves = leafTopics().map((t) => (t.subcategory ?? t.category).slug);
    expect(dupes(leaves)).toEqual([]);
    for (const slug of leaves) expect(slug).toMatch(SLUG);
  });

  it('marks Computing and Phones as the MVP hubs', () => {
    expect(hubs.filter((h) => h.mvp).map((h) => h.slug)).toEqual(['computing', 'phones']);
  });

  it('finds subcategories and leaf categories with their parents', () => {
    const gaming = findTopic('gaming-laptops');
    if (!gaming?.subcategory) throw new Error('gaming-laptops not found');
    expect(gaming.hub.slug).toBe('computing');
    expect(gaming.category.slug).toBe('laptops');
    expect(subcategoryPath(gaming.hub, gaming.category, gaming.subcategory)).toBe(
      '/computing/laptops/gaming-laptops/',
    );

    const android = findTopic('android-phones');
    if (!android) throw new Error('android-phones not found');
    expect(android.subcategory).toBeUndefined();
    expect(categoryPath(android.hub, android.category)).toBe('/phones/android-phones/');

    expect(findTopic('laptops')).toBeUndefined(); // has subcategories, so not a leaf
    expect(findTopic('nope')).toBeUndefined();
  });
});

describe('slugify', () => {
  it('lowercases, strips accents and joins words with hyphens', () => {
    expect(slugify('Gaming Laptops')).toBe('gaming-laptops');
    expect(slugify('  Wearables & Home ')).toBe('wearables-and-home');
    expect(slugify('Café Wi-Fi 6E')).toBe('cafe-wi-fi-6e');
  });
});
