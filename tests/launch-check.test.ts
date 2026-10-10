import { describe, expect, it } from 'vitest';
import { sampleIds, sampleLinks } from '../scripts/launch-check.mjs';

describe('launch check', () => {
  it('finds every sample entry in the content folders', () => {
    const ids = sampleIds('src/content');
    expect(ids).toEqual(expect.arrayContaining(['northwind-aero-14', 'asha-testwell', 'orbit']));
  });

  it('flags links to sample entries by URL segment, not by wording', () => {
    const ids = ['northwind-aero-14', 'orbit'];
    expect(sampleLinks('<a href="/ultrabooks/northwind-aero-14-review/">', ids)).toEqual([
      'northwind-aero-14',
    ]);
    expect(sampleLinks('<a href="/brands/orbit/">Orbit</a>', ids)).toEqual(['orbit']);
    expect(sampleLinks('Camera samples from the orbit of a sample rate', ids)).toEqual([]);
  });
});
