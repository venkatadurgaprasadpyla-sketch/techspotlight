/**
 * Deals island. Without JS the deal pages are complete: every card shows, the filters and copy
 * buttons are hidden (`data-needs-js`) and coupon codes are plain text to select.
 * - Labels deals that ended after the last build (cards and the deal page carry data-ends).
 * - Copy buttons for coupon codes.
 * - Filters and sorting on deal listings: checkboxes are OR within a group, AND across groups.
 */
type Card = HTMLElement;

export function markEnded(root: ParentNode = document, now = Date.now()) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-ends]')) {
    const ends = Date.parse(el.dataset.ends ?? '');
    if (!Number.isNaN(ends) && now >= ends) el.setAttribute('data-ended', '');
  }
}

function initCopy(root: ParentNode) {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    const status = button.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
    button.addEventListener('click', () => {
      const code = button.dataset.copy ?? '';
      navigator.clipboard.writeText(code).then(
        () => {
          if (status) status.textContent = `Copied ${code}`;
        },
        () => {
          if (status) status.textContent = 'Copy failed; select the code instead';
        },
      );
    });
  }
}

const matches: Record<string, (card: Card, value: string) => boolean> = {
  store: (card, value) => card.dataset.store === value,
  off: (card, value) =>
    value === 'lowest' ? card.dataset.lowest !== undefined : Number(card.dataset.off) >= +value,
  budget: (card, value) => {
    const [min = 0, max = Infinity] = value.split('-').map((n) => (n ? Number(n) : Infinity));
    const price = Number(card.dataset.price);
    return price >= min && price <= max;
  },
  rated: (card, value) => Number(card.dataset.rating) >= +value,
};

const ended = (card: Card) => Number(card.hasAttribute('data-ended'));
const sorters: Record<string, (a: Card, b: Card) => number> = {
  off: (a, b) => Number(b.dataset.off) - Number(a.dataset.off),
  price: (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
  newest: (a, b) => Date.parse(b.dataset.date ?? '') - Date.parse(a.dataset.date ?? ''),
};
// Ended deals always sort after live ones, as on the server-rendered page.
const endedLast = (order?: (a: Card, b: Card) => number) => (a: Card, b: Card) =>
  ended(a) - ended(b) || (order ? order(a, b) : 0);

function initFilters(root: ParentNode) {
  const form = root.querySelector<HTMLFormElement>('[data-deal-filters]');
  const grid = root.querySelector<HTMLElement>('[data-deal-grid]');
  const sort = root.querySelector<HTMLSelectElement>('[data-deal-sort]');
  const count = root.querySelector<HTMLElement>('[data-deal-count]');
  const empty = root.querySelector<HTMLElement>('[data-deal-empty]');
  if (!form || !grid) return;
  const cards = [...grid.querySelectorAll<Card>('[data-deal]')];
  const ad = grid.querySelector<HTMLElement>('[data-ad-slot]');

  const apply = () => {
    const chosen = new Map<string, string[]>();
    for (const input of form.querySelectorAll<HTMLInputElement>('input:checked')) {
      chosen.set(input.name, [...(chosen.get(input.name) ?? []), input.value]);
    }
    const sorted = [...cards].sort(endedLast(sorters[sort?.value ?? '']));
    let shown = 0;
    let shownEnded = 0;
    for (const card of sorted) {
      const visible = [...chosen].every(([name, values]) =>
        values.some((value) => matches[name]?.(card, value) ?? true),
      );
      card.hidden = !visible;
      grid.append(card);
      if (visible) shown += 1;
      if (visible && ended(card)) shownEnded += 1;
      // Keep the ad after the fourth visible deal, as in the server-rendered grid.
      if (ad && visible && shown === 4) grid.append(ad);
    }
    if (ad && shown < 4) grid.append(ad);
    const endedNote = shownEnded ? ` (${shownEnded} ended)` : '';
    if (count) count.textContent = `${shown} ${shown === 1 ? 'deal' : 'deals'}${endedNote}`;
    if (empty) empty.hidden = shown > 0;
  };
  if (cards.some(ended)) apply();
  form.addEventListener('change', apply);
  form.addEventListener('reset', () => setTimeout(apply));
  sort?.addEventListener('change', apply);
}

export function initDeals(root: ParentNode = document) {
  markEnded(root);
  initCopy(root);
  initFilters(root);
}
