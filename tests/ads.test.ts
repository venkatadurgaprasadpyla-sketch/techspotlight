import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { trustPages } from '~/config/trust';
import { adsClientConfig, adsEnabled, adsTxt, consentNeeded } from '~/lib/ads';

const units = {
  leaderboard: '1234567890',
  sidebar: '',
  'in-feed': 'not-a-number',
  skyscraper: '',
  'in-article': '987',
  'sticky-mobile': '',
};
const live = { publisherId: 'ca-pub-1234567890123456', units };
const off = { publisherId: '', units };

describe('ads config', () => {
  it('turns ads (and the consent banner) on only with a well-formed publisher id', () => {
    expect(adsEnabled(live)).toBe(true);
    expect(consentNeeded(live)).toBe(true);
    expect(adsEnabled(off)).toBe(false);
    expect(consentNeeded(off)).toBe(false);
    expect(adsEnabled({ publisherId: 'pub-1234567890123456', units })).toBe(false);
  });

  it('passes the island only placements with numeric unit ids', () => {
    expect(adsClientConfig(off)).toBeUndefined();
    expect(JSON.parse(adsClientConfig(live) ?? '')).toEqual({
      client: 'ca-pub-1234567890123456',
      units: { leaderboard: '1234567890', 'in-article': '987' },
    });
  });

  it('writes ads.txt for Google once a publisher id is set', () => {
    expect(adsTxt(live)).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
    expect(adsTxt(off)).toMatch(/^#/);
  });
});

describe('trust pages', () => {
  it('each have their own page file', () => {
    for (const page of trustPages) {
      expect(existsSync(`src/pages${page.href.replace(/\/$/, '')}.astro`), page.href).toBe(true);
    }
  });
});
