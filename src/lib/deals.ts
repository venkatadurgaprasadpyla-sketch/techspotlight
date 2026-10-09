/** Deal status, discount and ordering. Pure, so listings and tests share one definition. */

/** Expired deals stay listed (labelled "Deal ended") for this many days, then drop out. */
export const ENDED_DEAL_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/**
 * When a deal stops. A bare date (`expiresAt: 2026-12-31`, parsed as UTC midnight) runs to the
 * end of that day in India; a full timestamp is used as written.
 */
export function dealEndsAt(expiresAt: Date): Date {
  const isBareDate = expiresAt.getTime() % DAY === 0;
  return isBareDate ? new Date(expiresAt.getTime() + DAY - IST_OFFSET) : expiresAt;
}

export type DealStatus = 'live' | 'ended' | 'gone';

/** live: buyable; ended: show as "Deal ended"; gone: ended over a week ago, leave out of lists. */
export function dealStatus(endsAt: Date | undefined, now: Date): DealStatus {
  if (!endsAt || now < endsAt) return 'live';
  return now.getTime() - endsAt.getTime() < ENDED_DEAL_DAYS * DAY ? 'ended' : 'gone';
}

/** Whole percent off, rounded down so we never overstate a discount. */
export function percentOff(originalPrice: number, dealPrice: number): number {
  if (originalPrice <= 0 || dealPrice >= originalPrice) return 0;
  return Math.floor((1 - dealPrice / originalPrice) * 100);
}

export type DealBadge = 'lowest-price' | 'great-value' | 'editors-pick';

export const dealBadgeLabel: Record<DealBadge, string> = {
  'lowest-price': 'Lowest price',
  'great-value': 'Great value',
  'editors-pick': "Editor's pick",
};

interface Orderable {
  featured: boolean;
  date: Date;
  title: string;
  deal?: { badge?: DealBadge | undefined; endsAt?: Date | undefined } | undefined;
}

/**
 * "Editor's picks" order for deal listings: live deals before ended ones, then featured, then
 * editor's picks and other badged deals, then newest.
 */
export function byDealOrder(now: Date) {
  const rank = (item: Orderable) =>
    (dealStatus(item.deal?.endsAt, now) === 'live' ? 0 : 8) +
    (item.featured ? 0 : 4) +
    (item.deal?.badge === 'editors-pick' ? 0 : item.deal?.badge ? 1 : 2);
  return (a: Orderable, b: Orderable) =>
    rank(a) - rank(b) || b.date.getTime() - a.date.getTime() || a.title.localeCompare(b.title);
}

const istDate = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});
const istTime = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

/** The last day of a deal in India: "31 Dec 2026", or "31 Dec 2026, 6:00 pm IST" mid-day. */
export function dealEndLabel(endsAt: Date): string {
  const endsAtMidnight = (endsAt.getTime() + IST_OFFSET) % DAY === 0;
  if (endsAtMidnight) return istDate.format(new Date(endsAt.getTime() - 1));
  return `${istDate.format(endsAt)}, ${istTime.format(endsAt)} IST`;
}
