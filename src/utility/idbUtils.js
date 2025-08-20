import { openDB } from 'idb';

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
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

export async function cacheData(id, data, timestamp) {
  try {
    const db = await initDB();
    await db.put(DATA_STORE_NAME, { id, data, timestamp });
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
  } catch (error) {
    console.error(`Failed to clear cache for id ${id}:`, error);
    throw error;
  }
}

export async function saveBitcoinRisk(riskLevel) {
  try {
    const db = await initDB();
    await db.put(RISK_STORE_NAME, { id: 'currentRisk', riskLevel, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to save Bitcoin risk level:', error);
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
    console.error('Failed to get Bitcoin risk level from IndexedDB:', error);
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