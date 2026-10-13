const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  // Never show a sign on zero (avoids "-₹0" for small negative amounts).
  signDisplay: 'negative',
});

/** Format a whole-rupee amount with Indian digit grouping, e.g. 124999 -> "₹1,24,999". */
export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`formatInr expects a finite number, got ${amount}`);
  }
  return inrFormatter.format(amount);
}

const aedFormatter = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  currencyDisplay: 'code',
  maximumFractionDigits: 0,
  signDisplay: 'negative',
});

/** Format a whole-dirham amount, e.g. 3299 -> "AED 3,299". */
export function formatAed(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`formatAed expects a finite number, got ${amount}`);
  }
  return aedFormatter.format(amount).replace(/\u00a0/g, ' ');
}

/** Format an amount in the given currency. */
export const formatPrice = (amount: number, currency: 'INR' | 'AED') =>
  currency === 'AED' ? formatAed(amount) : formatInr(amount);

// Content dates are calendar dates (YAML `2026-10-09` parses to UTC midnight), so format in UTC.
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthYearFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "9 Oct 2026" */
export const formatDate = (date: Date) => dateFormatter.format(date);

/** "October 2026", for "Updated <month year>" on buying guides. */
export const formatMonthYear = (date: Date) => monthYearFormatter.format(date);

const istTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});
const istDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

/** True when a content date carries a time of day (date-only YAML parses to UTC midnight). */
export const hasTime = (date: Date) => date.getTime() % 86_400_000 !== 0;

/**
 * "7 Oct 2026, 10:30 am IST" when the date has a time of day; otherwise the plain date.
 * News posts show both.
 */
export function formatDateTime(date: Date): string {
  if (!hasTime(date)) return formatDate(date);
  const time = istTimeFormatter.format(date).replace(/\s+/g, ' ').toLowerCase();
  return `${istDateFormatter.format(date)}, ${time} IST`;
}

/** `YYYY-MM-DD` for `<time datetime>`. */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
