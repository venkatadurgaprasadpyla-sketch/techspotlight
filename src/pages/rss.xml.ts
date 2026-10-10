import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { site } from '~/config/site';
import { getArticles } from '~/lib/articles';
import { feedItems } from '~/lib/feeds';

/** Site feed: the newest articles of every type. */
export const GET: APIRoute = async (context) =>
  rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    items: feedItems(await getArticles()),
    trailingSlash: true,
    customData: `<language>${site.locale}</language>`,
  });
