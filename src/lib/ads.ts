/**
 * Ads and consent: which placements exist, whether AdSense is configured, and the files and
 * attributes derived from src/config/site.ts. Pure, so unit tested; the loader is the island
 * src/scripts/ads.ts.
 */
import { site } from '~/config/site';

export type AdPlacement = keyof typeof site.ads.units;

type AdsConfig = { publisherId: string; units: Record<string, string> };

const PUBLISHER = /^ca-pub-\d{10,20}$/;

/** AdSense is live once a well-formed publisher id is configured. */
export const adsEnabled = (ads: AdsConfig = site.ads) => PUBLISHER.test(ads.publisherId);

/** Visitors are asked for cookie consent only when something on the site sets cookies. */
export const consentNeeded = (ads: AdsConfig = site.ads) => adsEnabled(ads);

/** What the ads island needs, as a data attribute on <body>; undefined when ads are off. */
export function adsClientConfig(ads: AdsConfig = site.ads): string | undefined {
  if (!adsEnabled(ads)) return undefined;
  const units = Object.fromEntries(Object.entries(ads.units).filter(([, id]) => /^\d+$/.test(id)));
  return JSON.stringify({ client: ads.publisherId, units });
}

/**
 * /ads.txt: authorises Google to sell our inventory. Without a publisher id it holds only a
 * comment, which ad networks read as "no authorised sellers".
 */
export function adsTxt(ads: AdsConfig = site.ads): string {
  if (!adsEnabled(ads)) return '# No ad sellers authorised yet.\n';
  const pub = ads.publisherId.replace(/^ca-/, '');
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
}
