// src/utility/idbUtils.js
import { openDB } from 'idb';

const DB_NAME = 'CryptoDataDB';
const DATA_STORE_NAME = 'apiData';
const RISK_STORE_NAME = 'bitcoinRisk';

export async function initDB() {
  try {
    return await openDB(DB_NAME, 2, { // Incremented version from 1 to 2
      upgrade(db) {
        if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
          db.createObjectStore(DATA_STORE_NAME, { keyPath: 'id' });
          console.log(`Created object store: ${DATA_STORE_NAME}`);
        }
        if (!db.objectStoreNames.contains(RISK_STORE_NAME)) {
          db.createObjectStore(RISK_STORE_NAME, { keyPath: 'id' });
          console.log(`Created object store: ${RISK_STORE_NAME}`);
        }
      },
    });
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

export async function cacheData(id, data, timestamp) {
  try {
    const db = await initDB();
    await db.put(DATA_STORE_NAME, { id, data, timestamp });
    console.log(`Cached data for id: ${id}`);
  } catch (error) {
    console.error(`Failed to cache data for id ${id}:`, error);
    throw error;
  }
}

export async function getCachedData(id) {
  try {
    const db = await initDB();
    const data = await db.get(DATA_STORE_NAME, id);
    return data;
  } catch (error) {
    console.error(`Failed to get cached data for id ${id}:`, error);
    throw error;
  }
}

export async function clearCache(id) {
  try {
    const db = await initDB();
    await db.delete(DATA_STORE_NAME, id);
    console.log(`Cleared cache for id: ${id}`);
  } catch (error) {
    console.error(`Failed to clear cache for id ${id}:`, error);
    throw error;
  }
}

export async function saveBitcoinRisk(riskLevel) {
  try {
    const db = await initDB();
    await db.put(RISK_STORE_NAME, { id: 'currentRisk', riskLevel, timestamp: Date.now() });
    console.log(`Saved Bitcoin risk level: ${riskLevel}`);
  } catch (error) {
    console.error('Failed to save Bitcoin risk level:', error);
    throw error;
  }
}

export async function getBitcoinRisk() {
  try {
    const db = await initDB();
    const data = await db.get(RISK_STORE_NAME, 'currentRisk');
    return data;
  } catch (error) {
    console.error('Failed to get Bitcoin risk level:', error);
    throw error;
  }
}