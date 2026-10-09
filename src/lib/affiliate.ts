import { site } from '~/config/site';

/** `rel` for every outbound retailer link (Google's guidance for paid links). */
export const AFFILIATE_REL = 'sponsored nofollow noopener';

export function getRetailer(id: string) {
  return site.retailers.find((r) => r.id === id);
}

/** The retailer URL with the site's affiliate parameter added, when one is configured. */
export function affiliateHref(retailerId: string, url: string): string {
  const param = getRetailer(retailerId)?.affiliateParam;
  if (!param?.value) return url;
  const href = new URL(url);
  href.searchParams.set(param.name, param.value);
  return href.toString();
}

/** The cheapest priced offer, if any has a price. */
export function lowestOffer<T extends { price?: number | undefined }>(offers: readonly T[]) {
  return offers
    .filter((o): o is T & { price: number } => typeof o.price === 'number' && o.price > 0)
    .reduce<(T & { price: number }) | undefined>(
      (best, o) => (!best || o.price < best.price ? o : best),
      undefined,
    );
}
