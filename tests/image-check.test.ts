import { describe, expect, it } from 'vitest';
import { checkImages } from '../scripts/image-check.mjs';

const img = (extra = '') =>
  `<img src="/_astro/a.webp" alt="" width="10" height="10" decoding="async" loading="lazy" ${extra}>`;

describe('G5 image check', () => {
  it('passes sized, lazy astro:assets images and one prioritised LCP image', () => {
    const lcp = img().replace('loading="lazy"', 'loading="eager" fetchpriority="high"');
    expect(checkImages(lcp + img() + img())).toEqual([]);
  });

  it('flags missing attributes, outside images and more than one priority image', () => {
    expect(checkImages('<img src="/x.png">')).toEqual([
      'x.png: no alt attribute',
      'x.png: not an astro:assets image',
      'x.png: no width',
      'x.png: no height',
      'x.png: no decoding',
      'x.png: no loading="lazy"',
    ]);
    const hi = img('fetchpriority="high"');
    expect(checkImages(hi + hi)).toEqual(['2 images with fetchpriority="high" (max 1)']);
  });

  it('only asks the gallery lightbox image for alt text', () => {
    expect(checkImages('<img alt="" data-lightbox-img>')).toEqual([]);
    expect(checkImages('<img data-lightbox-img>')).toEqual([
      '<img data-lightbox-img>: no alt attribute',
    ]);
  });
});
