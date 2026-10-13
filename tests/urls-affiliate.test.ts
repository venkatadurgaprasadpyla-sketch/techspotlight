import { describe, expect, it } from 'vitest';
import { site } from '~/config/site';
import {
  affiliateHref,
  headlineOffers,
  lowestOffer,
  offerRegions,
  priceButtonLabel,
} from '~/lib/affiliate';
import { formatAed, formatDate, formatDateTime, formatMonthYear, isoDate } from '~/lib/format';
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

  it('never quotes Amazon or non-rupee prices', () => {
    const offers = [
      { name: 'amazon-in', price: 100 },
      { name: 'noon', price: 50 },
      { name: 'flipkart', price: 300 },
    ];
    expect(lowestOffer(offers)).toEqual({ name: 'flipkart', price: 300 });
  });
});

describe('store buttons', () => {
  it("uses the owner's wording", () => {
    expect(priceButtonLabel('amazon-in')).toBe('Check price on Amazon');
    expect(priceButtonLabel('flipkart')).toBe('Check price on Flipkart');
    expect(priceButtonLabel('amazon-ae')).toBe('Check price on Amazon.ae');
  });
});

describe('offerRegions', () => {
  const o = (name: string) => ({ name });
  it('splits India and UAE stores when the UAE has its own links', () => {
    expect(offerRegions([o('amazon-in'), o('flipkart'), o('amazon-ae'), o('noon')])).toEqual([
      'in',
      'in',
      'ae',
      'ae',
    ]);
  });

  it('shows India stores to UAE visitors when there is no UAE link, except Flipkart', () => {
    expect(offerRegions([o('amazon-in'), o('flipkart'), o('croma')])).toEqual(['all', 'in', 'all']);
  });
});

describe('headlineOffers', () => {
  it('picks one button per region', () => {
    const india = { name: 'flipkart', price: 20000 };
    const uae = { name: 'amazon-ae' };
    expect(headlineOffers([{ name: 'amazon-in' }, india, uae])).toEqual([
      { offer: india, region: 'in' },
      { offer: uae, region: 'ae' },
    ]);
  });

  it('gives UAE visitors a non-Flipkart store when Flipkart is cheapest', () => {
    const flipkart = { name: 'flipkart', price: 18000 };
    const croma = { name: 'croma', price: 19000 };
    expect(headlineOffers([flipkart, croma])).toEqual([
      { offer: flipkart, region: 'in' },
      { offer: croma, region: 'ae' },
    ]);
  });

  it('uses one button for everyone when it suits both', () => {
    const croma = { name: 'croma', price: 19000 };
    expect(headlineOffers([{ name: 'flipkart', price: 20000 }, croma])).toEqual([{ offer: croma }]);
  });
});

describe('dates', () => {
  const d = new Date('2026-10-09');
  it('formats content dates in Indian English without shifting the day', () => {
    expect(formatDate(d)).toBe('9 Oct 2026');
    expect(formatMonthYear(d)).toBe('October 2026');
    expect(isoDate(d)).toBe('2026-10-09');
  });

  it('adds the IST time to dates that have one', () => {
    expect(formatDateTime(d)).toBe('9 Oct 2026');
    expect(formatDateTime(new Date('2026-10-07T10:30:00+05:30'))).toBe('7 Oct 2026, 10:30 am IST');
  });

  it('formats dirhams', () => {
    expect(formatAed(3299)).toBe('AED 3,299');
  });
});
