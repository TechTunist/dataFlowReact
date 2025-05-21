import React, { createContext, useState, useEffect } from 'react';

export const FearAndGreedBinaryContext = createContext();

export const FearAndGreedBinaryProvider = ({ children }) => {
  const [fearAndGreedData, setFearAndGreedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const CATEGORY_MAP = {
    1: 'Extreme Fear',
    2: 'Fear',
    3: 'Neutral',
    4: 'Greed',
    5: 'Extreme Greed'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/fear-and-greed-binary/');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const view = new DataView(arrayBuffer);

        // Read number of records (4 bytes, big-endian)
        const numRecords = view.getUint32(0, false);
        const records = [];

        // Parse each 6-byte record starting at offset 4
        for (let i = 0; i < numRecords; i++) {
          const offset = 4 + i * 6;
          const timestamp = view.getUint32(offset, false); // 4-byte timestamp
          const category = view.getInt8(offset + 4); // 1-byte category
          const value = view.getInt8(offset + 5); // 1-byte value

          records.push({
            date: new Date(timestamp * 1000), // Convert UNIX timestamp to Date
            category: CATEGORY_MAP[category] || 'Unknown',
            value: value
          });
        }

        setFearAndGreedData(records);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <FearAndGreedBinaryContext.Provider value={{ fearAndGreedData, loading, error }}>
      {children}
    </FearAndGreedBinaryContext.Provider>
  );
};