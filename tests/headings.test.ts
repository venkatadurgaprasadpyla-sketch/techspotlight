import { describe, expect, it } from 'vitest';
import { assertNoHeadingClash } from '~/lib/headings';

describe('assertNoHeadingClash', () => {
  const ids = ['verdict', 'faq'];

  it('accepts bodies without template headings', () => {
    expect(() => assertNoHeadingClash('Review x', [{ slug: 'design' }], ids)).not.toThrow();
  });

  it('names each clashing heading, including the -title ids', () => {
    expect(() =>
      assertNoHeadingClash('Review x', [{ slug: 'verdict' }, { slug: 'faq-title' }], ids),
    ).toThrow(/Review x: body headings "verdict", "faq-title" clash/);
  });
});
