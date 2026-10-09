# TechSpotlight

Independent tech review and buying-advice site for India (INR, Amazon.in and Flipkart). Static Astro site deployed to Cloudflare Pages.

## Stack

- Astro 7, TypeScript strict (`astro/tsconfigs/strict`), import alias `~/*` → `src/*`.
- Tailwind CSS 4 via `@tailwindcss/vite`, `@tailwindcss/typography`. Global stylesheet: `src/styles/global.css`.
- MDX and sitemap integrations. Trailing slashes everywhere (`trailingSlash: 'always'`).
- Vitest for unit tests (`tests/**/*.test.ts`), ESLint 9 (typescript-eslint strict, eslint-plugin-astro, jsx-a11y strict), Prettier with the Astro plugin.
- Zero client JS by default. Small vanilla islands only; each ≤ 5 KB gzip.

## Commands

| Command                           | What it does                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server on http://localhost:4321                                             |
| `npm run build`                   | Static build into `dist/`                                                       |
| `npm run check`                   | `astro check` (types)                                                           |
| `npm run lint` / `npm run format` | ESLint / Prettier write                                                         |
| `npm test`                        | Vitest                                                                          |
| `npm run gates`                   | All automated quality gates; writes `gate-reports/summary.md`                   |
| `npm run gates -- G1 G4`          | Run only the named gates                                                        |
| `npm run gates:audit`             | Lighthouse + axe + screenshots for pages in `gates.config.json` (needs `dist/`) |

## Quality gates

A change is done only when every gate passes. Thresholds live in `gates.config.json`; never lower them or skip a check to get green.

- G1 build with no warnings · G2 `astro check` clean · G3 ESLint 0 warnings + Prettier · G4 Vitest
- G5 Lighthouse mobile: performance ≥ 95, accessibility 100, best practices ≥ 95, SEO 100 (median of 3)
- G6 axe: 0 serious/critical at 1280 and 390, light and dark (screenshots go to `gate-reports/screens/` for G9)
- G7 no broken internal links or anchors · G8 JS/CSS budgets · G11 `npm audit --omit=dev` clean
- G9 visual match against the layout boards, G10 code review, G11 security review and G12 SEO sanity are manual PO checks.

When a task adds a page type, add a representative URL to `gates.config.json` → `pages`.

## Workflow

- One branch per backlog task: `task/<id>-<slug>`, one PR into `main`. CI (`.github/workflows/gates.yml`) runs `npm run gates` on every PR.
- Look up current Astro/Tailwind APIs before using them (Context7 or the official docs).
- Never commit secrets. Config that is public (site URL, AdSense publisher ID, affiliate tags) goes in `src/config/site.ts`.

## Layout

```
src/pages/      routes
src/styles/     global.css (Tailwind + design tokens)
src/lib/        pure helpers (unit tested), e.g. formatInr
scripts/        gates.mjs, audit-pages.mjs
tests/          Vitest specs
```
