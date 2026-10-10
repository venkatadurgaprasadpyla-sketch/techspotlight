/**
 * What Pagefind (the static search index) knows about an article: filters for the search
 * page's type and hub chips, and metadata for result cards. Only article pages carry
 * `data-pagefind-body`, so listings and placeholders stay out of the index.
 * Pure, so the values are unit tested.
 */
import { hubs } from '~/config/taxonomy';
import { typeLabel, type CardItem } from './cards';

export type SearchField = [key: string, value: string];

export interface SearchFields {
  filters: SearchField[];
  meta: SearchField[];
}

/**
 * Pagefind splits these attributes on commas, so values must not contain any. The search
 * page's filter chips use the same function, so their values match the index.
 */
export const searchValue = (value: string) => value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
const fields = (entries: [string, string | number | undefined][]): SearchField[] =>
  entries.flatMap(([key, value]) =>
    value === undefined || value === '' ? [] : [[key, searchValue(String(value))] as SearchField],
  );

/** Filters and metadata for one article. `image` is a small thumbnail URL. */
export function searchFields(item: CardItem, image?: string): SearchFields {
  const type = typeLabel[item.type.type];
  const hub = hubs.find((h) => h.slug === item.hub)?.label;
  return {
    filters: fields([
      ['type', type],
      ['hub', hub],
    ]),
    meta: fields([
      ['type', type],
      ['label', item.collection === 'reviews' ? `${type} · ${item.leafLabel}` : type],
      ['date', item.date.toISOString().slice(0, 10)],
      ['product', item.productName],
      ['rating', item.rating],
      ['price', item.deal?.dealPrice ?? item.bestOffer?.price],
      ['image', image],
    ]),
  };
}
