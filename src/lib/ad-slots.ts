/**
 * In-article ad slots: after the third top-level paragraph, then after the paragraph that
 * passes every further ~600 words, never at the end. Slots have a fixed height
 * (`.ad-in-article`) so nothing shifts when ads load (T10). Only top-level paragraphs count,
 * so slots never land inside lists, tables or MDX components.
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';
import type { HastPluginEntry } from 'satteri';

export interface AdSlotOptions {
  afterParagraph?: number;
  everyWords?: number;
}

const textOf = (node: RootContent | ElementContent): string =>
  node.type === 'text'
    ? node.value
    : 'children' in node
      ? node.children.map((child) => textOf(child)).join(' ')
      : '';

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export const adSlotElement = (): Element => ({
  type: 'element',
  tagName: 'div',
  properties: {
    className: ['ad-slot', 'ad-in-article', 'not-prose'],
    dataAdSlot: 'in-article',
    ariaHidden: 'true',
  },
  children: [{ type: 'text', value: 'Advertisement' }],
});

/** Indexes of the top-level nodes an ad slot follows. */
export function adSlotPositions(
  children: readonly RootContent[],
  { afterParagraph = 3, everyWords = 600 }: AdSlotOptions = {},
): number[] {
  const positions: number[] = [];
  let paragraphs = 0;
  let wordsSinceSlot = 0;
  const lastElement = children.findLastIndex((n) => n.type === 'element');
  children.forEach((node, i) => {
    wordsSinceSlot += wordCount(textOf(node));
    if (node.type !== 'element' || node.tagName !== 'p') return;
    paragraphs += 1;
    // Never end the article on an ad.
    if (i >= lastElement) return;
    const due =
      positions.length === 0 ? paragraphs === afterParagraph : wordsSinceSlot >= everyWords;
    if (due) {
      positions.push(i);
      wordsSinceSlot = 0;
    }
  });
  return positions;
}

/** Returns a copy of `tree` with the slots inserted. */
export function insertAdSlots(tree: Root, options?: AdSlotOptions): Root {
  const at = new Set(adSlotPositions(tree.children, options));
  return {
    ...tree,
    children: tree.children.flatMap((node, i) => (at.has(i) ? [node, adSlotElement()] : [node])),
  };
}

/** Sätteri hast plugin (astro.config.mjs). Runs on Markdown/MDX under src/content/ only. */
export function adSlotsPlugin(options: AdSlotOptions = {}): HastPluginEntry {
  return ({ fileURL }) =>
    fileURL && /[\\/]src[\\/]content[\\/]/.test(decodeURIComponent(fileURL.pathname))
      ? {
          name: 'ad-slots',
          after(root, ctx) {
            const children = root.children as readonly RootContent[];
            for (const i of adSlotPositions(children, options)) {
              const node = root.children[i];
              if (node) ctx.insertAfter(node, adSlotElement());
            }
          },
        }
      : null;
}
