/**
 * Ads island: once the visitor accepts cookies, fills each reserved slot ([data-ad-slot]) that
 * has an AdSense unit as it nears the viewport, loading the AdSense script on the first one.
 * A filled slot keeps a visible "Advertisement" label above the unit. Config comes from
 * <body data-ads> (src/lib/ads.ts); without it, or without consent, nothing loads and the
 * placeholders stay.
 */
import { onConsent } from './consent';

export interface AdsConfig {
  client: string;
  units: Record<string, string>;
}
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const STICKY_CLOSED = 'ts-sticky-closed';
const AD_SCRIPT = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

function addScript(client: string) {
  if (document.querySelector(`script[src^="${AD_SCRIPT}"]`)) return;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `${AD_SCRIPT}?client=${encodeURIComponent(client)}`;
  document.head.append(script);
}

/** Replaces a slot's placeholder with its label and an AdSense unit. */
export function fillSlot(slot: HTMLElement, config: AdsConfig, unit: string): HTMLElement {
  addScript(config.client);
  slot.textContent = '';
  slot.classList.add('ad-live');
  const label = document.createElement('span');
  label.className = 'ad-label';
  label.textContent = 'Advertisement';
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.cssText = 'display:block;width:100%;flex:1;min-height:0';
  ins.dataset.adClient = config.client;
  ins.dataset.adSlot = unit;
  if (slot.dataset.adSlot === 'in-article') {
    ins.dataset.adLayout = 'in-article';
    ins.dataset.adFormat = 'fluid';
  } else {
    // Fit the reserved box; never let AdSense grow it (no layout shift).
    ins.dataset.adFormat = 'rectangle, horizontal, vertical';
    ins.dataset.fullWidthResponsive = 'false';
  }
  slot.append(label, ins);
  slot.removeAttribute('aria-hidden');
  (window.adsbygoogle ??= []).push({});
  return ins;
}

function storage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

/** The mobile sticky bar: shown once its unit is filled, removed if it stays empty or is closed. */
function setUpSticky(config: AdsConfig) {
  const sticky = document.querySelector<HTMLElement>('[data-sticky-ad]');
  const slot = sticky?.querySelector<HTMLElement>('[data-ad-slot]');
  const unit = config.units['sticky-mobile'];
  if (!sticky || !slot || !unit) return;
  const remove = () => {
    sticky.remove();
    document.body.classList.remove('max-sm:pb-28');
  };
  if (storage()?.getItem(STICKY_CLOSED) === '1') return remove();
  const ins = fillSlot(slot, config, unit);
  new MutationObserver(() => {
    const status = ins.dataset.adStatus;
    if (status === 'unfilled') remove();
    if (status === 'filled') {
      sticky.hidden = false;
      // Room for the bar and its close button above it.
      document.body.classList.add('max-sm:pb-28');
    }
  }).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
  sticky.querySelector('[data-sticky-close]')?.addEventListener('click', () => {
    remove();
    storage()?.setItem(STICKY_CLOSED, '1');
    document.getElementById('main')?.focus({ preventScroll: true });
  });
}

let started = false;

function start(config: AdsConfig) {
  if (started) return;
  started = true;
  setUpSticky(config);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const slot = entry.target as HTMLElement;
        const unit = config.units[slot.dataset.adSlot ?? ''];
        if (unit) fillSlot(slot, config, unit);
      }
    },
    { rootMargin: '400px 0px' },
  );
  for (const slot of document.querySelectorAll<HTMLElement>('main [data-ad-slot]')) {
    if (config.units[slot.dataset.adSlot ?? '']) observer.observe(slot);
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
