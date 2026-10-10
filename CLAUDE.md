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
- G5 Lighthouse mobile: performance ≥ 95, accessibility 100, best practices ≥ 95, SEO 100, CLS ≤ 0.05 (median of 3)
- G6 axe: 0 serious/critical at 1280 and 390, light and dark (screenshots go to `gate-reports/screens/` for G9)
- G7 no broken internal links or anchors · G8 JS/CSS budgets · G11 `npm audit --omit=dev` clean
- G12 SEO: `scripts/seo-check.mjs` checks every built page for title, description, canonical, og:image, unique titles on indexable pages, and JSON-LD that parses, has the required fields per `@type` and matches the page type.
- G9 visual match against the layout boards, G10 code review and G11 security review are manual PO checks; so is the rest of G12 (Rich Results spot checks).

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
- Face-offs `src/pages/vs/[versus].astro` (`src/components/versus/*`, scoring in `src/lib/versus.ts`), how-tos `src/pages/how-to/[howto].astro`, news `src/pages/news/[news].astro`, deals `src/pages/deals/[deal].astro`. Deal listings (`/deals/`, `/<hub>/deals/`) render `listing/DealsPage` with `deals/DealCard`; status, % off and ordering live in `src/lib/deals.ts` (ended deals show for a week, then `getArticles()` drops them). Island: `src/scripts/deals.ts` (filters, sort, coupon copy, ended re-check).
- JS-only controls carry `data-needs-js`: they are in the HTML from the start (no layout shift) and a `<noscript>` rule in `BaseHead` hides them without JS. "More like this" lists use `closestTo()` (`src/lib/related.ts`). Bylines use `ArticleByline`.
- Homepage `src/pages/index.astro`: what goes where (hero from `featured: true`, type rows, live deals, hub rows, trending) is `homeSections()` in `src/lib/home.ts`; rows use `home/HomeRow`.
- Archives: brand pages `/brands/<id>/` (`archive/BrandPage`, one per file in `src/content/brands`; menu brands without a file stay placeholders), author pages `/authors/<id>/` (`archive/AuthorPage`, Person JSON-LD), tag pages `/tags/<tag>/` and months `/archive/<yyyy>/<mm>/` (`archive/ArchivePage`), plus `/brands/`, `/tags/`, `/archive/` indexes. All paginated like listings; logic in `src/lib/archives.ts`. Articles link to them through bylines, `AuthorBio` and `ArticleTopics` (brand and tag chips under the body).
- Search: `/search/` uses Pagefind's JS API from the island `src/scripts/search.ts`. `src/integrations/pagefind.ts` indexes only pages with `data-pagefind-body` (each article root) after `astro build`; `SearchData` adds an article's filters and result metadata (`src/lib/search.ts`). Mark non-content inside articles `data-pagefind-ignore`; `.sr-only` and `.ad-slot` are excluded automatically. Search does not work in `npm run dev` (the index exists only in builds). G8 gives Pagefind's runtime its own budget (`searchRuntimeKbGzip`).
- Article URLs come from `articlePath()` in `src/lib/urls.ts`; listings render `CardItem`s (`src/lib/cards.ts`) loaded once by `getArticles()` (`src/lib/articles.ts`).
- SEO: `BaseHead` prints the title template, canonical, Open Graph/Twitter tags (share image from `articleSeo()`/`ogImage()` in `src/lib/seo.ts`, else `public/og-default.png`), the RSS link and any `jsonLd`. Builders live in `src/lib/structured-data.ts` (Organization + WebSite on the home page, Review, Article/NewsArticle, ItemList, FAQPage, deal Product; `Breadcrumbs` adds BreadcrumbList, `AuthorPage` Person). `npm run images:og` regenerates `og-default.png` and `logo.png`. Feeds: `/rss.xml` and `/<hub>/rss.xml` (`src/lib/feeds.ts`).
- Ads: `AdSlot` reserves a fixed, labelled box per placement (leaderboard, sidebar, in-feed, skyscraper, in-article, sticky-mobile); in-article slots come from `src/lib/ad-slots.ts`. With `site.ads.publisherId` and unit ids set (`src/config/site.ts`), `<body data-ads>` (from `src/lib/ads.ts`) lets the island `src/scripts/ads.ts` fill slots near the viewport, only after the visitor accepts cookies in `ConsentBanner` (`src/scripts/consent.ts`, `localStorage['ts-consent']`; footer "Cookie settings" reopens it). Banner, sticky ad and AdSense code exist only when ads are configured. `/ads.txt` follows the publisher id. Cloudflare Web Analytics loads when `site.analytics.cloudflareToken` is set.
- Trust pages (About board): `TrustLayout` with the side menu from `src/config/trust.ts`; about, how-we-test, review-policy, affiliate-disclosure, privacy, terms, contact. They pass `noAds`. Promises, test plans, rating scale and award rules live in `src/config/editorial.ts`; the privacy page describes ads, analytics and the newsletter only as live when configured.
- Placeholders and empty listings are noindex. The sitemap leaves out any page whose built HTML is noindex and page 2+ of listings, and takes `lastmod` from `article:modified_time` (`astro.config.mjs`), so there is no second list to keep in sync.
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
src/config/     site.ts (public config), taxonomy.ts, routes.ts (placeholder registry), trust.ts, editorial.ts
src/layouts/    BaseLayout (head, header, footer, consent, ads), TrustLayout, Placeholder
src/components/ Header, MegaMenu, MobileDrawer, Footer, NewsletterForm, ThemeToggle, Logo, Icon
src/scripts/    nav.ts (mega-menu + drawer), theme.ts, review islands (jumpbar, gallery, youtube)
src/pages/      routes
src/styles/     global.css (Tailwind + design tokens)
src/lib/        pure helpers (unit tested): format, content-schema, visibility, listing(s), cards, urls, affiliate, ad-slots, headings; content.ts reads collections
src/content/    articles and data (see CONTENT-GUIDE.md); src/assets/ images
scripts/        gates.mjs, audit-pages.mjs, new-content.mjs (scaffolder), make-sample-images.mjs
tests/          Vitest specs
```
