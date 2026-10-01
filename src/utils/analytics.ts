export const ANALYTICS_ID = 'G-C3GVZS8SKD';
export const CONSENT_KEY = 'devlog-analytics-consent-v1';
const CHOICE_LIFETIME = 180 * 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Keep arbitrary queries, fragments and referrer paths out of page events.
export function analyticsPageURL(href: string) {
  const original = new URL(href);
  const clean = new URL(original.origin + original.pathname);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = original.searchParams.get(key);
    if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) clean.searchParams.set(key, value);
  }
  return clean.href;
}

export function initAnalytics(id: string, productionHost: string) {
  const banner = document.querySelector<HTMLElement>('#analytics-choice');
  if (!banner) return;
  const privacySignal = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  let active = false;
  let previousFocus: HTMLElement | null = null;
  let choice: 'granted' | 'denied' | null = null;

  try {
    const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
    if (stored?.expires > Date.now() && ['granted', 'denied'].includes(stored?.value)) {
      choice = stored.value;
    }
  } catch { /* Unavailable storage must not imply consent. */ }

  function start() {
    if (active || privacySignal || window.location.hostname !== productionHost) return;
    active = true;
    (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('js', new Date());
    let referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).origin + '/' : ''; } catch { /* Ignore malformed referrers. */ }
    window.gtag('config', id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: analyticsPageURL(window.location.href),
      page_referrer: referrer,
      cookie_domain: window.location.hostname,
      cookie_expires: 60 * 24 * 60 * 60,
      cookie_flags: 'SameSite=Lax;Secure'
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
  }

  function clearAnalyticsCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      // Remove this site's cookies, including older parent-domain cookies.
      const parts = window.location.hostname.split('.');
      const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.'))];
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const paths = ['/', ...pathParts.map((_, i) => '/' + pathParts.slice(0, i + 1).join('/'))];
      for (const domain of domains) for (const path of paths) {
        document.cookie = `${name}=;Max-Age=0;path=${path};${domain ? `domain=${domain};` : ''}SameSite=Lax;Secure`;
      }
    }
  }

  function save(value: 'granted' | 'denied') {
    choice = value;
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, expires: Date.now() + CHOICE_LIFETIME })); } catch { /* The choice still applies to this page. */ }
    banner!.hidden = true;
    previousFocus?.focus();
    if (value === 'granted') start();
    else {
      // Disable hits before reload; do not send a denied-consent ping.
      (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true;
      clearAnalyticsCookies();
      if (active) window.location.reload();
    }
  }

  banner.querySelector('[data-analytics-accept]')?.addEventListener('click', () => save('granted'));
  banner.querySelector('[data-analytics-reject]')?.addEventListener('click', () => save('denied'));
  document.querySelectorAll('[data-analytics-settings]').forEach(button => {
    button.addEventListener('click', () => {
      previousFocus = button as HTMLElement;
      banner!.hidden = false;
      banner!.querySelector<HTMLButtonElement>('[data-analytics-reject]')?.focus();
    });
  });
  const accept = banner.querySelector<HTMLButtonElement>('[data-analytics-accept]');
  if (privacySignal && accept) accept.disabled = true;
  if (privacySignal || choice === 'denied') clearAnalyticsCookies();
  banner.hidden = choice !== null || privacySignal;
  if (choice === 'granted' && !privacySignal) start();

  // Apply a withdrawal made in another tab to this page as well.
  window.addEventListener('storage', event => {
    if (event.key !== CONSENT_KEY || !active) return;
    try {
      if (JSON.parse(event.newValue || 'null')?.value === 'granted') return;
    } catch { /* Invalid or removed consent is treated as withdrawal. */ }
    (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true;
    clearAnalyticsCookies();
    window.location.reload();
  });
}
