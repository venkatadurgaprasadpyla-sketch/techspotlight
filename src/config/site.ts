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
  /** Google AdSense publisher id (ca-pub-…); empty until approved. */
  adsensePublisherId: '',
  /** Where the newsletter form posts. Empty means the form shows but is not wired up yet. */
  newsletterEndpoint: '',
  analytics: { cloudflareToken: '' },
} as const;

export type SiteConfig = typeof site;
