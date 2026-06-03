/**
 * Lightweight current (live) price fetcher for BTC/ETH using public free APIs.
 * No backend hit, no auth, client-side only. Short in-memory + localStorage cache.
 *
 * MODERN AGENT (sub/modern-polish): created (as .js then converted to .ts) to fulfill "current / live price overlays" + TS incremental example.
 * + adoption in BitcoinPrice (and alt if easy). Replaces/stabilizes the localStorage hack from BitcoinFees.
 * Used for header display + price line annotation on latest bar.
 *
 * Public APIs: CoinGecko (simple/price) - generous for this use.
 * Future: can add binance ticker, more alts, error backoff.
 *
 * Safe: never throws to caller (returns null on fail), respects TTL.
 * Also writes to legacy 'btcPrice'/'cacheTime' localStorage for any other consumers.
 */

const CACHE_TTL_MS = 60 * 1000; // 60s freshness for live price
const cache = new Map(); // module scoped in-mem

async function fetchPrice(coinId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`price fetch ${res.status}`);
  const json = await res.json();
  return json?.[coinId]?.usd ?? null;
}

export async function getCurrentBitcoinPrice() {
  const key = 'bitcoin';
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_TTL_MS) {
    return hit.price;
  }
  try {
    const price = await fetchPrice(key);
    if (price != null) {
      cache.set(key, { price, ts: now });
      // stabilize legacy localStorage (used by older BitcoinFees / commented paths)
      try {
        localStorage.setItem('btcPrice', JSON.stringify(price));
        localStorage.setItem('cacheTime', now.toString());
      } catch (e) {
        // private mode or quota - non fatal
      }
      return price;
    }
  } catch (e) {
    // network fail, rate limit etc - silent, return stale or null
  }
  // fallback to legacy localStorage if fresh
  try {
    const cachedPrice = localStorage.getItem('btcPrice');
    const cacheTime = localStorage.getItem('cacheTime');
    if (cachedPrice && cacheTime && now - parseInt(cacheTime, 10) < CACHE_TTL_MS * 5) {
      const p = JSON.parse(cachedPrice);
      cache.set(key, { price: p, ts: parseInt(cacheTime, 10) });
      return p;
    }
  } catch (e) {}
  return null;
}

export async function getCurrentEthereumPrice() {
  const key = 'ethereum';
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_TTL_MS) {
    return hit.price;
  }
  try {
    const price = await fetchPrice(key);
    if (price != null) {
      cache.set(key, { price, ts: now });
      try {
        localStorage.setItem('ethPrice', JSON.stringify(price));
        localStorage.setItem('ethCacheTime', now.toString());
      } catch (e) {}
      return price;
    }
  } catch (e) {}
  try {
    const cached = localStorage.getItem('ethPrice');
    const t = localStorage.getItem('ethCacheTime');
    if (cached && t && now - parseInt(t, 10) < CACHE_TTL_MS * 5) {
      const p = JSON.parse(cached);
      cache.set(key, { price: p, ts: parseInt(t, 10) });
      return p;
    }
  } catch (e) {}
  return null;
}

// Optional: generic for future
export async function getCurrentPrice(coinId = 'bitcoin') {
  if (coinId === 'bitcoin') return getCurrentBitcoinPrice();
  if (coinId === 'ethereum') return getCurrentEthereumPrice();
  // extend as needed
  return null;
}
