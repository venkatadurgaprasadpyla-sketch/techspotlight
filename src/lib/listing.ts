/** Pagination for listing pages. Page 1 lives at the base path, page n at `<base>page/<n>/`. */
export const PAGE_SIZE = 12;

export const pageHref = (base: string, page: number) => (page <= 1 ? base : `${base}page/${page}/`);

export interface Page<T> {
  /** 1-based. */
  current: number;
  total: number;
  items: T[];
  /** Index of the first item on this page across the whole list (0-based). */
  start: number;
  count: number;
  href: string;
  prev?: string;
  next?: string;
}

/** Every page of a listing. An empty list still has one (empty) page. */
export function paginate<T>(items: readonly T[], base: string, size = PAGE_SIZE): Page<T>[] {
  const total = Math.max(1, Math.ceil(items.length / size));
  return Array.from({ length: total }, (_, i) => {
    const current = i + 1;
    return {
      current,
      total,
      items: items.slice(i * size, current * size),
      start: i * size,
      count: items.length,
      href: pageHref(base, current),
      ...(current > 1 && { prev: pageHref(base, current - 1) }),
      ...(current < total && { next: pageHref(base, current + 1) }),
    };
  });
}

/**
 * Page numbers to show: always the first and last, the current page and one either side,
 * with 'gap' where numbers are skipped. 1 … 4 5 6 … 9
 */
export function pageWindow(current: number, total: number): (number | 'gap')[] {
  const shown = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  return shown.flatMap((n, i) => {
    const prev = shown[i - 1];
    if (prev === undefined || n === prev + 1) return [n];
    // Showing the single missing number takes no more room than an ellipsis.
    return n === prev + 2 ? [prev + 1, n] : ['gap' as const, n];
  });
}
