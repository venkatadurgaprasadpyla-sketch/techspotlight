import { describe, expect, it } from 'vitest';
import { closestTo } from '~/lib/related';

const at = (url: string, hub: string, category: string) => ({ url, hub, category });

describe('closestTo', () => {
  const current = at('/me/', 'computing', 'laptops');
  const items = [
    at('/other-hub/', 'phones', 'android-phones'),
    at('/same-hub/', 'computing', 'software'),
    at('/me/', 'computing', 'laptops'),
    at('/same-category-1/', 'computing', 'laptops'),
    at('/same-category-2/', 'computing', 'laptops'),
  ];
  it('ranks same category, then same hub, then the rest, and leaves out the current page', () => {
    expect(closestTo(current, items, 10).map((i) => i.url)).toEqual([
      '/same-category-1/',
      '/same-category-2/',
      '/same-hub/',
      '/other-hub/',
    ]);
  });
  it('stops at the limit', () => {
    expect(closestTo(current, items, 1).map((i) => i.url)).toEqual(['/same-category-1/']);
  });
});
