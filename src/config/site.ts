/** Public site configuration. Secrets never go here; see CLAUDE.md. */

export interface Retailer {
  /** Stable id used in content frontmatter, e.g. `amazon-in`. */
  id: string;
  name: string;
  /** Hostnames this retailer's links may use; the affiliate helper rejects others. */
  hosts: string[];
  /** Query parameter and value appended to outbound links (empty value = none yet). */
  affiliateParam?: { name: string; value: string };
  /** Short store name on buttons: "Check price on <buttonName>". */
  buttonName: string;
  /** Which visitors see this store's buttons: India (`in`) or the UAE (`ae`). */
  region: Region;
  /** Prices for this store are in this currency. */
  currency: 'INR' | 'AED';
  /** False for Amazon: its prices change too often to print, so it shows "Check latest price". */
  showPrice: boolean;
}

/** Visitor regions. India is the default; UAE visitors are detected in BaseHead. */
export type Region = 'in' | 'ae';

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
      buttonName: 'Amazon',
      hosts: ['www.amazon.in', 'amazon.in', 'amzn.to', 'amzn.in'],
      affiliateParam: { name: 'tag', value: '' },
      region: 'in',
      currency: 'INR',
      showPrice: false,
    },
    {
      id: 'flipkart',
      name: 'Flipkart',
      buttonName: 'Flipkart',
      hosts: ['www.flipkart.com', 'flipkart.com', 'dl.flipkart.com', 'fkrt.it'],
      affiliateParam: { name: 'affid', value: '' },
      region: 'in',
      currency: 'INR',
      showPrice: true,
    },
    {
      id: 'croma',
      name: 'Croma',
      buttonName: 'Croma',
      hosts: ['www.croma.com', 'croma.com'],
      region: 'in',
      currency: 'INR',
      showPrice: true,
    },
    {
      id: 'reliance-digital',
      name: 'Reliance Digital',
      buttonName: 'Reliance Digital',
      hosts: ['www.reliancedigital.in', 'reliancedigital.in'],
      region: 'in',
      currency: 'INR',
      showPrice: true,
    },
    {
      id: 'amazon-ae',
      name: 'Amazon.ae',
      buttonName: 'Amazon.ae',
      hosts: ['www.amazon.ae', 'amazon.ae', 'amzn.to', 'amzn.eu'],
      affiliateParam: { name: 'tag', value: '' },
      region: 'ae',
      currency: 'AED',
      showPrice: false,
    },
    {
      id: 'noon',
      name: 'noon',
      buttonName: 'noon',
      hosts: ['www.noon.com', 'noon.com'],
      region: 'ae',
      currency: 'AED',
      showPrice: true,
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
