/**
 * Builds the Pagefind search index into dist/pagefind/ after every `astro build`, so search
 * works on any static host. Only pages marked `data-pagefind-body` (articles, see
 * src/lib/search.ts) are added: given no marked pages at all, Pagefind would otherwise index
 * every page. The search page uses Pagefind's JS API (src/scripts/search.ts), so Pagefind's
 * prebuilt UI bundles are deleted rather than shipped.
 */
import type { AstroIntegration } from 'astro';
import { readdir, readFile, rm } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { close, createIndex } from 'pagefind';

const UNUSED = [
  'pagefind-ui.js',
  'pagefind-ui.css',
  'pagefind-modular-ui.js',
  'pagefind-modular-ui.css',
  'pagefind-component-ui.js',
  'pagefind-component-ui.css',
  'pagefind-highlight.js',
];
const MARKED = /\sdata-pagefind-body[\s=>]/;

export function pagefindIndex(): AstroIntegration {
  return {
    name: 'techspotlight:pagefind',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const site = fileURLToPath(dir);
        const output = join(site, 'pagefind');
        const files = (await readdir(site, { recursive: true })).filter((f) => f.endsWith('.html'));
        let indexed = 0;
        try {
          // Screen-reader-only text and ad slots are not article content.
          const { index, errors } = await createIndex({
            excludeSelectors: ['.sr-only', '.ad-slot'],
          });
          if (!index) throw new Error(errors.join('; '));
          for (const file of files) {
            const content = await readFile(join(site, file), 'utf8');
            if (!MARKED.test(content)) continue;
            // dist/x/index.html is served as /x/.
            const url = `/${file.split(sep).join('/')}`.replace(/index\.html$/, '');
            const added = await index.addHTMLFile({ url, content });
            if (added.errors.length) throw new Error(added.errors.join('; '));
            indexed += 1;
          }
          const written = await index.writeFiles({ outputPath: output });
          if (written.errors.length) throw new Error(written.errors.join('; '));
          logger.info(`Indexed ${indexed} articles for search`);
        } finally {
          await close();
        }
        await Promise.all(UNUSED.map((file) => rm(join(output, file), { force: true })));
      },
    },
  };
}
