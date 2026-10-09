import { describe, expect, it } from 'vitest';
import { pageHref, pageWindow, paginate } from '~/lib/listing';

describe('paginate', () => {
  const items = Array.from({ length: 30 }, (_, i) => i);

  it('splits into pages of 12 with page 1 at the base path', () => {
    const pages = paginate(items, '/computing/');
    expect(pages.map((p) => p.items.length)).toEqual([12, 12, 6]);
    expect(pages.map((p) => p.href)).toEqual([
      '/computing/',
      '/computing/page/2/',
      '/computing/page/3/',
    ]);
    expect(pages[0]?.prev).toBeUndefined();
    expect(pages[0]?.next).toBe('/computing/page/2/');
    expect(pages[2]?.prev).toBe('/computing/page/2/');
    expect(pages[2]?.next).toBeUndefined();
    expect(pages[1]?.start).toBe(12);
  });

  it('still makes one page for an empty list', () => {
    const [only, ...rest] = paginate([], '/phones/');
    expect(rest).toEqual([]);
    expect(only).toMatchObject({ current: 1, total: 1, items: [], href: '/phones/' });
  });

  it('builds page links', () => {
    expect(pageHref('/reviews/', 1)).toBe('/reviews/');
    expect(pageHref('/reviews/', 4)).toBe('/reviews/page/4/');
  });
});

describe('pageWindow', () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [1, 9, [1, 2, 'gap', 9]],
    [5, 9, [1, 'gap', 4, 5, 6, 'gap', 9]],
    [3, 9, [1, 2, 3, 4, 'gap', 9]],
    [9, 9, [1, 'gap', 8, 9]],
  ])('page %i of %i', (current, total, expected) => {
    expect(pageWindow(current, total)).toEqual(expected);
  });
});
