/** Helpers for page SEO that need Astro: share images and structured-data bylines. */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { authorPath } from './archives';
import { absolute, type Byline } from './structured-data';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** An article's hero cropped to 1200×630 JPEG for social shares, as an absolute URL. */
export async function ogImage(src: ImageMetadata): Promise<string> {
  const image = await getImage({
    src,
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fit: 'cover',
    format: 'jpg',
  });
  return absolute(image.src);
}

/** Author for structured data, linked to their author page. */
export const byline = (author: CollectionEntry<'authors'> | undefined): Byline | undefined =>
  author && { name: author.data.name, url: absolute(authorPath(author.id)) };

interface ArticleData {
  title: string;
  description: string;
  heroImage: ImageMetadata;
  heroAlt: string;
  publishDate: Date;
  updatedDate?: Date | undefined;
}

/**
 * What every article page passes to BaseLayout (`head`: share image and dates) and the shared
 * fields of its structured data (`input` for `article()`, `review()` and friends).
 */
export async function articleSeo(
  data: ArticleData,
  url: string,
  author: CollectionEntry<'authors'> | undefined,
) {
  const image = await ogImage(data.heroImage);
  return {
    head: {
      image,
      imageAlt: data.heroAlt,
      article: { published: data.publishDate, modified: data.updatedDate },
    },
    input: {
      url,
      title: data.title,
      description: data.description,
      images: [image],
      author: byline(author),
      publishDate: data.publishDate,
      updatedDate: data.updatedDate,
    },
  };
}
