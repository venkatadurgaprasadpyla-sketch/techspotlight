import { site, type Region } from '~/config/site';

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

/** Button text for a store, e.g. "Check price on Amazon". */
export function priceButtonLabel(retailerId: string): string {
  return `Check price on ${getRetailer(retailerId)?.buttonName ?? retailerId}`;
}

/** True when a store's price may be printed on the page (never for Amazon). */
export function showsPrice(retailerId: string): boolean {
  return getRetailer(retailerId)?.showPrice ?? true;
}

/** True for stores whose printed price is in rupees (cards and "lowest price" quote these). */
export function showsInrPrice(retailerId: string): boolean {
  const retailer = getRetailer(retailerId);
  return !retailer || (retailer.showPrice && retailer.currency === 'INR');
}

/**
 * Region for a lone store button (a "lowest price" link): Flipkart does not sell to the UAE, so
 * its button is India-only; any other store is shown to everyone.
 */
export function soloOfferRegion(retailerId: string): Region | undefined {
  return retailerId === 'flipkart' ? 'in' : undefined;
}

/**
 * Who sees each offer: `in` (India visitors only), `ae` (UAE visitors only) or `all`.
 * UAE visitors see the UAE stores; when there are none they see the India stores instead,
 * except Flipkart, which does not sell to the UAE.
 */
export function offerRegions<T extends { name: string }>(offers: readonly T[]): (Region | 'all')[] {
  const regionOf = (o: T) => getRetailer(o.name)?.region ?? 'in';
  const hasUae = offers.some((o) => regionOf(o) === 'ae');
  return offers.map((o) => {
    if (regionOf(o) === 'ae') return 'ae';
    if (hasUae || o.name === 'flipkart') return 'in';
    return 'all';
  });
}

/**
 * The cheapest rupee price, if any offer has one. Offers from stores that never show a price
 * (Amazon) and offers in other currencies are left out, so "From ₹…" never quotes them.
 */
export function lowestOffer<T extends { price?: number | undefined; name?: string }>(
  offers: readonly T[],
) {
  return offers
    .filter((o): o is T & { price: number } => typeof o.price === 'number' && o.price > 0)
    .filter((o) => !o.name || showsInrPrice(o.name))
    .reduce<(T & { price: number }) | undefined>(
      (best, o) => (!best || o.price < best.price ? o : best),
      undefined,
    );
}

/**
 * The one store button to show where a page has room for one (review "At a glance", the jump
 * bar): the cheapest rupee price for India visitors and a UAE store (or the cheapest India store
 * that is not Flipkart) for UAE visitors. One entry with no region when both are the same offer.
 */
export function headlineOffers<T extends { name: string; price?: number | undefined }>(
  offers: readonly T[],
): { offer: T; region?: Region }[] {
  const regions = offerRegions(offers);
  const pick = (visible: (region: Region | 'all') => boolean) => {
    const candidates = offers.filter((_, i) => visible(regions[i] ?? 'in'));
    // One region's stores share a currency, so their shown prices compare directly.
    const priced = candidates.filter((o) => o.price && showsPrice(o.name));
    return priced.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0] ?? candidates[0];
  };
  const india = pick((r) => r !== 'ae');
  const uae = pick((r) => r !== 'in');
  if (india && india === uae) return [{ offer: india }];
  return [
    ...(india ? [{ offer: india, region: 'in' as const }] : []),
    ...(uae ? [{ offer: uae, region: 'ae' as const }] : []),
  ];
}
