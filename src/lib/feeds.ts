/** RSS feed items for the site feed (/rss.xml) and each live hub (/<hub>/rss.xml). Pure. */
import { typeLabel, type CardItem } from './cards';

export const FEED_SIZE = 30;

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date;
  categories: string[];
}

/** The newest articles by first publication, at most `limit`. */
export function feedItems(items: readonly CardItem[], limit = FEED_SIZE): FeedItem[] {
  return [...items]
    .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())
    .slice(0, limit)
    .map((item) => ({
      title: item.title,
      link: item.url,
      description: item.description,
      pubDate: item.publishDate,
      categories: [typeLabel[item.type.type], item.leafLabel],
    }));
}
