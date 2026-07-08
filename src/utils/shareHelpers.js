/**
 * Share / copy helpers for growth content (videos, social, newsletters).
 * Pure utilities — no paid services.
 */

export const SITE_ORIGIN = 'https://cryptological.app';

export const DEFAULT_SHARE_PATHS = {
  home: '/',
  marketPulse: '/#market-pulse',
  trends: '/#public-trends',
  gallery: '/chart-gallery',
  whitepaper: '/bitcoin-whitepaper',
  hundredDay: '/100-day-window',
  signup: '/login-signup?mode=signup',
};

export function absoluteUrl(path = '/') {
  if (!path) return SITE_ORIGIN;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : SITE_ORIGIN;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

const formatUsdShort = (value) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString()}`;
};

/**
 * Build a plain-text market snapshot for paste into X, YouTube descriptions, etc.
 */
export function formatMarketPulseShareText(pulse, { promoActive = false } = {}) {
  if (!pulse || typeof pulse !== 'object') {
    return [
      'Cryptological market pulse',
      absoluteUrl(DEFAULT_SHARE_PATHS.marketPulse),
      promoActive
        ? 'Limited free access with a free account (email + password). No card required.'
        : 'Free signup for interactive charts.',
    ].join('\n');
  }

  const lines = ['Cryptological market pulse'];
  const btc = formatUsdShort(pulse.btc_price?.value);
  if (btc) lines.push(`BTC: ${btc}${pulse.btc_price?.date ? ` (as of ${pulse.btc_price.date})` : ''}`);

  if (pulse.fear_and_greed?.value != null) {
    const v = Math.round(Number(pulse.fear_and_greed.value));
    const cls = pulse.fear_and_greed.classification || '';
    lines.push(`Fear & Greed: ${v}${cls ? ` (${cls})` : ''}`);
  }

  if (pulse.btc_dominance_pct?.value != null) {
    lines.push(`BTC dominance: ${Number(pulse.btc_dominance_pct.value).toFixed(1)}%`);
  }

  const mcap = formatUsdShort(pulse.total_market_cap?.value);
  if (mcap) lines.push(`Total crypto mcap: ${mcap}`);

  const defi = formatUsdShort(pulse.defi_tvl?.value);
  if (defi) lines.push(`DeFi TVL: ${defi}`);

  const stables = formatUsdShort(pulse.stablecoin_mcap?.value);
  if (stables) lines.push(`Stablecoin mcap: ${stables}`);

  lines.push('');
  lines.push(absoluteUrl(DEFAULT_SHARE_PATHS.marketPulse));
  if (promoActive) {
    lines.push('Limited free access: free account (email + password) unlocks all charts. No card.');
  } else {
    lines.push('Sign up free for interactive charts at cryptological.app');
  }

  return lines.join('\n');
}

/** Short X/Twitter intent text (keep under ~240 chars for comfort). */
export function formatMarketPulseTweetText(pulse, { promoActive = false } = {}) {
  const parts = [];
  const btc = formatUsdShort(pulse?.btc_price?.value);
  if (btc) parts.push(`BTC ${btc}`);
  if (pulse?.fear_and_greed?.value != null) {
    parts.push(`F&G ${Math.round(Number(pulse.fear_and_greed.value))}`);
  }
  if (pulse?.btc_dominance_pct?.value != null) {
    parts.push(`Dom ${Number(pulse.btc_dominance_pct.value).toFixed(1)}%`);
  }
  const head = parts.length ? parts.join(' · ') : 'Crypto market pulse';
  const tail = promoActive
    ? ' Limited free access with free account on Cryptological.'
    : ' Live pulse on Cryptological.';
  return `${head}.${tail}`;
}

export function buildTwitterIntentUrl({ text, url }) {
  const params = new URLSearchParams();
  if (text) params.set('text', text);
  if (url) params.set('url', url);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export async function copyTextToClipboard(text) {
  if (typeof text !== 'string' || !text) {
    return { ok: false, error: 'empty' };
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    }
  } catch (err) {
    // fall through to execCommand
  }
  try {
    if (typeof document === 'undefined') return { ok: false, error: 'no_document' };
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok ? { ok: true } : { ok: false, error: 'exec_failed' };
  } catch (err) {
    return { ok: false, error: err?.message || 'copy_failed' };
  }
}

/** Talking points for promotional videos / scripts. */
export function getCreatorTalkingPoints(promoActive = false) {
  return [
    {
      title: 'The hook',
      text: promoActive
        ? 'Cryptological is a crypto + macro charting terminal. Right now full access is free for a limited time, but only if you create a free account with email and password. No card.'
        : 'Cryptological brings Bitcoin risk, on-chain metrics, and macro charts into one place, with a free tier to start.',
    },
    {
      title: 'What cold viewers can see without signup',
      text: 'Anyone can open cryptological.app and see the live market pulse: Bitcoin, Fear & Greed, dominance, market cap, and DeFi TVL, no email required.',
    },
    {
      title: 'What unlocks after free signup',
      text: promoActive
        ? 'With a free account you unlock all 80+ interactive charts: risk colour, workbench, dynamic DCA simulator, stocks, and full history, while the promotion lasts.'
        : 'With a free account you unlock interactive charts and a customisable dashboard. Premium unlocks the advanced toolkit when you are ready.',
    },
    {
      title: 'Flagship tools to demo',
      text: 'Show Risk Colour for cycle context, Dynamic DCA to backtest rules vs HODL, and the Workbench to overlay Fed data on Bitcoin.',
    },
    {
      title: 'Clear limitation to state on camera',
      text: promoActive
        ? 'Say it clearly: free full access is promotional and time-limited. Interactive charts need a free account. Anonymous visitors only get the public pulse and previews.'
        : 'Say it clearly: interactive charts need a free account. Public pages show previews and the market pulse only.',
    },
  ];
}

export function formatCreatorScriptOutline(promoActive = false) {
  const points = getCreatorTalkingPoints(promoActive);
  return [
    'Cryptological promo script outline',
    absoluteUrl(DEFAULT_SHARE_PATHS.home),
    '',
    ...points.map((p, i) => `${i + 1}. ${p.title}\n${p.text}`),
    '',
    `CTA: ${absoluteUrl(DEFAULT_SHARE_PATHS.signup)}`,
  ].join('\n\n');
}
