import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  authorSchema,
  brandSchema,
  dealSchema,
  guideSchema,
  howtoSchema,
  newsSchema,
  rating,
  reviewSchema,
  versusSchema,
} from '~/lib/content-schema';
import { helpers, issues, readData } from './helpers/content';

const schemas = {
  reviews: reviewSchema(helpers),
  guides: guideSchema(helpers),
  versus: versusSchema(helpers),
  howtos: howtoSchema(helpers),
  news: newsSchema(helpers),
  deals: dealSchema(helpers),
  authors: authorSchema(helpers),
  brands: brandSchema(helpers),
};

const sample = (folder: keyof typeof schemas, file: string) =>
  readData(join('src/content', folder, file));

describe('sample content', () => {
  for (const [folder, schema] of Object.entries(schemas)) {
    const files = readdirSync(join('src/content', folder));
    it(`${folder} has 2 or 3 entries that all validate and are marked sample`, () => {
      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.length).toBeLessThanOrEqual(3);
      for (const file of files) {
        const result = schema.safeParse(readData(join('src/content', folder, file)));
        expect(issues(result), `${folder}/${file}`).toEqual([]);
        expect((result.data as { sample: boolean }).sample, `${folder}/${file}`).toBe(true);
      }
    });
  }

  it('only covers the Computing and Phones hubs', () => {
    for (const folder of ['reviews', 'guides', 'versus', 'howtos', 'news', 'deals'] as const) {
      for (const file of readdirSync(join('src/content', folder))) {
        expect(['computing', 'phones']).toContain(sample(folder, file).hub);
      }
    }
  });
});

describe('review schema', () => {
  const base = sample('reviews', 'northwind-aero-14.md');
  const parse = (patch: Record<string, unknown>) =>
    issues(schemas.reviews.safeParse({ ...base, ...patch }));

  it('accepts the sample and defaults type to review', () => {
    expect(schemas.reviews.parse(base).type).toBe('review');
  });

  it('requires heroAlt', () => {
    expect(parse({ heroAlt: undefined }).join()).toMatch(/heroAlt/);
  });

  it('caps the meta description at 160 characters', () => {
    expect(parse({ description: 'x'.repeat(160) })).toEqual([]);
    expect(parse({ description: 'x'.repeat(161) }).join()).toMatch(/160 characters/);
  });

  it('checks hub, category and subcategory against the taxonomy', () => {
    expect(parse({ hub: 'cameras' }).join()).toMatch(/Unknown hub/);
    expect(parse({ category: 'android-phones' }).join()).toMatch(/not a category of Computing/);
    expect(parse({ subcategory: 'chromebook' }).join()).toMatch(/Pick one of Laptops/);
    expect(parse({ subcategory: undefined }).join()).toMatch(/Pick one of Laptops/);
    expect(
      parse({ hub: 'phones', category: 'android-phones', subcategory: 'flagships' }).join(),
    ).toMatch(/has no subcategories/);
    expect(parse({ hub: 'phones', category: 'iphones', subcategory: undefined })).toEqual([]);
  });

  it('rejects an updatedDate before the publishDate', () => {
    expect(parse({ updatedDate: '2026-01-01' }).join()).toMatch(/updatedDate/);
  });

  it('keeps pros and cons between 3 and 6 items', () => {
    expect(parse({ pros: ['a', 'b'] }).join()).toMatch(/pros/);
    expect(parse({ cons: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }).join()).toMatch(/cons/);
  });

  it('only allows retailer links on that retailer, over https', () => {
    const link = { name: 'amazon-in', lastChecked: '2026-10-01' };
    expect(parse({ retailers: [{ ...link, url: 'https://amzn.to/abc' }] })).toEqual([]);
    expect(parse({ retailers: [{ ...link, url: 'https://www.flipkart.com/x' }] }).join()).toMatch(
      /Amazon.in links must use/,
    );
    expect(parse({ retailers: [{ ...link, url: 'http://www.amazon.in/x' }] }).join()).toMatch(
      /retailers/,
    );
    expect(
      parse({ retailers: [{ ...link, name: 'croma', url: 'https://www.croma.com/x' }] }).join(),
    ).toMatch(/retailers/);
  });

  it('refuses TODO placeholders unless the entry is a draft', () => {
    expect(parse({ verdict: 'TODO: write me' }).join()).toMatch(/Replace this TODO/);
    expect(parse({ verdict: 'TODO: write me', draft: true })).toEqual([]);
  });

  it('names the field that still holds a TODO, numbers included', () => {
    const result = schemas.reviews.safeParse({ ...base, rating: 'TODO' });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain('rating');
    expect(schemas.reviews.parse({ ...base, rating: 'TODO', draft: true }).rating).toBe(0);
    const retailers = [
      {
        name: 'flipkart',
        url: 'https://www.flipkart.com/x',
        price: 'TODO',
        lastChecked: '2026-10-01',
      },
    ];
    expect(issues(schemas.reviews.safeParse({ ...base, retailers })).join()).toMatch(
      /retailers\.0\.price: Replace this TODO/,
    );
  });

  it('validates the YouTube id', () => {
    expect(parse({ youtubeId: 'dQw4w9WgXcQ' })).toEqual([]);
    expect(parse({ youtubeId: 'https://youtu.be/x' }).join()).toMatch(/YouTube/);
  });
});

describe('rating', () => {
  it.each([0, 0.5, 3, 4.5, 5])('accepts %s', (n) => {
    expect(rating.safeParse(n).success).toBe(true);
  });
  it.each([-0.5, 4.3, 5.5])('rejects %s', (n) => {
    expect(rating.safeParse(n).success).toBe(false);
  });
});

describe('guide schema', () => {
  const base = sample('guides', 'best-ultrabooks.md');
  it('requires picks in rank order', () => {
    const picks = base.picks as Record<string, unknown>[];
    const swapped = [
      { ...picks[0], rank: 2 },
      { ...picks[1], rank: 1 },
    ];
    expect(issues(schemas.guides.safeParse({ ...base, picks: swapped })).join()).toMatch(
      /rank order/,
    );
  });
});

describe('versus schema', () => {
  it('needs at least three rounds and a valid winner', () => {
    const base = sample('versus', 'kestrel-nova-5g-vs-orbit-x2.md');
    const rounds = (base.rounds as unknown[]).slice(0, 2);
    expect(issues(schemas.versus.safeParse({ ...base, rounds })).join()).toMatch(/rounds/);
    expect(issues(schemas.versus.safeParse({ ...base, overallWinner: 'c' })).join()).toMatch(
      /overallWinner/,
    );
  });
});

describe('howto schema', () => {
  it('needs alt text for step images', () => {
    const base = sample('howtos', 'check-laptop-battery-health-windows.md');
    const steps = [{ title: 'Step', body: 'Body', image: 'x.jpg' }];
    expect(issues(schemas.howtos.safeParse({ ...base, steps })).join()).toMatch(/alt text/);
  });
});

describe('deal schema', () => {
  const base = sample('deals', 'northwind-aero-14-deal.md');
  it('needs a deal price below the original price', () => {
    expect(issues(schemas.deals.safeParse({ ...base, dealPrice: 74990 })).join()).toMatch(
      /lower than originalPrice/,
    );
  });
  it('checks the link belongs to the retailer', () => {
    expect(
      issues(schemas.deals.safeParse({ ...base, url: 'https://evil.example/amazon.in' })).join(),
    ).toMatch(/Amazon.in links must use/);
  });
});

describe('news schema', () => {
  it('defaults type to news and requires an https source', () => {
    const base = sample('news', 'kestrel-update-android.md');
    expect(schemas.news.parse(base).type).toBe('news');
    const source = { name: 'Example', url: 'javascript:alert(1)' };
    expect(issues(schemas.news.safeParse({ ...base, source })).join()).toMatch(/source/);
  });
});

describe('authors and brands', () => {
  it('reject TODO placeholders and non-https social links', () => {
    const author = sample('authors', 'asha-testwell.yaml');
    expect(issues(schemas.authors.safeParse({ ...author, bio: 'TODO' })).join()).toMatch(/TODO/);
    const social = [{ label: 'X', href: 'javascript:alert(1)' }];
    expect(issues(schemas.authors.safeParse({ ...author, social })).join()).toMatch(/social/);
    const brand = sample('brands', 'northwind.yaml');
    expect(issues(schemas.brands.safeParse({ ...brand, name: 'TODO' })).join()).toMatch(/TODO/);
  });
});
