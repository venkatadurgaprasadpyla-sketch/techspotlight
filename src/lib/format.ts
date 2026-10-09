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

/** `YYYY-MM-DD` for `<time datetime>`. */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
