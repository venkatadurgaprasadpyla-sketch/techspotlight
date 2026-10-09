import type { Element, Root, RootContent } from 'hast';
import { describe, expect, it } from 'vitest';
import { adSlotPositions, insertAdSlots } from '~/lib/ad-slots';

const p = (words: number): Element => ({
  type: 'element',
  tagName: 'p',
  properties: {},
  children: [{ type: 'text', value: Array.from({ length: words }, () => 'word').join(' ') }],
});
const h2: RootContent = {
  type: 'element',
  tagName: 'h2',
  properties: {},
  children: [{ type: 'text', value: 'Heading' }],
};
const nl: RootContent = { type: 'text', value: '\n' };

describe('adSlotPositions', () => {
  it('places the first slot after the third paragraph', () => {
    const children = [p(10), nl, h2, nl, p(10), nl, p(10), nl, p(10)];
    expect(adSlotPositions(children)).toEqual([6]);
  });

  it('adds a slot after every further ~600 words', () => {
    const children = [p(50), p(50), p(50), p(300), p(301), p(10), p(600), p(10)];
    expect(adSlotPositions(children)).toEqual([2, 4, 6]);
  });

  it('never ends the article on an ad', () => {
    expect(adSlotPositions([p(10), p(10), p(10)])).toEqual([]);
    expect(adSlotPositions([p(10), p(10), p(10), nl])).toEqual([]);
  });

  it('only counts top-level paragraphs', () => {
    const list: RootContent = {
      type: 'element',
      tagName: 'ul',
      properties: {},
      children: [p(5), p(5), p(5)],
    };
    expect(adSlotPositions([list, p(5), p(5), h2])).toEqual([]);
  });

  it('honours custom options', () => {
    expect(adSlotPositions([p(10), p(10), h2], { afterParagraph: 1 })).toEqual([0]);
  });
});

describe('insertAdSlots', () => {
  it('returns a new tree with reserved, hidden slots', () => {
    const tree: Root = { type: 'root', children: [p(5), p(5), p(5), h2] };
    const out = insertAdSlots(tree);
    expect(tree.children).toHaveLength(4);
    expect(out.children).toHaveLength(5);
    expect(out.children[3]).toMatchObject({
      tagName: 'div',
      properties: { dataAdSlot: 'in-article', ariaHidden: 'true' },
    });
  });
});
