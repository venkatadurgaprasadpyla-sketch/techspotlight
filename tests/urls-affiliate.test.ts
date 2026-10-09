import { describe, expect, it } from 'vitest';
import { site } from '~/config/site';
import { affiliateHref, lowestOffer } from '~/lib/affiliate';
import { formatDate, formatMonthYear, isoDate } from '~/lib/format';
import { articlePath } from '~/lib/urls';

describe('articlePath', () => {
  it('matches the URL map in the build prompt', () => {
    expect(articlePath('reviews', 'northwind-aero-14', 'ultrabooks')).toBe(
      '/ultrabooks/northwind-aero-14-review/',
    );
    expect(articlePath('guides', 'best-ultrabooks', 'ultrabooks')).toBe('/best/best-ultrabooks/');
    expect(articlePath('versus', 'a-vs-b', 'x')).toBe('/vs/a-vs-b/');
    expect(articlePath('howtos', 'fix-it', 'x')).toBe('/how-to/fix-it/');
    expect(articlePath('news', 'launch', 'x')).toBe('/news/launch/');
    expect(articlePath('deals', 'cut', 'x')).toBe('/deals/cut/');
  });
});

describe('affiliateHref', () => {
  it('leaves links alone until an affiliate tag is configured', () => {
    expect(affiliateHref('amazon-in', 'https://www.amazon.in/dp/X')).toBe(
      'https://www.amazon.in/dp/X',
    );
  });

  it('adds the configured tag, replacing any existing one', () => {
    const amazon = site.retailers[0];
    const param = amazon.affiliateParam as { name: string; value: string };
    const original = param.value;
    param.value = 'techspot-21';
    try {
      expect(affiliateHref('amazon-in', 'https://www.amazon.in/dp/X?tag=other&th=1')).toBe(
        'https://www.amazon.in/dp/X?tag=techspot-21&th=1',
      );
    } finally {
      param.value = original;
    }
  });
});

describe('lowestOffer', () => {
  it('ignores offers without a price', () => {
    expect(lowestOffer([{ price: 500 }, {}, { price: 300 }, { price: 0 }])).toEqual({ price: 300 });
    expect(lowestOffer([{}])).toBeUndefined();
  });
});

describe('dates', () => {
  const d = new Date('2026-10-09');
  it('formats content dates in Indian English without shifting the day', () => {
    expect(formatDate(d)).toBe('9 Oct 2026');
    expect(formatMonthYear(d)).toBe('October 2026');
    expect(isoDate(d)).toBe('2026-10-09');
  });
});
