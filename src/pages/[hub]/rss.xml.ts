import rss from '@astrojs/rss';
import type { APIRoute, GetStaticPaths } from 'astro';
import { site } from '~/config/site';
import type { Hub } from '~/config/taxonomy';
import { getArticles } from '~/lib/articles';
import { feedItems } from '~/lib/feeds';
import { liveHubs } from '~/lib/listings';

/** One feed per live hub: /computing/rss.xml, /phones/rss.xml. */
export const getStaticPaths = (() =>
  liveHubs().map((hub) => ({
    params: { hub: hub.slug },
    props: { hub },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async (context) => {
  const { hub } = context.props as { hub: Hub };
  const items = (await getArticles()).filter((i) => i.hub === hub.slug);
  return rss({
    title: `${site.name}: ${hub.label}`,
    description: `The latest ${hub.label.toLowerCase()} reviews, buying guides, news and deals from ${site.name}.`,
    site: context.site ?? site.url,
    items: feedItems(items),
    trailingSlash: true,
    customData: `<language>${site.locale}</language>`,
  });
};
