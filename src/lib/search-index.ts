/**
 * Pagefind data for the article at `url` (see search.ts). Undefined when the article is not
 * listed (deals gone for over a week), which keeps it out of search too.
 */
import { getImage } from 'astro:assets';
import { getArticles } from './articles';
import { searchFields, type SearchFields } from './search';

export async function searchData(url: string): Promise<SearchFields | undefined> {
  const item = (await getArticles()).find((a) => a.url === url);
  if (!item) return undefined;
  const thumb = await getImage({ src: item.image, width: 320, format: 'webp' });
  return searchFields(item, thumb.src);
}
