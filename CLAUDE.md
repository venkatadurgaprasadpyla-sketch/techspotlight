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
| `npm run new -- review "Name"`    | Scaffold a draft article, author or brand (see CONTENT-GUIDE.md)                |

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

## Design system

- Tokens live in `src/styles/global.css` as `light-dark()` pairs on `:root` (`--ts-*`), exposed to Tailwind as `bg-surface`, `text-muted`, `border-border`, `bg-accent`, `bg-buy`, `text-rating`, etc. Never hard-code hex values in components.
- Theme: `<html data-theme>` is set before first paint (inline script in `BaseHead.astro`) from `localStorage['ts-theme']` or the OS; `src/scripts/theme.ts` handles toggles.
- Fonts: IBM Plex Sans (body), Space Grotesk (headings, `font-heading`), IBM Plex Mono (`font-mono`, specs and prices), self-hosted via Astro's Fonts API from `@fontsource/*` latin files (`astro.config.mjs`).
- Shared component classes: `.wrap`, `.lbl`, `.btn` (+ `.btn-ghost`, `.btn-buy`), `.chip`, `.badge` (+ `.badge-ec`, `.badge-bv`), `.icon-btn`, `.sec-head`, `.placeholder`, `.ad-slot` (+ `.ad-in-article`), `prose` (article bodies, mapped to the tokens).
- `/styleguide/` (noindex) shows every token and component for visual checks against the DesignSystem board.

## Taxonomy and routes

- `src/config/taxonomy.ts` is the single source of truth for hubs → categories → subcategories and content types. Leaf slugs (subcategories, or categories without subcategories) are unique site-wide.
- `src/pages/[...path].astro` builds every section page: listings from `src/lib/listings.ts` (live hubs, categories, subcategories, per-hub and site-wide content types; 12 per page, page n at `<base>page/<n>/`), placeholders for hubs with `mvp: false` (`src/config/routes.ts`), and placeholders for article URLs whose templates have not shipped (`awaitingTemplate`; remove a collection there when its route ships). It throws if two pages want the same URL.
- Reviews: `src/pages/[leaf]/[review].astro` (`/<leaf>/<id>-review/`), built from `src/components/review/*` (VerdictBox, CheatSheet, SpecsTable, ScoreCard, BenchmarkTable, Gallery, YouTubeFacade, BuyIf, PriceWidget, AuthorBio, JumpBar). Islands: `src/scripts/jumpbar.ts`, `gallery.ts` (native `<dialog>` lightbox), `youtube.ts` (youtube-nocookie facade); each works as plain links without JS.
- Guides: `src/pages/best/[guide].astro` (`/best/<id>/`), built from `src/components/guide/*` (QuickList, PickEntry, CompareTable, AlsoTested), the shared `HowWeTest` block and the review `ScoreCard`/`Faq`. Both article templates call `assertNoHeadingClash()` (`src/lib/headings.ts`) so a body heading can't reuse a section id.
- Article URLs come from `articlePath()` in `src/lib/urls.ts`; listings render `CardItem`s (`src/lib/cards.ts`) loaded once by `getArticles()` (`src/lib/articles.ts`).
- Placeholders and empty listings are noindex. The sitemap leaves out any page whose built HTML is noindex (`astro.config.mjs`), so there is no second list to keep in sync.
- Components: `cards/ArticleCard` (standard, compact, hero, review), `Rating`, `BadgeTag`, `Breadcrumbs` (with BreadcrumbList JSON-LD), `Pagination`, `AdSlot`, `listing/*` (page templates, `ExploreGrid`, `Sidebar`). Outbound retailer links go through `affiliateHref()` with `rel={AFFILIATE_REL}`.

## Content

- Markdown runs through Astro 7's default Sätteri processor. Plugins are Sätteri hast/mdast plugins passed to `satteri({ hastPlugins })` in `astro.config.mjs`, not `markdown.rehypePlugins`. `src/lib/ad-slots.ts` reserves in-article ad slots (after paragraph 3, then every ~600 words) in files under `src/content/`.
- Collections (`src/content.config.ts`): reviews, guides, versus, howtos, news, deals (Markdown/MDX) and authors, brands (YAML) under `src/content/<name>/`. Schemas are factories in `src/lib/content-schema.ts`, unit tested with stand-in `image()`/`reference()` helpers (`tests/helpers/content.ts`).
- Schemas validate topics against `taxonomy.ts`, retailer links against `site.retailers` hosts, and refuse `TODO` in anything that is not a draft.
- Read content only through `getPublished()` / `getPublishedEntry()` in `src/lib/content.ts`: drafts are dropped in production and `sample: true` entries when `PUBLIC_HIDE_SAMPLES=true`.
- `npm run new -- <type> "Name" [--topic <leaf>]` scaffolds a draft (`scripts/new-content.mjs`). `CONTENT-GUIDE.md` is the writer-facing guide, including how to paste output from the review-writer skill.
- Sample content uses fictional brands (Northwind, Kestrel, Orbit) and images from `npm run images:samples`.

## Layout

```
src/config/     site.ts (public config), taxonomy.ts, routes.ts (placeholder registry)
src/layouts/    BaseLayout (head, header, footer), Placeholder
src/components/ Header, MegaMenu, MobileDrawer, Footer, NewsletterForm, ThemeToggle, Logo, Icon
src/scripts/    nav.ts (mega-menu + drawer), theme.ts, review islands (jumpbar, gallery, youtube)
src/pages/      routes
src/styles/     global.css (Tailwind + design tokens)
src/lib/        pure helpers (unit tested): format, content-schema, visibility, listing(s), cards, urls, affiliate, ad-slots, headings; content.ts reads collections
src/content/    articles and data (see CONTENT-GUIDE.md); src/assets/ images
scripts/        gates.mjs, audit-pages.mjs, new-content.mjs (scaffolder), make-sample-images.mjs
tests/          Vitest specs
```
