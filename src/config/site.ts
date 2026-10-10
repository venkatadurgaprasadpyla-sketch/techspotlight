/** Public site configuration. Secrets never go here; see CLAUDE.md. */

export interface Retailer {
  /** Stable id used in content frontmatter, e.g. `amazon-in`. */
  id: string;
  name: string;
  /** Hostnames this retailer's links may use; the affiliate helper rejects others. */
  hosts: string[];
  /** Query parameter and value appended to outbound links (empty value = none yet). */
  affiliateParam?: { name: string; value: string };
}

export const site = {
  name: 'TechSpotlight',
  tagline: 'Independent, hands-on tech reviews for India',
  description:
    'Independent, hands-on tech reviews and buying advice for India, with prices in rupees.',
  url: 'https://techspotlight.pages.dev',
  locale: 'en-IN',
  currency: 'INR',
  social: [] as { label: string; href: string }[],
  retailers: [
    {
      id: 'amazon-in',
      name: 'Amazon.in',
      hosts: ['www.amazon.in', 'amazon.in', 'amzn.to'],
      affiliateParam: { name: 'tag', value: '' },
    },
    {
      id: 'flipkart',
      name: 'Flipkart',
      hosts: ['www.flipkart.com', 'flipkart.com', 'dl.flipkart.com'],
      affiliateParam: { name: 'affid', value: '' },
    },
  ] satisfies readonly Retailer[],
  /**
   * Google AdSense. Ads load only when `publisherId` (ca-pub-…) is set, the visitor accepts
   * cookies, and the placement has an ad unit id. Until then every slot shows its reserved,
   * labelled placeholder, so layouts (and CLS) are the same with or without ads.
   */
  ads: {
    publisherId: '',
    /** AdSense ad unit ids (data-ad-slot) per placement; see src/components/AdSlot.astro. */
    units: {
      leaderboard: '',
      sidebar: '',
      'in-feed': '',
      skyscraper: '',
      'in-article': '',
      'sticky-mobile': '',
    },
  },
  /** Where the newsletter form posts. Empty means the form shows but is not wired up yet. */
  newsletterEndpoint: '',
  /** Cloudflare Web Analytics beacon token. Empty = no analytics script. It sets no cookies. */
  analytics: { cloudflareToken: '' },
  /** Public inbox for tips, corrections and press; shown on /contact/. Empty until set up. */
  contactEmail: '',
  /** Legal entity and governing law for /terms/ and /privacy/. */
  legal: { owner: 'TechSpotlight', jurisdiction: 'India', updated: '2026-10-10' },
} as const;

export type SiteConfig = typeof site;
