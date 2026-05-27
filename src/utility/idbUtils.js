import { openDB } from 'idb';
import logger from '../utils/logger';

/**
 * Phase 2 improvement: Simple TTL-aware cache helpers.
 * These can be expanded later with size limits and versioning.
 */
export const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function isCacheFresh(cached, ttl = DEFAULT_CACHE_TTL) {
  if (!cached || !cached.timestamp) return false;
  return (Date.now() - cached.timestamp) < ttl;
}

const DB_NAME = 'CryptoDataDB';
const DATA_STORE_NAME = 'apiData';
const RISK_STORE_NAME = 'bitcoinRisk';
const ETH_RISK_STORE_NAME = 'ethereumRisk';
const ROI_STORE_NAME = 'roiData';
const CYCLE_DAYS_STORE_NAME = 'cycleDaysData';

export async function initDB() {
  try {
    return await openDB(DB_NAME, 5, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
          db.createObjectStore(DATA_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(RISK_STORE_NAME)) {
          db.createObjectStore(RISK_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(ROI_STORE_NAME) && oldVersion < 3) {
          db.createObjectStore(ROI_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(ETH_RISK_STORE_NAME) && oldVersion < 4) {
          db.createObjectStore(ETH_RISK_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CYCLE_DAYS_STORE_NAME) && oldVersion < 5) {
          db.createObjectStore(CYCLE_DAYS_STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  } catch (error) {
    logger.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

export async function cacheData(id, data, timestamp = Date.now()) {
  try {
    const db = await initDB();
    await db.put(DATA_STORE_NAME, { id, data, timestamp });
  } catch (error) {
    logger.error(`Failed to cache data for id ${id}:`, error);
    throw error;
  }
}

/**
 * Phase 2: Enhanced helper that returns cached data only if fresh according to TTL.
 * Falls back to null if stale or missing.
 */
export async function getFreshCachedData(id, ttl = DEFAULT_CACHE_TTL) {
  try {
    const cached = await getCachedData(id);
    if (cached && isCacheFresh(cached, ttl)) {
      return cached;
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get fresh cached data for id ${id}:`, error);
    return null;
  }
}

/**
 * Phase 2: Basic cache pruning helper.
 * Removes entries older than the given maxAge (in ms).
 * Can be called on app start or periodically.
 */
export async function pruneOldCache(maxAge = 7 * 24 * 60 * 60 * 1000) { // default 7 days
  try {
    const db = await initDB();
    const tx = db.transaction(DATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DATA_STORE_NAME);
    const all = await store.getAll();

    const now = Date.now();
    let pruned = 0;

    for (const entry of all) {
      if (entry.timestamp && (now - entry.timestamp) > maxAge) {
        await store.delete(entry.id);
        pruned++;
      }
    }

    await tx.done;
    if (pruned > 0) {
      logger.log(`[Cache] Pruned ${pruned} old entries older than ${Math.round(maxAge / (24 * 60 * 60 * 1000))} days`);
    }
    return pruned;
  } catch (error) {
    logger.error('Failed to prune old cache entries', error);
    return 0;
  }
}

export async function getCachedData(id) {
  try {
    const db = await initDB();
    const data = await db.get(DATA_STORE_NAME, id);
    return data;
  } catch (error) {
    logger.error(`Failed to get cached data for id ${id}:`, error);
    throw error;
  }
}

export async function clearCache(id) {
  try {
    const db = await initDB();
    await db.delete(DATA_STORE_NAME, id);
  } catch (error) {
    logger.error(`Failed to clear cache for id ${id}:`, error);
    throw error;
  }
}

export async function saveBitcoinRisk(riskLevel) {
  try {
    const db = await initDB();
    await db.put(RISK_STORE_NAME, { id: 'currentRisk', riskLevel, timestamp: Date.now() });
  } catch (error) {
    logger.error('Failed to save Bitcoin risk level:', error);
    throw error;
  }
}

export async function getBitcoinRisk() {
  try {
    const db = await initDB();
    const data = await db.get(RISK_STORE_NAME, 'currentRisk');
    if (data && data.timestamp) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dataDate = new Date(data.timestamp);
      dataDate.setHours(0, 0, 0, 0);
      if (dataDate.getTime() === today.getTime()) {
        return data;
      }
    }
    return null;
  } catch (error) {
    logger.error('Failed to get Bitcoin risk level from IndexedDB:', error);
    return null;
  }
}

export async function saveEthereumRisk(riskLevel) {
  try {
    const db = await initDB();
    await db.put(ETH_RISK_STORE_NAME, { id: 'currentEthRisk', riskLevel, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to save Ethereum risk level:', error);
    throw error;
  }
}

export async function getEthereumRisk() {
  try {
    const db = await initDB();
    const data = await db.get(ETH_RISK_STORE_NAME, 'currentEthRisk');
    return data || { riskLevel: 0 };
  } catch (error) {
    console.error('Failed to get Ethereum risk level:', error);
    return { riskLevel: 0 };
  }
}

export async function saveRoiData(roiData) {
  try {
    const db = await initDB();
    await db.put(ROI_STORE_NAME, { id: 'roiCycles', ...roiData, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to save ROI data:', error);
    throw error;
  }
}

export async function getRoiData() {
  try {
    const db = await initDB();
    const data = await db.get(ROI_STORE_NAME, 'roiCycles');
    return data;
  } catch (error) {
    console.error('Failed to get ROI data:', error);
    throw error;
  }
}

export async function clearRoiData() {
  try {
    const db = await initDB();
    const tx = db.transaction(ROI_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ROI_STORE_NAME);
    await store.clear();
    await tx.done;
  } catch (error) {
    console.error('Failed to clear ROI data cache:', error);
    throw error;
  }
}

export async function saveCycleDaysData(cycleDaysData) {
  try {
    const db = await initDB();
    await db.put(CYCLE_DAYS_STORE_NAME, { id: 'cycleDays', ...cycleDaysData, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to save cycle days data:', error);
    throw error;
  }
}

export async function getCycleDaysData() {
  try {
    const db = await initDB();
    const data = await db.get(CYCLE_DAYS_STORE_NAME, 'cycleDays');
    if (data && data.timestamp) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dataDate = new Date(data.timestamp);
      dataDate.setHours(0, 0, 0, 0);
      if (dataDate.getTime() === today.getTime()) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get cycle days data:', error);
    return null;
  }
}

export async function clearCycleDaysData() {
  try {
    const db = await initDB();
    const tx = db.transaction(CYCLE_DAYS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(CYCLE_DAYS_STORE_NAME);
    await store.clear();
    await tx.done;
  } catch (error) {
    console.error('Failed to clear cycle days data cache:', error);
    throw error;
  }
}