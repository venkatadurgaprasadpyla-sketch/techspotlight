/**
 * Search page island. Queries the static Pagefind index (built after `astro build`, see
 * src/integrations/pagefind.ts) and renders the Search board: best match, products we have
 * reviewed, then other articles with "Load more". The query lives in ?q= so results can be
 * shared; the type and hub chips narrow it. Without JS the page shows popular links instead.
 */
interface Result {
  url: string;
  excerpt: string;
  meta: Record<string, string | undefined>;
}
interface Search {
  results: { data: () => Promise<Result> }[];
  unfilteredResultCount: number;
}
interface Pagefind {
  search: (query: string, options?: object) => Promise<Search | null>;
}

const MORE = 8;
const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', ...kids: (Node | string)[]) {
  const node = document.createElement(tag);
  node.className = cls;
  node.append(...kids);
  return node;
}

/** Pagefind excerpts are HTML with <mark> around matches; keep the text and the marks only. */
function excerpt(html: string) {
  const parsed = document.createElement('template');
  parsed.innerHTML = html;
  return [...parsed.content.childNodes].map((n) =>
    n.nodeName === 'MARK' ? el('mark', '', n.textContent ?? '') : (n.textContent ?? ''),
  );
}

/** Result thumbnail; `lead` is the best match's, the largest image on the results page. */
function image(r: Result, cls: string, lead = false) {
  const img = el('img', cls);
  img.src = r.meta.image ?? '';
  img.alt = '';
  img.width = 320;
  img.height = 180;
  img.decoding = 'async';
  if (lead) img.fetchPriority = 'high';
  else img.loading = 'lazy';
  return img;
}

function link(r: Result, cls = '') {
  const a = el('a', `text-text no-underline after:absolute after:inset-0 hover:underline ${cls}`);
  a.href = r.url;
  a.textContent = r.meta.title ?? r.url;
  return a;
}

function kicker(r: Result) {
  const date = r.meta.date ? dateFormat.format(new Date(r.meta.date)) : '';
  return el('span', 'text-[13px] text-muted', [r.meta.label, date].filter(Boolean).join(' · '));
}

function stars(rating: number) {
  const s = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
  return el('span', 'text-[13px]', el('span', 'text-rating tracking-[1px]', s), ` ${rating}/5`);
}

function articleRow(r: Result) {
  return el(
    'li',
    'relative flex flex-wrap gap-4 border-b border-border py-5',
    image(r, 'aspect-video w-32 flex-none rounded-md object-cover sm:w-40'),
    el(
      'div',
      'flex min-w-[min(100%,240px)] flex-1 flex-col gap-1',
      kicker(r),
      el('h3', 'text-[17px]', link(r)),
      el('p', 'text-[14px] text-muted', ...excerpt(r.excerpt)),
    ),
  );
}

function productCard(r: Result) {
  const rating = Number(r.meta.rating);
  const price = Number(r.meta.price);
  const product = link(r, 'font-semibold');
  product.textContent = r.meta.product ?? product.textContent;
  return el(
    'li',
    'relative flex flex-col gap-2 rounded-[10px] border border-border p-4',
    image(r, 'aspect-[4/3] w-full rounded-md object-cover'),
    product,
    rating ? stars(rating) : '',
    price ? el('span', 'font-mono text-[14px]', `From ${inr.format(price)}`) : '',
  );
}

function bestMatch(r: Result) {
  return el(
    'div',
    'relative flex flex-wrap items-start gap-4',
    image(r, 'aspect-video w-full flex-none rounded-md object-cover sm:w-[200px]', true),
    el(
      'div',
      'flex min-w-[min(100%,260px)] flex-1 flex-col gap-1.5',
      kicker(r),
      el('h3', 'text-2xl', link(r)),
      el('p', 'text-muted', ...excerpt(r.excerpt)),
    ),
  );
}

export function initSearch(root: ParentNode = document) {
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const form = $<HTMLFormElement>('[data-search-form]');
  const input = form?.querySelector<HTMLInputElement>('input[name="q"]');
  const status = $<HTMLElement>('[data-search-status]');
  const best = $<HTMLElement>('[data-search-best]');
  const products = $<HTMLElement>('[data-search-products]');
  const articles = $<HTMLElement>('[data-search-articles]');
  const more = $<HTMLButtonElement>('[data-search-more]');
  const empty = $<HTMLElement>('[data-search-empty]');
  const emptyTitle = $<HTMLElement>('[data-search-empty-title]');
  const emptyText = $<HTMLElement>('[data-search-empty-text]');
  const intro = [emptyTitle?.textContent ?? '', emptyText?.textContent ?? ''];
  const setEmpty = (query: string) => {
    if (emptyTitle) emptyTitle.textContent = query ? `No results for “${query}”` : (intro[0] ?? '');
    if (emptyText)
      emptyText.textContent = query
        ? 'Check the spelling or try a broader term. Popular right now:'
        : (intro[1] ?? '');
  };
  const total = $<HTMLElement>('[data-search-total]');
  if (!form || !input || !status || !best || !products || !articles || !more || !empty) return;
  const slot = (section: HTMLElement) => section.querySelector('[data-slot]') ?? section;
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const chosen: Record<string, string> = {};
  let pagefind: Promise<Pagefind> | undefined;
  let rest: Search['results'] = [];
  let run = 0;

  const show = (section: HTMLElement, on: boolean) => (section.hidden = !on);
  const clear = () => [best, products, articles].forEach((s) => slot(s).replaceChildren());

  let found = 0;
  const say = (shown: number, query: string) => {
    status.textContent =
      shown < found
        ? `Showing ${shown} of ${found} results for “${query}”`
        : `${found} ${found === 1 ? 'result' : 'results'} for “${query}”`;
  };

  const showMore = async () => {
    const mine = run;
    more.disabled = true;
    try {
      const batch = await Promise.all(rest.splice(0, MORE).map((r) => r.data()));
      if (mine !== run) return;
      const rows = batch.map(articleRow);
      slot(articles).append(...rows);
      say(found - rest.length, input.value.trim());
      more.hidden = rest.length === 0;
      // The button may have just been hidden: move focus to the first new result.
      rows[0]?.querySelector('a')?.focus();
    } catch {
      if (mine === run) status.textContent = 'Could not load more results. Please try again.';
    } finally {
      more.disabled = false;
    }
  };

  const search = async () => {
    const query = input.value.trim();
    const mine = ++run;
    const url = new URL(location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    if (!query) {
      clear();
      [best, products, articles].forEach((s) => show(s, false));
      show(empty, true);
      setEmpty('');
      status.textContent = '';
      if (total) total.textContent = '';
      return;
    }
    status.textContent = 'Searching…';
    try {
      // A runtime URL, not a module Vite can bundle: the index is written after the build.
      // A failed load is forgotten so the next search retries it.
      const src = '/pagefind/pagefind.js';
      pagefind ??= (import(/* @vite-ignore */ src) as Promise<Pagefind>).catch((error: unknown) => {
        pagefind = undefined;
        throw error;
      });
      const filters = Object.fromEntries(Object.entries(chosen).filter(([, v]) => v));
      const result = await (await pagefind).search(query, { filters });
      if (mine !== run) return;
      if (!result) {
        status.textContent = '';
        return;
      }
      const results = await Promise.all(result.results.slice(0, 12).map((r) => r.data()));
      if (mine !== run) return;
      clear();
      const all = result.unfilteredResultCount;
      if (total) total.textContent = `\u00a0(${all})`;
      found = result.results.length;
      show(empty, found === 0);
      setEmpty(query);
      if (found === 0 && all > 0) {
        if (emptyTitle) emptyTitle.textContent = 'No results with these filters';
        if (emptyText)
          emptyText.textContent = `Choose All and clear the hub to see all ${all} results for “${query}”.`;
      }
      const [top, ...others] = results;
      show(best, top !== undefined);
      if (top) slot(best).append(bestMatch(top));
      const rated = others.filter((r) => r.meta.rating).slice(0, 3);
      show(products, rated.length > 0);
      slot(products).append(...rated.map(productCard));
      const listed = others.filter((r) => !rated.includes(r));
      show(articles, listed.length > 0 || found > 12);
      slot(articles).append(...listed.slice(0, MORE).map(articleRow));
      // Only the first 12 results are loaded up front; "Load more" fetches the rest.
      rest = [
        ...listed.slice(MORE).map((r) => ({ data: () => Promise.resolve(r) })),
        ...result.results.slice(12),
      ];
      more.hidden = rest.length === 0;
      say(found - rest.length, query);
    } catch {
      if (mine === run) status.textContent = 'Search is not available right now. Please try again.';
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void search();
  });
  more.addEventListener('click', () => void showMore());
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const key = chip.dataset.filter ?? '';
      const value = chip.dataset.value ?? '';
      chosen[key] = chosen[key] === value ? '' : value;
      for (const other of chips.filter((c) => c.dataset.filter === key)) {
        other.setAttribute('aria-pressed', String((chosen[key] ?? '') === other.dataset.value));
      }
      void search();
    });
  }
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  if (input.value) void search();
}
