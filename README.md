# TechSpotlight

Independent tech reviews and buying advice for India, built with Astro and Tailwind CSS.

## Getting started

Requires Node 22.12 or newer (`.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run gates      # every automated quality gate
```

See [CLAUDE.md](CLAUDE.md) for architecture, the quality gates and the branch workflow, and [CONTENT-GUIDE.md](CONTENT-GUIDE.md) for writing articles.

## Deploying to Cloudflare Pages

The site is fully static: Cloudflare builds it from GitHub on every push and serves `dist/`.

### 1. Create the Pages project (one time)

1. In the Cloudflare dashboard open **Workers & Pages → Create application → Pages → Connect to Git** and pick this repository.
2. Build settings:

   | Setting                | Value                                                    |
   | ---------------------- | -------------------------------------------------------- |
   | Production branch      | `main`                                                   |
   | Framework preset       | Astro                                                    |
   | Build command          | `npm run build`                                          |
   | Build output directory | `dist`                                                   |
   | Node.js version        | from `.nvmrc` (22.12); no `NODE_VERSION` variable needed |

3. Environment variables (**Settings → Environment variables**):

   | Variable              | Production | Preview                                                  |
   | --------------------- | ---------- | -------------------------------------------------------- |
   | `PUBLIC_HIDE_SAMPLES` | `true`     | leave unset, so branch previews keep the sample articles |

   Nothing else is an environment variable. Public settings (site URL, AdSense ids, affiliate tags, analytics token, contact email, newsletter endpoint) live in `src/config/site.ts` and ship with the code. There are no secrets to configure.

4. Name the project `techspotlight` so production is `https://techspotlight.pages.dev`, the `site.url` the build uses for canonical URLs, the sitemap and feeds. A different name means changing `site.url` first.

Every push to `main` then deploys to production; every other branch and pull request gets a preview URL. `public/_headers` adds security headers, and long caching for `/_astro/*`; Cloudflare itself sends `noindex` on preview URLs. Cloudflare serves `dist/404.html` for unknown paths.

CI (`.github/workflows/gates.yml`) runs every gate on the sample build and, in the `launch-build` job, builds exactly what production gets (`PUBLIC_HIDE_SAMPLES=true`) and checks it has no sample content.

### 2. Custom domain (optional)

1. Buy the domain (Cloudflare Registrar is simplest; otherwise point the domain's nameservers at Cloudflare).
2. In the Pages project open **Custom domains → Set up a custom domain** and enter it (add both `example.in` and `www.example.in`; redirect one to the other with a Cloudflare redirect rule). HTTPS is automatic.
3. Change `url` in `src/config/site.ts` to `https://<your domain>` and push. Canonicals, the sitemap, feeds, `robots.txt` and Open Graph tags all follow it.
4. Send the old address to the new one, so search engines merge the two: in Cloudflare add a **Bulk Redirect** from `techspotlight.pages.dev` to `https://<your domain>` (301, preserving path and query). If you skip the redirect, at least keep the old address out of search by adding this to `public/_headers`:

   ```
   https://techspotlight.pages.dev/*
     X-Robots-Tag: noindex
   ```

### 3. Search engines

1. Google Search Console: **Add property**.
   - With a custom domain on Cloudflare: **Domain** property, verified with the DNS TXT record (Cloudflare can add it for you).
   - On `techspotlight.pages.dev` (you don't control its DNS): **URL prefix** `https://techspotlight.pages.dev/`, verified with the **HTML file** method. Put the `google….html` file Google gives you in `public/`, push, wait for the deploy, then press Verify. Keep the file afterwards.
2. **Sitemaps → Add** `sitemap-index.xml`. It lists only indexable first pages and updates on every deploy.
3. Bing Webmaster Tools: **Import from Google Search Console**.
4. Spot-check a review, a guide and a deal in Google's Rich Results Test.

### 4. Turning on ads, analytics and the rest

Edit `src/config/site.ts`, open a pull request and merge once the gates pass:

- `ads.publisherId` (`ca-pub-…`) and the unit ids in `ads.units`, after AdSense approves the site. `/ads.txt` follows the publisher id. Re-run `npm run gates:audit` with ads live and check CLS stays ≤ 0.05.
- `analytics.cloudflareToken`: from **Cloudflare dashboard → Analytics & Logs → Web Analytics → Add a site**. (Or turn on the automatic setup for the Pages project instead and leave the token empty.)
- `contactEmail`, `newsletterEndpoint`, and the retailer affiliate tags (`retailers[].affiliateParam.value`).

## Launch checklist

Production hides every `sample: true` entry, so the live site shows only real articles, authors and brands. Before the first production deploy:

- [ ] At least one real author file in `src/content/authors/` (both current authors are samples), and real articles in each live hub (Computing, Phones). Hubs and listings without articles stay noindex until they have some.
- [ ] Each article has a title, description, hero image with alt text, author and topics; `npm run gates` passes.
- [ ] `src/config/site.ts`: `contactEmail` set (shown on /contact/), affiliate tags filled in, `newsletterEndpoint` set or the form left as "not wired up yet".
- [ ] Trust pages read through (about, how we test, review policy, affiliate disclosure, privacy, terms, contact); `legal.updated` bumped if anything changed.
- [ ] Cloudflare Pages project created as above, with `PUBLIC_HIDE_SAMPLES=true` on Production only; the `launch-build` CI job is green.
- [ ] After the first deploy: open the live site on a phone and a laptop, check `/robots.txt`, `/sitemap-index.xml`, `/rss.xml` and a 404, and run Lighthouse on the home page and one review.
- [ ] Search Console property verified and the sitemap submitted; Rich Results Test on a review and a guide.
- [ ] Web Analytics on (token in `site.ts` or the Pages project's automatic setup).
- [ ] Later, once AdSense approves the site: publisher and unit ids in `site.ts`, `/ads.txt` live, `npm run gates:audit` re-run with ads to confirm CLS ≤ 0.05.
