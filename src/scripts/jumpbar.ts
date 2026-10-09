/**
 * Review jump bar: marks the chip of the section in view (aria-current="location") and shows
 * the lowest-price buttons once the verdict box has scrolled away. The price buttons stay out
 * of the accessibility tree until shown; the same links sit in the verdict and price sections.
 */
export function initJumpBar(root: Document = document) {
  const bar = root.querySelector<HTMLElement>('[data-jumpbar]');
  if (!bar) return;
  const chips = new Map<string, HTMLAnchorElement>();
  for (const chip of bar.querySelectorAll<HTMLAnchorElement>('[data-jump]')) {
    chips.set(chip.dataset.jump ?? '', chip);
  }
  const sections = [...chips.keys()]
    .map((id) => root.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);

  const visible = new Set<string>();
  let current: HTMLAnchorElement | undefined;
  const mark = () => {
    const first = sections.find((s) => visible.has(s.id));
    const chip = first && chips.get(first.id);
    if (!chip || chip === current) return;
    current?.removeAttribute('aria-current');
    current?.classList.remove('is-on');
    chip.setAttribute('aria-current', 'location');
    chip.classList.add('is-on');
    chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    current = chip;
  };
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      }
      mark();
    },
    { rootMargin: '-80px 0px -55% 0px' },
  );
  for (const s of sections) sectionObserver.observe(s);

  const verdict = root.querySelector('[data-verdict]');
  const prices = [...root.querySelectorAll<HTMLElement>('[data-jump-price], [data-jump-mobile]')];
  if (!verdict || prices.length === 0) return;
  const show = (on: boolean) => {
    for (const el of prices) {
      el.toggleAttribute('data-shown', on);
      el.setAttribute('aria-hidden', String(!on));
      const links = el.matches('a') ? [el] : [...el.querySelectorAll('a')];
      for (const link of links) {
        if (on) link.removeAttribute('tabindex');
        else link.setAttribute('tabindex', '-1');
      }
    }
  };
  new IntersectionObserver(([entry]) => {
    if (entry) show(!entry.isIntersecting && entry.boundingClientRect.top < 0);
  }).observe(verdict);
}
