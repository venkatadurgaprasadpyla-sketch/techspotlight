/**
 * Cookie consent island: shows the banner until the visitor chooses, remembers the choice in
 * localStorage['ts-consent'], and announces it with a `ts-consent` event on document (detail:
 * true when granted), also when another tab changes it. "Cookie settings" ([data-consent-open])
 * reopens the banner; focus returns to it after a choice.
 */
export type Consent = 'granted' | 'denied';
export const CONSENT_KEY = 'ts-consent';

export function storedConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

/** Calls `fn` with the current choice (if any) and on every later change. */
export function onConsent(fn: (granted: boolean) => void) {
  const current = storedConsent();
  if (current) fn(current === 'granted');
  document.addEventListener('ts-consent', (event) => fn((event as CustomEvent<boolean>).detail));
}

const announce = (choice: Consent) =>
  document.dispatchEvent(new CustomEvent('ts-consent', { detail: choice === 'granted' }));

export function initConsent() {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  if (!banner) return;
  let opener: HTMLElement | null = null;
  // While open, keep the end of the page (and focused footer links) above the fixed banner.
  const show = (open: boolean) => {
    banner.hidden = !open;
    document.body.style.paddingBottom = open ? `${banner.offsetHeight}px` : '';
    if (!open && opener) {
      opener.focus();
      opener = null;
    }
  };
  show(storedConsent() === null);
  banner.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-consent]');
    const choice = button?.dataset.consent;
    if (choice !== 'granted' && choice !== 'denied') return;
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Private mode: the choice holds for this page only.
    }
    show(false);
    announce(choice);
  });
  for (const button of document.querySelectorAll<HTMLElement>('[data-consent-open]')) {
    button.hidden = false;
    button.addEventListener('click', () => {
      opener = button;
      show(true);
      banner.querySelector<HTMLElement>('h2')?.focus();
    });
  }
  window.addEventListener('storage', (event) => {
    if (event.key !== CONSENT_KEY) return;
    const choice = storedConsent();
    if (!choice) return;
    show(false);
    announce(choice);
  });
}
