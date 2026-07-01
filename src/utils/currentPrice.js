/**
 * Lightweight current (live) price fetcher using CoinGecko public API.
 * Supports BTC, ETH, and all altcoins in the app via coingecko ids.
 * 1h in-memory + localStorage cache per coin to stay within free-tier limits.
 * Called only once per chart load (after rendering) to provide up-to-date price.
 * Does not poll repeatedly to avoid interfering with charts.
 */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map();

function lsPriceKey(coinCode) {
  return `livePrice_${coinCode.toUpperCase()}`;
}

function lsTimeKey(coinCode) {
  return `livePrice_${coinCode.toUpperCase()}_ts`;
}

function readLsCache(coinCode, now) {
  try {
    const cachedPrice = localStorage.getItem(lsPriceKey(coinCode));
    const cacheTime = localStorage.getItem(lsTimeKey(coinCode));
    if (cachedPrice && cacheTime && now - parseInt(cacheTime, 10) < CACHE_TTL_MS) {
      const p = JSON.parse(cachedPrice);
      if (Number.isFinite(p)) {
        return { price: p, ts: parseInt(cacheTime, 10) };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function writeLsCache(coinCode, price, now) {
  try {
    localStorage.setItem(lsPriceKey(coinCode), JSON.stringify(price));
    localStorage.setItem(lsTimeKey(coinCode), now.toString());
  } catch {
    // quota / private mode
  }
}

// Map from our coin codes (upper) to CoinGecko ids
const COINGECKO_ID_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  LINK: 'chainlink',
  XRP: 'ripple',
  AVAX: 'avalanche-2',
  TON: 'the-open-network',
  BNB: 'binancecoin',
  AAVE: 'aave',
  CRO: 'crypto-com-chain',
  SUI: 'sui',
  HBAR: 'hedera-hashgraph',
  XLM: 'stellar',
  APT: 'aptos',
  DOT: 'polkadot',
  VET: 'vechain',
  UNI: 'uniswap',
  LTC: 'litecoin',
  LEO: 'leo-token',
  HYPE: 'hyperliquid',
  NEAR: 'near',
  FET: 'fetch-ai',
  ONDO: 'ondo-finance',
  ICP: 'internet-computer',
  XMR: 'monero',
  POL: 'polygon-ecosystem-token',
  ALGO: 'algorand',
  RENDER: 'render-token',
  ARB: 'arbitrum',
  RAY: 'raydium',
  MOVE: 'movement',
};

async function fetchPrice(coinId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('price fetch ' + res.status);
  const json = await res.json();
  return json?.[coinId]?.usd ?? null;
}

export async function getCurrentPrice(coinCode = 'BTC') {
  const upper = coinCode.toUpperCase();
  const cgId = COINGECKO_ID_MAP[upper] || coinCode.toLowerCase();
  const key = cgId;
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.price;

  const lsHit = readLsCache(upper, now);
  if (lsHit) {
    cache.set(key, lsHit);
    return lsHit.price;
  }

  try {
    const price = await fetchPrice(cgId);
    if (price != null) {
      cache.set(key, { price, ts: now });
      writeLsCache(upper, price, now);
      // Legacy LS keys for BTC/ETH widgets that still read btcPrice/ethPrice
      if (cgId === 'bitcoin') {
        try {
          localStorage.setItem('btcPrice', JSON.stringify(price));
          localStorage.setItem('cacheTime', now.toString());
        } catch {
          // ignore
        }
      } else if (cgId === 'ethereum') {
        try {
          localStorage.setItem('ethPrice', JSON.stringify(price));
          localStorage.setItem('ethCacheTime', now.toString());
        } catch {
          // ignore
        }
      }
      return price;
    }
  } catch {
    // fall through to LS
  }

  // Legacy BTC/ETH fallback keys
  if (cgId === 'bitcoin') {
    const legacy = readLsCache('BTC', now);
    if (legacy) {
      cache.set(key, legacy);
      return legacy.price;
    }
  } else if (cgId === 'ethereum') {
    const legacy = readLsCache('ETH', now);
    if (legacy) {
      cache.set(key, legacy);
      return legacy.price;
    }
  }

  return null;
}

export async function getCurrentBitcoinPrice() { return getCurrentPrice('BTC'); }
export async function getCurrentEthereumPrice() { return getCurrentPrice('ETH'); }