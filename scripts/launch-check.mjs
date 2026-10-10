#!/usr/bin/env node
// Launch build check: no page or feed in dist/ links to an entry marked `sample: true` (its URL
// path segment is the entry id: /<leaf>/<id>-review/, /best/<id>/, /brands/<id>/, /authors/<id>/,
// …). Run after a build with PUBLIC_HIDE_SAMPLES=true, as CI's launch-build job does.
//
//   node scripts/launch-check.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

/** Ids of content entries whose frontmatter or YAML says `sample: true`. */
export function sampleIds(contentDir) {
  return walk(contentDir)
    .filter((f) => /^sample:\s*true\s*$/m.test(readFileSync(f, 'utf8')))
    .map((f) => basename(f, extname(f)));
}

/** The sample ids that `text` links to, as a URL path segment (optionally with `-review`). */
export function sampleLinks(text, ids) {
  return ids.filter((id) => new RegExp(`/${id}(-review)?/`).test(text));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ids = sampleIds('src/content');
  const files = walk('dist').filter((f) => /\.(html|xml)$/.test(f));
  const problems = files.flatMap((file) =>
    sampleLinks(readFileSync(file, 'utf8'), ids).map((id) => `/${relative('dist', file)}: ${id}`),
  );
  problems.forEach((p) => console.log(`  ✗ links to sample entry ${p}`));
  console.log(
    `Launch check: ${files.length} files, ${ids.length} sample entries, ${problems.length} problem(s)`,
  );
  process.exit(problems.length ? 1 : 0);
}
