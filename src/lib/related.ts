/** "More like this" lists. Pure, unit tested. */
interface Placed {
  url: string;
  hub: string;
  category: string;
}

/**
 * Up to `limit` items other than `current`, closest topic first: same category, then same hub,
 * then anything else. Within a group the input order (usually newest first) is kept.
 */
export function closestTo<T extends Placed>(
  current: Placed,
  items: readonly T[],
  limit: number,
): T[] {
  const closeness = (item: Placed) =>
    Number(item.category === current.category) * 2 + Number(item.hub === current.hub);
  return items
    .filter((item) => item.url !== current.url)
    .map((item, index) => ({ item, index, score: closeness(item) }))
    .sort((x, y) => y.score - x.score || x.index - y.index)
    .slice(0, limit)
    .map(({ item }) => item);
}
