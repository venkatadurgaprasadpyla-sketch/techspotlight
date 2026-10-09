/** Public URLs for articles. The page templates for each type arrive in T4 to T7. */
export type ArticleCollection = 'reviews' | 'guides' | 'versus' | 'howtos' | 'news' | 'deals';

export const articleCollections: readonly ArticleCollection[] = [
  'reviews',
  'guides',
  'versus',
  'howtos',
  'news',
  'deals',
];

/** `leaf` is the subcategory slug, or the category slug when it has no subcategories. */
export function articlePath(collection: ArticleCollection, id: string, leaf: string): string {
  switch (collection) {
    case 'reviews':
      return `/${leaf}/${id}-review/`;
    case 'guides':
      return `/best/${id}/`;
    case 'versus':
      return `/vs/${id}/`;
    case 'howtos':
      return `/how-to/${id}/`;
    case 'news':
      return `/news/${id}/`;
    case 'deals':
      return `/deals/${id}/`;
  }
}
