import { describe, expect, it } from 'vitest';
import { isPublished } from '~/lib/visibility';

describe('isPublished', () => {
  const prod = { dev: false, hideSamples: false };
  it('shows normal entries', () => {
    expect(isPublished({}, prod)).toBe(true);
  });
  it('hides drafts in production but not in dev', () => {
    expect(isPublished({ draft: true }, prod)).toBe(false);
    expect(isPublished({ draft: true }, { ...prod, dev: true })).toBe(true);
  });
  it('hides samples only when PUBLIC_HIDE_SAMPLES is set', () => {
    expect(isPublished({ sample: true }, prod)).toBe(true);
    expect(isPublished({ sample: true }, { ...prod, hideSamples: true })).toBe(false);
    expect(isPublished({ sample: true }, { dev: true, hideSamples: true })).toBe(false);
  });
});
