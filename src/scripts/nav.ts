/**
 * Mega-menu (disclosure pattern) and mobile drawer behaviour.
 * - Click or Enter/Space toggles a hub panel; hovering with a mouse opens it.
 * - Escape closes and returns focus to the hub button; focus or clicks outside close it.
 * - Left/Right move between hub buttons; Down opens the panel and focuses its first link.
 * The drawer is a native <dialog>, which supplies the focus trap, Escape and inert background.
 */

const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 200;

interface MenuItem {
  item: HTMLElement;
  trigger: HTMLButtonElement;
  panel: HTMLElement;
  /** Opened by hovering: the next click confirms it instead of toggling it shut. */
  hoverOpened: boolean;
}

export function initMegaMenu(root: ParentNode = document) {
  const menu = root.querySelector<HTMLElement>('[data-mm-root]');
  if (!menu) return;
  const items: MenuItem[] = [];
  for (const item of menu.querySelectorAll<HTMLElement>('[data-mm-item]')) {
    const trigger = item.querySelector<HTMLButtonElement>('[data-mm-trigger]');
    const panel = item.querySelector<HTMLElement>('[data-mm-panel]');
    if (trigger && panel) items.push({ item, trigger, panel, hoverOpened: false });
  }
  let timer: number | undefined;

  const close = (entry: MenuItem) => {
    entry.hoverOpened = false;
    entry.trigger.setAttribute('aria-expanded', 'false');
    entry.panel.hidden = true;
  };
  const closeAll = (except?: MenuItem) => items.filter((m) => m !== except).forEach(close);
  const open = (entry: MenuItem) => {
    closeAll(entry);
    entry.trigger.setAttribute('aria-expanded', 'true');
    entry.panel.hidden = false;
  };
  const isOpen = ({ trigger }: MenuItem) => trigger.getAttribute('aria-expanded') === 'true';

  items.forEach((entry, index) => {
    const { item, trigger, panel } = entry;

    trigger.addEventListener('click', () => {
      // A click wins over a pending hover timer, or a quick click-to-close would reopen.
      window.clearTimeout(timer);
      if (entry.hoverOpened) entry.hoverOpened = false;
      else if (isOpen(entry)) close(entry);
      else open(entry);
    });

    trigger.addEventListener('keydown', (event) => {
      const move = (delta: number) => {
        event.preventDefault();
        items[(index + delta + items.length) % items.length]?.trigger.focus();
      };
      if (event.key === 'ArrowRight') move(1);
      else if (event.key === 'ArrowLeft') move(-1);
      else if (event.key === 'ArrowDown') {
        event.preventDefault();
        open(entry);
        panel.querySelector<HTMLAnchorElement>('a')?.focus();
      }
    });

    item.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen(entry)) {
        event.preventDefault();
        close(entry);
        trigger.focus();
      }
    });

    item.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (next instanceof Node && !item.contains(next)) close(entry);
    });

    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (isOpen(entry)) return;
        open(entry);
        entry.hoverOpened = true;
      }, HOVER_OPEN_MS);
    });
    item.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => close(entry), HOVER_CLOSE_MS);
    });
  });

  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !menu.contains(event.target)) closeAll();
  });
}

export function initDrawer(root: ParentNode = document) {
  const drawer = root.querySelector<HTMLDialogElement>('[data-drawer]');
  const opener = root.querySelector<HTMLButtonElement>('[data-drawer-open]');
  if (!drawer || !opener) return;

  opener.setAttribute('aria-expanded', 'false');
  opener.addEventListener('click', () => {
    drawer.showModal();
    opener.setAttribute('aria-expanded', 'true');
  });
  drawer.addEventListener('close', () => {
    opener.setAttribute('aria-expanded', 'false');
    // preventScroll keeps in-page jumps (e.g. "Get the newsletter" → #newsletter) where they land.
    opener.focus({ preventScroll: true });
  });
  for (const el of drawer.querySelectorAll('[data-drawer-close]')) {
    el.addEventListener('click', () => drawer.close());
  }
  // A click on the backdrop lands on the <dialog> element itself.
  drawer.addEventListener('click', (event) => {
    if (event.target === drawer) drawer.close();
  });
}
