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

// A page that declares <meta name="robots" content="noindex…"> never goes in the sitemap
// (placeholders, empty listings, the style guide, 404). The sitemap is written after every
// page, so read the built HTML rather than keeping a second list.
const outDir = fileURLToPath(new URL('./dist/', import.meta.url));
const NOINDEX = /<meta name="robots" content="noindex/;
/** @param {string} page */
function isIndexable(page) {
  const file = `${outDir}${new URL(page).pathname.slice(1)}index.html`;
  return !existsSync(file) || !NOINDEX.test(readFileSync(file, 'utf8'));
}

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  outDir,
  site: site.url,
  trailingSlash: 'always',
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  markdown: {
    processor: satteri({ hastPlugins: [adSlotsPlugin()] }),
  },
  integrations: [mdx(), sitemap({ filter: isIndexable }), pagefindIndex()],
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
