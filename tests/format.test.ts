import { describe, expect, it } from 'vitest';
import { formatInr } from '../src/lib/format';

describe('formatInr', () => {
  it('uses Indian digit grouping and the rupee sign', () => {
    expect(formatInr(124999)).toBe('₹1,24,999');
    expect(formatInr(9999)).toBe('₹9,999');
  });

  it('rounds to whole rupees', () => {
    expect(formatInr(1499.6)).toBe('₹1,500');
  });

  it('rejects non-finite values', () => {
    expect(() => formatInr(Number.NaN)).toThrow(RangeError);
  });
});
