import { describe, expect, it } from 'vitest';
import {
  byDealOrder,
  dealEndLabel,
  dealEndsAt,
  dealStatus,
  percentOff,
  ENDED_DEAL_DAYS,
} from '~/lib/deals';

describe('dealEndsAt', () => {
  it('runs a bare date to midnight at the end of that day in India', () => {
    expect(dealEndsAt(new Date('2026-12-31'))).toEqual(new Date('2026-12-31T18:30:00Z'));
  });
  it('ends at an IST time of day when one is given', () => {
    expect(dealEndsAt(new Date('2026-12-31'), '18:00')).toEqual(new Date('2026-12-31T12:30:00Z'));
    expect(dealEndsAt(new Date('2026-12-31'), '05:30')).toEqual(new Date('2026-12-31T00:00:00Z'));
  });
});

describe('dealStatus', () => {
  const endsAt = new Date('2026-10-10T18:30:00Z');
  const day = 24 * 60 * 60 * 1000;
  it('is live without an end date or before it', () => {
    expect(dealStatus(undefined, new Date())).toBe('live');
    expect(dealStatus(endsAt, new Date(endsAt.getTime() - 1))).toBe('live');
  });
  it('is ended for a week, then gone', () => {
    expect(dealStatus(endsAt, endsAt)).toBe('ended');
    expect(dealStatus(endsAt, new Date(endsAt.getTime() + ENDED_DEAL_DAYS * day - 1))).toBe(
      'ended',
    );
    expect(dealStatus(endsAt, new Date(endsAt.getTime() + ENDED_DEAL_DAYS * day))).toBe('gone');
  });
});

describe('percentOff', () => {
  it('rounds down so a discount is never overstated', () => {
    expect(percentOff(24999, 22999)).toBe(8);
    expect(percentOff(1000, 501)).toBe(49);
    expect(percentOff(1000, 500)).toBe(50);
    // Round discounts that floating point would put one below.
    expect(percentOff(50000, 45000)).toBe(10);
    expect(percentOff(20000, 18000)).toBe(10);
    expect(percentOff(30000, 24000)).toBe(20);
    for (let original = 100; original <= 200000; original += 997) {
      for (const pct of [5, 10, 15, 20, 25, 30, 40, 50]) {
        if ((original * pct) % 100 === 0) {
          expect(percentOff(original, original - (original * pct) / 100)).toBe(pct);
        }
      }
    }
  });
  it('is zero for no discount or bad input', () => {
    expect(percentOff(1000, 1000)).toBe(0);
    expect(percentOff(1000, 1200)).toBe(0);
    expect(percentOff(0, 0)).toBe(0);
  });
});

describe('dealEndLabel', () => {
  it('shows the last day for a deal that ends at midnight', () => {
    expect(dealEndLabel(dealEndsAt(new Date('2026-12-31')))).toBe('31 Dec 2026');
  });
  it('adds the time in IST for a deal that ends during the day', () => {
    expect(dealEndLabel(new Date('2026-12-31T12:30:00Z'))).toMatch(/^31 Dec 2026, 6:00 pm IST$/i);
  });
});

describe('byDealOrder', () => {
  const now = new Date('2026-10-09T12:00:00Z');
  const item = (title: string, extra: object = {}) => ({
    title,
    featured: false,
    date: new Date('2026-10-01'),
    ...extra,
  });
  it("puts live before ended, featured first, editor's picks before other badges", () => {
    const items = [
      item('ended', { featured: true, deal: { endsAt: new Date('2026-10-08') } }),
      item('plain new', { date: new Date('2026-10-08') }),
      item('badge', { deal: { badge: 'great-value' } }),
      item('pick', { deal: { badge: 'editors-pick' } }),
      item('featured', { featured: true }),
      item('plain old'),
    ];
    expect(items.sort(byDealOrder(now)).map((i) => i.title)).toEqual([
      'featured',
      'pick',
      'badge',
      'plain new',
      'plain old',
      'ended',
    ]);
  });
});
