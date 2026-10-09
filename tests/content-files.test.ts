// Checks the schemas can't express: article bodies and links between entries.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readData } from './helpers/content';

const root = 'src/content';
const articleFolders = ['reviews', 'guides', 'versus', 'howtos', 'news', 'deals'];

const sampleIds = (folder: string) =>
  new Set(
    readdirSync(join(root, folder))
      .filter((f) => readData(join(root, folder, f)).sample === true)
      .map((f) => f.replace(/\.yaml$/, '')),
  );

const articles = articleFolders.flatMap((folder) =>
  readdirSync(join(root, folder)).map((file) => {
    const path = join(root, folder, file);
    return {
      path,
      data: readData(path),
      body: readFileSync(path, 'utf8').split(/^---$/m)[2] ?? '',
    };
  }),
);

describe('content files', () => {
  it('have no TODO left in the body of a published article', () => {
    const unfinished = articles
      .filter((a) => a.data.draft !== true && a.body.includes('TODO'))
      .map((a) => a.path);
    expect(unfinished).toEqual([]);
  });

  it('never credit a real article to a sample author or brand', () => {
    const sampleAuthors = sampleIds('authors');
    const sampleBrands = sampleIds('brands');
    const problems = articles
      .filter((a) => a.data.sample !== true && a.data.draft !== true)
      .flatMap(({ path, data }) => {
        const product = data.product as { brand?: string } | string | undefined;
        const brands = [
          ...((data.brands as string[] | undefined) ?? []),
          ...(typeof product === 'object' && product.brand ? [product.brand] : []),
        ];
        return [
          ...(sampleAuthors.has(data.author as string) ? [`${path}: author ${data.author}`] : []),
          ...brands.filter((b) => sampleBrands.has(b)).map((b) => `${path}: brand ${b}`),
        ];
      });
    expect(problems).toEqual([]);
  });
});
