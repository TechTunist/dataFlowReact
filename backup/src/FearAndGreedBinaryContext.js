import React, { createContext, useState, useEffect, useCallback } from 'react';

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
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/fear-and-greed-binary/?_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'If-Modified-Since': '0' // Force server to revalidate
        }
      });

      if (response.status === 304 && retryCount < 3) {
        // console.log('304 Not Modified, retrying...', retryCount + 1);
        return fetchData(retryCount + 1); // Retry on 304
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      // console.log('Raw Buffer Length:', arrayBuffer.byteLength);
      if (arrayBuffer.byteLength < 4) {
        throw new Error('Response too short to contain record count');
      }

      const view = new DataView(arrayBuffer);
      const numRecords = view.getUint32(0, false);
      // console.log('Number of Records:', numRecords);

      if (arrayBuffer.byteLength < 4 + numRecords * 6) {
        throw new Error('Incomplete data: buffer too short for records');
      }

      const records = [];
      for (let i = 0; i < numRecords; i++) {
        const offset = 4 + i * 6;
        const timestamp = view.getUint32(offset, false);
        const category = view.getInt8(offset + 4);
        const value = view.getInt8(offset + 5);

        records.push({
          date: new Date(timestamp * 1000),
          category: CATEGORY_MAP[category] || 'Unknown',
          value: value
        });
      }

      // console.log('Parsed Records:', records.slice(0, 5));
      setFearAndGreedBinaryData(records);
      setLoading(false);
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