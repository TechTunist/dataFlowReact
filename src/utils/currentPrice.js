/**
 * currentPrice.js
 *
 * Lightweight async utility to fetch current (live) prices for BTC and alts
 * using free public no-key APIs (Coingecko primary, Binance fallback for BTC).
 * Short TTL cache (in-memory + localStorage, ~30s) to avoid hammering free endpoints.
 *
 * This is provided for the "add current price to bitcoin (and altcoins...) from free client based request"
 * requirement in PROFESSIONALIZATION_REMAINING.md and ToDo.md.
 * (Similar to how 20-week extension or other charts surface live price.)
 *
 * Do NOT call it everywhere yet — import and use on-demand in charts (e.g. BitcoinPrice, Puell, OnChainRisk, MarketOverview widgets, etc.)
 * when polish/integration agent adopts it. Example:
 *   import { getCurrentBtcPrice, getCurrentAltPrice } from '../utils/currentPrice';
 *   const btcNow = await getCurrentBtcPrice();
 *
 * Returns number (USD) or null on failure. Never throws to caller.
 */

const CACHE_TTL_MS = 30 * 1000; // 30 seconds short TTL
const CACHE_KEY_PREFIX = 'cp_'; // currentPrice_

// In-memory cache for fast sync access within module lifetime
let memCache = Object.create(null);

function _getCached(key) {
  const now = Date.now();
  const mem = memCache[key];
  if (mem && (now - mem.ts < CACHE_TTL_MS)) {
    return mem.value;
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (now - parsed.ts < CACHE_TTL_MS) && typeof parsed.value === 'number') {
        memCache[key] = parsed; // hydrate mem
        return parsed.value;
      }
    }
  } catch (e) {
    // ignore storage errors (private mode etc)
  }
  return null;
}

function _setCache(key, value) {
  const entry = { value, ts: Date.now() };
  memCache[key] = entry;
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // ignore
  }
}

async function _fetchCoingecko(idsCsv) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(idsCsv)}&vs_currencies=usd`;
  const res = await fetch(url, {
    method: 'GET',
    // no credentials, public endpoint
  });
  if (!res.ok) {
    throw new Error(`Coingecko price fetch failed: ${res.status}`);
  }
  return res.json();
}

async function _fetchBinanceBtcFallback() {
  const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Binance fallback failed: ${res.status}`);
  const j = await res.json();
  const p = parseFloat(j.price);
  if (!isFinite(p)) throw new Error('Bad binance price');
  return { bitcoin: { usd: p } };
}

async function _getPriceForIds(idsCsv, cacheKey) {
  const cached = _getCached(cacheKey);
  if (cached !== null) return cached;

  let data;
  try {
    data = await _fetchCoingecko(idsCsv);
  } catch (e1) {
    // fallback only for btc
    if (idsCsv.includes('bitcoin')) {
      try {
        data = await _fetchBinanceBtcFallback();
      } catch (e2) {
        // will return null below
      }
    }
  }

  let price = null;
  if (data) {
    // data = { bitcoin: { usd: 123.45 }, ethereum: { usd: 2345 } , ... }
    // take first id's usd
    const firstId = idsCsv.split(',')[0];
    const entry = data[firstId];
    if (entry && typeof entry.usd === 'number') {
      price = entry.usd;
    }
  }

  if (typeof price === 'number' && isFinite(price) && price > 0) {
    _setCache(cacheKey, price);
    return price;
  }
  return null;
}

/**
 * Get current BTC price in USD from free public API (cached).
 * @returns {Promise<number|null>}
 */
export async function getCurrentBtcPrice() {
  return _getPriceForIds('bitcoin', 'btc');
}

/**
 * Get current alt price in USD (e.g. symbol='ETH' or 'ethereum').
 * Supports common symbols via simple map; falls back to lowercased as coingecko id.
 * @param {string} symbol - e.g. 'ETH', 'SOL', 'ethereum'
 * @returns {Promise<number|null>}
 */
export async function getCurrentAltPrice(symbol = '') {
  const s = String(symbol || '').trim().toLowerCase();
  if (!s) return null;
  const map = {
    eth: 'ethereum',
    ethereum: 'ethereum',
    sol: 'solana',
    solana: 'solana',
    ada: 'cardano',
    btc: 'bitcoin', // allow
  };
  const id = map[s] || s;
  const cacheKey = `alt_${id}`;
  return _getPriceForIds(id, cacheKey);
}

export default {
  getCurrentBtcPrice,
  getCurrentAltPrice,
};
