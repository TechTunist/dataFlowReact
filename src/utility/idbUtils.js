// src/utility/idbUtils.js
import { openDB } from 'idb';

const DB_NAME = 'CryptoDataDB';
const DATA_STORE_NAME = 'apiData';
const RISK_STORE_NAME = 'bitcoinRisk';
const ROI_STORE_NAME = 'roiData'; // New store for ROI data

export async function initDB() {
  try {
    return await openDB(DB_NAME, 3, { // Incremented version to 3 for new store
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
          db.createObjectStore(DATA_STORE_NAME, { keyPath: 'id' });
          console.log(`Created object store: ${DATA_STORE_NAME}`);
        }
        if (!db.objectStoreNames.contains(RISK_STORE_NAME)) {
          db.createObjectStore(RISK_STORE_NAME, { keyPath: 'id' });
          console.log(`Created object store: ${RISK_STORE_NAME}`);
        }
        if (!db.objectStoreNames.contains(ROI_STORE_NAME) && oldVersion < 3) {
          db.createObjectStore(ROI_STORE_NAME, { keyPath: 'id' });
          console.log(`Created object store: ${ROI_STORE_NAME}`);
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

// New function to save ROI data
export async function saveRoiData(roiData) {
  try {
    const db = await initDB();
    await db.put(ROI_STORE_NAME, { id: 'roiCycles', ...roiData, timestamp: Date.now() });
    console.log('Saved ROI data');
  } catch (error) {
    console.error('Failed to save ROI data:', error);
    throw error;
  }
}

// New function to get ROI data
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