import { initDB } from '../utility/idbUtils';
import logger from './logger';

const DATA_STORE_NAME = 'apiData';

/** Cache ids aligned with FREE_TIER_API_PREFIXES / free-tier charts. */
export const FREE_TIER_CACHE_IDS = new Set([
  'btcData',
  'ethData',
  'dominanceData',
  'marketCapData',
  'differenceData',
  'total2Data',
  'total3Data',
  'fearAndGreedData',
  'latestFearAndGreed',
  'macroData',
  'inflationData',
  'initialClaimsData',
  'interestData',
  'unemploymentData',
  'fedBalanceData',
]);

const PREMIUM_CACHE_PREFIXES = [
  'mvrvData',
  'txMvrv',
  'floorEcho',
  'onchainMetrics',
  'altcoinSeason',
  'sp500DivUnrate',
  'fredSeriesData_',
  'altcoinData_',
  'puellRisk',
  'minerCapThermoCap',
  'feeRisk',
  'soplRisk',
  'txCount',
  'mvrvRisk',
];

export const isPremiumCacheId = (cacheId) => {
  if (!cacheId || FREE_TIER_CACHE_IDS.has(cacheId)) {
    return false;
  }
  return PREMIUM_CACHE_PREFIXES.some(
    (prefix) => cacheId === prefix || cacheId.startsWith(prefix),
  );
};

/** Remove premium series from IndexedDB after access is revoked. */
export async function purgePremiumCache() {
  if (typeof indexedDB === 'undefined') {
    return 0;
  }

  try {
    const db = await initDB();
    const tx = db.transaction(DATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DATA_STORE_NAME);
    const all = await store.getAll();
    let purged = 0;

    for (const entry of all) {
      if (entry?.id && isPremiumCacheId(entry.id)) {
        await store.delete(entry.id);
        purged += 1;
      }
    }

    await tx.done;
    if (purged > 0) {
      logger.log(`[Cache] Purged ${purged} premium cache entries after access revocation`);
    }
    return purged;
  } catch (error) {
    logger.error('Failed to purge premium cache entries', error);
    return 0;
  }
}