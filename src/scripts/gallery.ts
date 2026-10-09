/**
 * Review gallery lightbox. Thumbnails are links to the full images; with JS they open a native
 * <dialog> (focus trap, Escape, inert page) with previous/next buttons and arrow keys.
 */
export function initGallery(root: Document = document) {
  const dialog = root.querySelector<HTMLDialogElement>('[data-lightbox]');
  const items = [...root.querySelectorAll<HTMLAnchorElement>('[data-gallery-item]')];
  if (!dialog || items.length === 0) return;
  const img = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]');
  const count = dialog.querySelector<HTMLElement>('[data-lightbox-count]');
  if (!img || !caption || !count) return;
  // Collapse photos after the fourth into the "+n" tile; they stay reachable in the lightbox.
  root.querySelector<HTMLElement>('[data-gallery]')?.setAttribute('data-js', '');
  let index = 0;
  let opener: HTMLElement | undefined;

  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const item = items[index];
    if (!item) return;
    img.src = item.href;
    img.alt = item.dataset.alt ?? '';
    caption.textContent = item.dataset.caption ?? '';
    count.textContent = `Photo ${index + 1} of ${items.length}`;
  };
  items.forEach((item, i) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      opener = item;
      show(i);
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'ArrowRight') show(index + 1);
  });
  // Clicking the backdrop (the dialog element itself, outside its content) closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus());
}
