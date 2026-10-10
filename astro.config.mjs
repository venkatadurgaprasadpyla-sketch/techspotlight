// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/config/site.ts';
import { satteri } from '@astrojs/markdown-satteri';
import { adSlotsPlugin } from './src/lib/ad-slots.ts';
import { pagefindIndex } from './src/integrations/pagefind.ts';

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The sitemap lists indexable first pages only. A page that declares <meta name="robots"
// content="noindex…"> (placeholders, empty listings, the style guide, 404) and page 2+ of a
// listing stay out. The sitemap is written after every page, so read the built HTML rather than
// keeping a second list; articles also give their lastmod from article:modified_time.
const outDir = fileURLToPath(new URL('./dist/', import.meta.url));
const NOINDEX = /<meta name="robots" content="noindex/;
const MODIFIED = /<meta property="article:modified_time" content="([^"]+)"/;
/** @param {string} page */
function builtHtml(page) {
  const file = `${outDir}${new URL(page).pathname.slice(1)}index.html`;
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}
/** @param {string} page */
const isIndexable = (page) =>
  !/\/page\/\d+\/$/.test(new URL(page).pathname) && !NOINDEX.test(builtHtml(page));
/** @param {import('@astrojs/sitemap').SitemapItem} item */
function withLastmod(item) {
  const modified = MODIFIED.exec(builtHtml(item.url))?.[1];
  return modified ? { ...item, lastmod: modified } : item;
}

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  outDir,
  site: site.url,
  trailingSlash: 'always',
  // Same-site links prefetch on hover or focus; on slow connections or Save-Data, only on tap.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  markdown: {
    processor: satteri({ hastPlugins: [adSlotsPlugin()] }),
  },
  integrations: [mdx(), sitemap({ filter: isIndexable, serialize: withLastmod }), pagefindIndex()],
  // Self-hosted latin subsets from the @fontsource packages: no network needed at build time.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex-sans',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2'],
          },
          {
            weight: 400,
            style: 'italic',
            src: ['@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff2'],
          },
          {
            weight: 600,
            style: 'normal',
            src: ['@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2'],
          },
          {
            weight: 700,
            style: 'normal',
            src: ['@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Space Grotesk',
      cssVariable: '--font-space-grotesk',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            weight: 500,
            style: 'normal',
            src: ['@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2'],
          },
          {
            weight: 700,
            style: 'normal',
            src: ['@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          {
            weight: 500,
            style: 'normal',
            src: ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2'],
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
