// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"handleDisabledFileLoadingAsSuccess":true}}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const banner = `
  <section data-consent-banner hidden>
    <h2 tabindex="-1">Cookies and ads</h2>
    <button data-consent="denied">Reject</button>
    <button data-consent="granted">Accept</button>
  </section>`;
const config = {
  client: 'ca-pub-1234567890123456',
  units: { leaderboard: '111', 'in-article': '222' },
};

/** Every observed element counts as on screen at once. */
class InstantObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

async function load() {
  vi.resetModules();
  const consent = await import('~/scripts/consent');
  const ads = await import('~/scripts/ads');
  return { ...consent, ...ads };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.body.dataset.ads;
  window.adsbygoogle = [];
  vi.stubGlobal('IntersectionObserver', InstantObserver);
});
// Listeners from earlier tests' module instances would otherwise still hear `ts-consent`.
const listeners: [EventTarget, string, EventListenerOrEventListenerObject][] = [];
for (const target of [document, window] as EventTarget[]) {
  const add = target.addEventListener.bind(target);
  target.addEventListener = (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (listener) listeners.push([target, type, listener]);
    add(type, listener, options);
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  for (const [target, type, listener] of listeners.splice(0))
    target.removeEventListener(type, listener);
});

const click = (selector: string) => document.querySelector<HTMLElement>(selector)?.click();
const bannerEl = () => document.querySelector<HTMLElement>('[data-consent-banner]');

describe('consent banner', () => {
  it('shows until the visitor chooses, then remembers and announces the choice', async () => {
    const { initConsent } = await load();
    document.body.innerHTML = banner;
    const heard: boolean[] = [];
    document.addEventListener('ts-consent', (e) => heard.push((e as CustomEvent<boolean>).detail));
    initConsent();
    expect(bannerEl()?.hidden).toBe(false);
    click('[data-consent="granted"]');
    expect(bannerEl()?.hidden).toBe(true);
    expect(localStorage.getItem('ts-consent')).toBe('granted');
    expect(heard).toEqual([true]);
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('stays closed when a choice is stored', async () => {
    localStorage.setItem('ts-consent', 'denied');
    const { initConsent } = await load();
    document.body.innerHTML = banner;
    initConsent();
    expect(bannerEl()?.hidden).toBe(true);
  });

  it('reopens from Cookie settings without nudging focus to Accept, and returns focus after', async () => {
    localStorage.setItem('ts-consent', 'granted');
    const { initConsent } = await load();
    document.body.innerHTML = `${banner}<button data-consent-open hidden>Cookie settings</button>`;
    initConsent();
    const opener = document.querySelector<HTMLElement>('[data-consent-open]');
    expect(opener?.hidden).toBe(false);
    opener?.click();
    expect(bannerEl()?.hidden).toBe(false);
    expect(document.activeElement?.tagName).toBe('H2');
    click('[data-consent="denied"]');
    expect(document.activeElement).toBe(opener);
    expect(localStorage.getItem('ts-consent')).toBe('denied');
  });

  it('treats unreadable storage as no choice', async () => {
    const { storedConsent } = await load();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(storedConsent()).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('ads island', () => {
  const page = () => {
    document.body.dataset.ads = JSON.stringify(config);
    document.body.innerHTML = `${banner}<main>
      <div class="ad-slot" data-ad-slot="leaderboard" aria-hidden="true">Advertisement</div>
      <div class="ad-slot" data-ad-slot="in-article" aria-hidden="true">Advertisement</div>
      <div class="ad-slot" data-ad-slot="sidebar" aria-hidden="true">Advertisement</div>
    </main>`;
  };
  const filled = () => document.querySelectorAll('ins.adsbygoogle');
  const adScript = () => document.head.querySelectorAll('script[src*="googlesyndication"]');

  it('loads nothing before consent or after a reject', async () => {
    const { initAds, initConsent } = await load();
    page();
    initConsent();
    initAds();
    expect(filled()).toHaveLength(0);
    click('[data-consent="denied"]');
    expect(filled()).toHaveLength(0);
    expect(adScript()).toHaveLength(0);
  });

  it('does nothing on pages without ad config (trust pages, noAds)', async () => {
    localStorage.setItem('ts-consent', 'granted');
    const { initAds } = await load();
    document.body.innerHTML = '<main><div data-ad-slot="leaderboard"></div></main>';
    initAds();
    expect(filled()).toHaveLength(0);
  });

  it('fills slots that have a unit after Accept, once, keeping a visible label', async () => {
    const { initAds, initConsent } = await load();
    page();
    initConsent();
    initAds();
    click('[data-consent="granted"]');
    expect(filled()).toHaveLength(2);
    expect(adScript()).toHaveLength(1);
    expect(window.adsbygoogle).toHaveLength(2);
    const [leaderboard, inArticle] = [...document.querySelectorAll<HTMLElement>('.ad-live')];
    expect(leaderboard?.querySelector('.ad-label')?.textContent).toBe('Advertisement');
    expect(leaderboard?.hasAttribute('aria-hidden')).toBe(false);
    expect(leaderboard?.querySelector<HTMLElement>('ins')?.dataset).toMatchObject({
      adSlot: '111',
      fullWidthResponsive: 'false',
    });
    expect(inArticle?.querySelector<HTMLElement>('ins')?.dataset).toMatchObject({
      adLayout: 'in-article',
      adFormat: 'fluid',
    });
    // A second "Accept" (e.g. from Cookie settings) does not fill again.
    document.dispatchEvent(new CustomEvent('ts-consent', { detail: true }));
    expect(filled()).toHaveLength(2);
  });

  it('reloads once when consent is withdrawn after ads loaded', async () => {
    localStorage.setItem('ts-consent', 'granted');
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const { initAds } = await load();
    page();
    initAds();
    expect(filled()).toHaveLength(2);
    document.dispatchEvent(new CustomEvent('ts-consent', { detail: false }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows the sticky bar only once its ad fills, and removes it if it stays empty', async () => {
    localStorage.setItem('ts-consent', 'granted');
    const { initAds } = await load();
    const sticky = { ...config, units: { ...config.units, 'sticky-mobile': '333' } };
    document.body.dataset.ads = JSON.stringify(sticky);
    document.body.innerHTML = `<main id="main" tabindex="-1"></main>
      <div data-sticky-ad hidden><div data-ad-slot="sticky-mobile">Advertisement</div>
      <button data-sticky-close>×</button></div>`;
    initAds();
    const bar = document.querySelector<HTMLElement>('[data-sticky-ad]');
    expect(bar?.hidden).toBe(true);
    const ins = bar?.querySelector<HTMLElement>('ins');
    ins?.setAttribute('data-ad-status', 'filled');
    await Promise.resolve();
    expect(bar?.hidden).toBe(false);
    click('[data-sticky-close]');
    expect(document.querySelector('[data-sticky-ad]')).toBeNull();
    expect(sessionStorage.getItem('ts-sticky-closed')).toBe('1');
    expect(document.activeElement?.id).toBe('main');
  });
});
