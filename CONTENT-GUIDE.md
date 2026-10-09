# Content guide

Every article is a Markdown (or MDX) file with typed frontmatter. The build checks each file
against the schemas in `src/lib/content-schema.ts`, so a missing field or a typo fails the build
with a message that names the file and the field.

## Where things go

| Type                 | Folder                 | URL it will get (built in T3 to T7)   |
| -------------------- | ---------------------- | ------------------------------------- |
| Review               | `src/content/reviews/` | `/<subcategory>/<file-name>-review/`  |
| Best-of buying guide | `src/content/guides/`  | `/best/<file-name>/`                  |
| Face-off (versus)    | `src/content/versus/`  | `/vs/<file-name>/`                    |
| How-to               | `src/content/howtos/`  | `/how-to/<file-name>/`                |
| News                 | `src/content/news/`    | `/news/<file-name>/`                  |
| Deal                 | `src/content/deals/`   | `/deals/<file-name>/`                 |
| Author               | `src/content/authors/` | `<file-name>.yaml`, used by `author:` |
| Brand                | `src/content/brands/`  | `<file-name>.yaml`, used by `brands:` |

The file name is the slug: lowercase words joined by hyphens, e.g. `northwind-aero-14.md`. Do not
add `-review` to review file names; the URL adds it. Images go in `src/assets/<type>/<slug>/` and
are referenced with a relative path such as `../../assets/reviews/northwind-aero-14/hero.jpg`.
Astro resizes them and serves AVIF/WebP.

## Start a new file

```sh
npm run new -- review "Northwind Aero 14" --topic ultrabooks
npm run new -- best "Best phones under 30000" --topic android-phones
npm run new -- versus "Nova 5G vs Orbit X2" --topic android-phones
npm run new -- howto "Check battery health" --topic windows
npm run new -- news "Northwind launches Aero 15" --topic ultrabooks
npm run new -- deal "Aero 14 price cut" --topic ultrabooks
npm run new -- author "Asha Rao"
npm run new -- brand "Northwind"
```

Add `--mdx` to get an `.mdx` file (for articles that use components inline) and `--author <id>` to
set the author. `--topic` takes a subcategory slug, or a category slug when the category has no
subcategories (`android-phones`, `iphones`, `phone-accessories`). See `src/config/taxonomy.ts` for
the full list.

The new file has every field, with `TODO` wherever you need to write something (prices and
ratings included) and `# check` comments on values that were filled with a default (topic,
author, brand). Articles start as `draft: true`, which the dev server shows and production
hides. **A file that still contains `TODO` cannot be published**: the build names the field in
the frontmatter (the placeholder hero image counts), and `npm run gates` (unit tests) catches a
`TODO` left in the body. Set `draft: false` only when everything is filled in. Authors and
brands have no draft mode: fill them in before the next build.

The scaffolder picks the first real author and brand it finds, or a sample one when none exist
yet. `npm run gates` fails if a published, non-sample article credits a sample author or brand.

## Rules the build and gates enforce

- `description`: 160 characters or fewer (it is the meta description).
- `heroAlt`: required; describe what is in the image.
- `hub`, `category`, `subcategory`: must be one leaf of `src/config/taxonomy.ts`. Leave
  `subcategory` out when the category has none.
- `rating` and every `score`: 0 to 5 in half steps (3, 3.5, 4 …).
- Prices are whole rupees (`74990`, not `₹74,990`).
- Retailer links: `name` is `amazon-in` or `flipkart`, the URL must be `https://` and on that
  retailer's own domain (`amazon.in`, `amzn.to`, `flipkart.com`). Add a retailer in
  `src/config/site.ts` first if you need another.
- Reviews: 3 to 6 pros and 3 to 6 cons, at least one spec and one retailer.
- Guides: `picks` in rank order 1, 2, 3 …
- Face-offs: at least three rounds; each `winner` is `a`, `b` or `tie`.
- How-tos: a step with an `image` needs `imageAlt`.
- Deals: `dealPrice` lower than `originalPrice`.
- `author`, `brands`, `product.brand`, `reviewRef` and `relatedReviews` must name files that
  exist. Astro only logs this as an error, so it is enforced by `npm run gates` (G1), not by
  `npm run build` alone.
- `updatedDate` cannot be before `publishDate`.

## Buying guides

Each pick needs `rank` (1, 2, 3 … in order), `label` ("Best overall"), `productName`, `tagline`,
`image` and `imageAlt`, `rating`, `price` and at least one pro and con. Add `summary` (why it is
on the list), `specs`, `scores`, `buyIf` / `dontBuyIf`, `bestFor` and `retailers` where you have
them, and `reviewRef` when the product has a review, so the guide links to it and the review
shows "Featured in". The compare table uses the spec labels the picks share, so use the same
labels (`Display`, `Weight` …) across picks. Write "How to choose" in the body; the template adds
the quick list, the picks, Compare, Also tested, How we test and the FAQ, so don't use those as
body headings.

## Face-offs

Fill `productA` and `productB` like guide picks (two different `productName`s), with
`retailers` so both get buy buttons. `specs` rows take `label`, `a`, `b` and `better` (`a`, `b` or
`tie`); the better cell is shaded and bold. Each round has a `winner` (`a`, `b` or `tie`) and the
page keeps the running score. `overallWinner` is your call: if it is not the side with more
rounds, the short answer says so instead of claiming a win. Add `shortAnswer` for the sentence
after the score ("Pick the Orbit if …"). The body is the introduction.

## How-tos

Set `difficulty`, `timeRequired`, optional `worksOn` ("Windows 10 and 11") and `quickAnswer`
(the whole answer in a sentence or two). `tools` becomes "What you need". Each step has a
`title` and `body`, and optionally an `image` (with `imageAlt`) and a `tip`. `troubleshooting`
entries (`q` problem, `a` fix) become "If it doesn't work". The body is the introduction.

## News

Add `keyFacts` (`label` and `value`, e.g. India price, on-sale date, launch offers),
`heroCredit` for press images ("Image: Kestrel"), an https `source`, and `relatedReviews` so the
story links to our reviews. Without a published review the page points to a buying guide on the
same topic.

## Deals

`originalPrice` is the usual price and `dealPrice` must be lower. `expiresAt: 2026-12-31` (a date, no time) runs to
midnight at the end of that day in India; add `expiresTime: '18:00'` (24-hour, IST) for a deal that
ends during the day. Ended deals show "Deal ended" for a week, then leave the deal
lists and their page turns noindex. `couponCode` takes capital letters, digits and hyphens.
`badge` is `lowest-price`, `great-value` or `editors-pick`; `reviewRef` adds our rating and a
review link. Update `updatedDate` whenever you re-check the price: cards show it as "Checked".

## Pasting a review from the TechSpotlight review-writer skill

The skill writes for several markets with scores out of 10. TechSpotlight is India-only with
ratings out of 5, so convert as you paste:

1. Run `npm run new -- review "<product>" --topic <leaf>` and open the new file.
2. Copy fields across:

   | Skill output                       | Site frontmatter                                                                                 |
   | ---------------------------------- | ------------------------------------------------------------------------------------------------ |
   | `title`                            | `title`                                                                                          |
   | `slug` (`brand-model-review`)      | the file name, without `-review`                                                                 |
   | `metaDescription`                  | `description`                                                                                    |
   | `category`                         | `--topic` (pick the matching leaf, e.g. `phones` → `android-phones` or `iphones`)                |
   | `score` (out of 10)                | `rating`: score ÷ 2, rounded to the nearest half (8.7 → 4.5, 7.4 → 3.5)                          |
   | Rating breakdown rows              | `scores`: each score ÷ 2 to the nearest half; put "vs <rival>" in `note`                         |
   | The Spotlight Verdict              | `verdict`                                                                                        |
   | Best for / Skip if                 | `cheatSheet.whoIsItFor` / `cheatSheet.dislikes`                                                  |
   | Pros / Cons                        | `pros` / `cons` (the site needs at least 3 cons; add one from the body)                          |
   | India rows of "Where to buy"       | `retailers` (`name`, `url`, `price`, `lastChecked`); drop other markets                          |
   | Specifications table               | `specs` (`label`, `value`; put "measured" values in `value`)                                     |
   | Key test results                   | `benchmarks` when there are numbers for rivals too, otherwise keep the table in the body         |
   | `youtubeVideoId` / `[YOUTUBE: id]` | `youtubeId`                                                                                      |
   | `heroImage` and its alt text       | `heroImage` (copy the file into `src/assets/reviews/<slug>/`) and `heroAlt`                      |
   | Other images                       | `gallery` (`src`, `alt`, `caption`)                                                              |
   | `testedDays`, `testingStatus`      | `testingNotes`, e.g. "Used for 14 days as my main phone"; write "Hands-on testing pending" if so |
   | Frequently asked questions         | `faq` (`q`, `a`)                                                                                 |
   | Buy it if / Don't buy it if        | `buyIf` / `dontBuyIf` (short lines; shown under "Should you buy …?")                             |
   | `publishedAt`                      | `publishDate`                                                                                    |
   | `reviewType: first look`           | not a review: use `npm run new -- news` instead (reviews need a rating)                          |

3. Paste the body from the first design or setup section onwards. Delete the parts the page
   template already renders from frontmatter: the H1, hero image, verdict, rating line, Best
   for/Skip if, disclosure, Where to buy, Pros, Cons, Rating breakdown, Specifications, FAQ,
   Final verdict (its who-should-buy lines go in `buyIf` / `dontBuyIf`) and the final "Check the
   latest price" link. The build stops if a body heading would clash with a section the template
   adds (Verdict, Cheat sheet, Specs, Scores, Benchmarks, Photos, Video, Final verdict, Prices,
   FAQ).
4. Delete every `[INJECT_ADSENSE_SLOT]` line; the review template places ad slots itself.
   Replace `[IMAGE NEEDED: …]` with a real image or remove it.
5. Fix internal links to the site's URL shapes (table above), e.g. `/reviews/northwind-aero-14`
   becomes `/ultrabooks/northwind-aero-14-review/`.
6. Use `## The ups` and `## The downs` headings for the closing pros and cons discussion; the
   jump bar links to them when they exist. The first four `gallery` images show on the page, the
   rest open in the lightbox.
7. Run `npm run dev`, check the page, then set `draft: false`.

## Sample content

Files with `sample: true` (fictional brands Northwind, Kestrel and Orbit, authors Asha Testwell
and Rohan Placeholder) exist so every template has something to show. Build with
`PUBLIC_HIDE_SAMPLES=true` (set it in Cloudflare Pages for production) to leave them out, and
delete them once real content covers each template. The placeholder images come from
`npm run images:samples`.

## Reading content in code

Use `getPublished(collection)` and `getPublishedEntry(collection, id)` from `src/lib/content.ts`
rather than `getCollection()`. They drop drafts in production and samples when
`PUBLIC_HIDE_SAMPLES=true`.
