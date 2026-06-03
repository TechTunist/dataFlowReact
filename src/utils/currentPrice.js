/**
 * Lightweight current (live) price fetcher using CoinGecko public API.
 * Supports BTC, ETH, and all altcoins in the app via coingecko ids.
 * 60s in-memory cache + LS fallback for BTC/ETH.
 * Called only once per chart load (after rendering) to provide up-to-date price.
 * Does not poll repeatedly to avoid interfering with charts.
 */
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

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
  const cgId = COINGECKO_ID_MAP[coinCode.toUpperCase()] || coinCode.toLowerCase();
  const key = cgId;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.price;
  try {
    const price = await fetchPrice(cgId);
    if (price != null) {
      cache.set(key, { price, ts: now });
      // Legacy LS only for BTC/ETH for backward compat with other widgets
      if (cgId === 'bitcoin') {
        try { localStorage.setItem('btcPrice', JSON.stringify(price)); localStorage.setItem('cacheTime', now.toString()); } catch(e){}
      } else if (cgId === 'ethereum') {
        try { localStorage.setItem('ethPrice', JSON.stringify(price)); localStorage.setItem('ethCacheTime', now.toString()); } catch(e){}
      }
      return price;
    }
  } catch(e){}
  // Fallback to LS for BTC/ETH
  if (cgId === 'bitcoin') {
    try {
      const cachedPrice = localStorage.getItem('btcPrice'); const cacheTime = localStorage.getItem('cacheTime');
      if (cachedPrice && cacheTime && now - parseInt(cacheTime,10) < CACHE_TTL_MS*5) {
        const p = JSON.parse(cachedPrice); cache.set(key, {price: p, ts: parseInt(cacheTime,10)}); return p;
      }
    } catch(e){}
  } else if (cgId === 'ethereum') {
    try {
      const cached = localStorage.getItem('ethPrice'); const t = localStorage.getItem('ethCacheTime');
      if (cached && t && now - parseInt(t,10) < CACHE_TTL_MS*5) {
        const p=JSON.parse(cached); cache.set(key,{price:p,ts:parseInt(t,10)}); return p;
      }
    } catch(e){}
  }
  return null;
}

export async function getCurrentBitcoinPrice() { return getCurrentPrice('BTC'); }
export async function getCurrentEthereumPrice() { return getCurrentPrice('ETH'); }
