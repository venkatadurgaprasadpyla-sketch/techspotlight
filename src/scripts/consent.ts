/**
 * Cookie consent island: shows the banner until the visitor chooses, remembers the choice in
 * localStorage['ts-consent'], and announces it with a `ts-consent` event on document (detail:
 * true when granted). "Cookie settings" ([data-consent-open]) reopens the banner.
 */
export type Consent = 'granted' | 'denied';
const KEY = 'ts-consent';

export function storedConsent(): Consent | null {
  try {
    const value = localStorage.getItem(KEY);
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

export function initConsent() {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  if (!banner) return;
  const show = (open: boolean) => {
    banner.hidden = !open;
  };
  show(storedConsent() === null);
  banner.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-consent]');
    const choice = button?.dataset.consent;
    if (choice !== 'granted' && choice !== 'denied') return;
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      // Private mode: the choice holds for this page only.
    }
    show(false);
    document.dispatchEvent(new CustomEvent('ts-consent', { detail: choice === 'granted' }));
  });
  for (const opener of document.querySelectorAll<HTMLElement>('[data-consent-open]')) {
    opener.hidden = false;
    opener.addEventListener('click', () => {
      show(true);
      banner.querySelector<HTMLElement>('[data-consent="granted"]')?.focus();
    });
  }
}
