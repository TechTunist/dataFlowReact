// src/utility/idbUtils.js
import { openDB } from 'idb';

const DB_NAME = 'CryptoDataDB';
const STORE_NAME = 'apiData';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function cacheData(id, data, timestamp) {
  const db = await initDB();
  await db.put(STORE_NAME, { id, data, timestamp });
}

export async function getCachedData(id) {
  const db = await initDB();
  return db.get(STORE_NAME, id);
}

export async function clearCache(id) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}