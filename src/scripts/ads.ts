/**
 * Ads island: once the visitor accepts cookies, fills each reserved slot ([data-ad-slot]) that
 * has an AdSense unit with an <ins class="adsbygoogle"> as it nears the viewport, loading the
 * AdSense script on the first one. Config comes from <body data-ads> (src/lib/ads.ts); without
 * it, or without consent, nothing loads and the placeholders stay.
 */
import { onConsent } from './consent';

interface AdsConfig {
  client: string;
  units: Record<string, string>;
}
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let started = false;
let scriptAdded = false;

function addScript(client: string) {
  if (scriptAdded) return;
  scriptAdded = true;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.append(script);
}

function fill(slot: HTMLElement, config: AdsConfig, unit: string) {
  addScript(config.client);
  slot.textContent = '';
  slot.removeAttribute('aria-hidden');
  slot.setAttribute('role', 'complementary');
  slot.setAttribute('aria-label', 'Advertisement');
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.cssText = 'display:block;width:100%;height:100%';
  ins.dataset.adClient = config.client;
  ins.dataset.adSlot = unit;
  slot.append(ins);
  (window.adsbygoogle ??= []).push({});
}

function start(config: AdsConfig) {
  if (started) return;
  started = true;
  const sticky = document.querySelector<HTMLElement>('[data-sticky-ad]');
  if (sticky && sessionStorageGet('ts-sticky-closed') !== '1') {
    sticky.hidden = false;
    // Keep the end of the page (footer links) reachable above the bar.
    document.body.classList.add('max-sm:pb-16');
    sticky.querySelector('[data-sticky-close]')?.addEventListener('click', () => {
      sticky.remove();
      document.body.classList.remove('max-sm:pb-16');
      try {
        sessionStorage.setItem('ts-sticky-closed', '1');
      } catch {
        // Closed for this page only.
      }
    });
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const slot = entry.target as HTMLElement;
        const unit = config.units[slot.dataset.adSlot ?? ''];
        if (unit) fill(slot, config, unit);
      }
    },
    { rootMargin: '400px 0px' },
  );
  for (const slot of document.querySelectorAll<HTMLElement>('[data-ad-slot]')) {
    if (config.units[slot.dataset.adSlot ?? '']) observer.observe(slot);
  }
}

function sessionStorageGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function initAds() {
  const raw = document.body.dataset.ads;
  if (!raw) return;
  const config = JSON.parse(raw) as AdsConfig;
  onConsent((granted) => {
    if (granted) start(config);
    // Withdrawn after ads loaded: reload so no ad code keeps running.
    else if (started) location.reload();
  });
}
