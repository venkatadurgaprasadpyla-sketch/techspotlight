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
