/**
 * Live stock quote fetcher — reads server-cached Twelve Data /quote via our backend.
 * One fetch per chart load; 1h in-memory + localStorage cache to limit API traffic.
 * Never throws.
 */
import { apiUrl } from '../config/api';
import { getAuthHeaders } from './clerkAuth';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const memCache = new Map();

function lsKey(symbol, date) {
  return `stockLiveQuote_${symbol}_${date}`;
}

function readLs(symbol, date) {
  try {
    const raw = localStorage.getItem(lsKey(symbol, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts >= CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLs(symbol, date, quote) {
  try {
    localStorage.setItem(lsKey(symbol, date), JSON.stringify({ ...quote, ts: Date.now() }));
  } catch {
    // quota / private mode
  }
}

/**
 * @param {string} symbol Platform stock code, e.g. TSLA, BRKB
 * @returns {Promise<{ price: number, as_of_date: string, fetched_at?: string } | null>}
 */
export async function getCurrentStockPrice(symbol = 'TSLA') {
  const code = (symbol || 'TSLA').toUpperCase();
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  const memKey = `${code}_${today}`;

  const memHit = memCache.get(memKey);
  if (memHit && now - memHit.ts < CACHE_TTL_MS) {
    return memHit.quote;
  }

  const lsHit = readLs(code, today);
  if (lsHit?.quote) {
    memCache.set(memKey, { quote: lsHit.quote, ts: lsHit.ts });
    return lsHit.quote;
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(apiUrl(`/api/stock-live-quote/${code.toLowerCase()}/`), {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = await res.json();
    const price = data?.price != null ? Number(data.price) : null;
    const asOfDate = data?.as_of_date;
    if (price == null || !Number.isFinite(price) || !asOfDate) return null;

    const quote = {
      price,
      as_of_date: asOfDate,
      fetched_at: data.fetched_at,
    };

    memCache.set(memKey, { quote, ts: now });
    writeLs(code, today, { quote });
    return quote;
  } catch {
    return null;
  }
}