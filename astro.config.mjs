// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/config/site.ts';

// Internal, error and placeholder pages are noindex and must never reach the sitemap.
import { placeholderPaths } from './src/config/routes.ts';
const NOINDEX_PATHS = new Set(['/styleguide/', '/404/', ...placeholderPaths()]);

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: site.url,
  trailingSlash: 'always',
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !NOINDEX_PATHS.has(new URL(page).pathname),
    }),
  ],
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
