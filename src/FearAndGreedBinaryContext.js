import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCachedData, cacheData } from './utility/idbUtils'; // Use main IDB so binary F&G benefits from the caching layer too (prevents repeat API hits)

export const FearAndGreedBinaryContext = createContext();

export const FearAndGreedBinaryProvider = ({ children }) => {
  const [fearAndGreedBinaryData, setFearAndGreedBinaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const CATEGORY_MAP = {
    1: 'Extreme Fear',
    2: 'Fear',
    3: 'Neutral',
    4: 'Greed',
    5: 'Extreme Greed'
  };

  const fetchData = useCallback(async (retryCount = 0) => {
    const cacheId = 'fearAndGreedBinaryData';
    const currentDate = new Date().toISOString().split('T')[0];

    // Check IDB first (the central cache). This stops the "always hit API + no-store" behavior
    // for this provider (now that it's mounted). Falls back to net only if missing/stale.
    try {
      const cached = await getCachedData(cacheId);
      if (cached && cached.data && cached.data.length > 0) {
        const latest = cached.data[cached.data.length - 1];
        const latestDate = latest && latest.date ? new Date(latest.date).toISOString().split('T')[0] : null;
        // If we have data covering "today" (or recent), serve from cache and skip net.
        if (latestDate && latestDate >= currentDate) {
          setFearAndGreedBinaryData(cached.data);
          setLoading(false);
          setError(null);
          return;
        }
      }
    } catch (e) {
      // ignore IDB errors; fall to net
    }

    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      // Note: removed aggressive no-store (defeats our IDB). IDB + short re-fetch on demand is sufficient.
      const response = await fetch(`/api/fear-and-greed-binary/?_=${timestamp}`);

      if (response.status === 304 && retryCount < 3) {
        return fetchData(retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength < 4) {
        throw new Error('Response too short to contain record count');
      }

      const view = new DataView(arrayBuffer);
      const numRecords = view.getUint32(0, false);

      if (arrayBuffer.byteLength < 4 + numRecords * 6) {
        throw new Error('Incomplete data: buffer too short for records');
      }

      const records = [];
      for (let i = 0; i < numRecords; i++) {
        const offset = 4 + i * 6;
        const ts = view.getUint32(offset, false);
        const category = view.getInt8(offset + 4);
        const value = view.getInt8(offset + 5);

        records.push({
          date: new Date(ts * 1000),
          category: CATEGORY_MAP[category] || 'Unknown',
          value: value
        });
      }

      setFearAndGreedBinaryData(records);
      setLoading(false);
      setError(null);

      // Populate IDB so next load/mount hits cache (the fix for this bypass path).
      if (records.length > 0) {
        cacheData(cacheId, records, Date.now()).catch(() => {});
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <FearAndGreedBinaryContext.Provider value={{ fearAndGreedBinaryData, loading, error, refetch: fetchData }}>
      {children}
    </FearAndGreedBinaryContext.Provider>
  );
};