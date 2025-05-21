// src/DataContext.js
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { initDB, cacheData, getCachedData, clearCache } from './utility/idbUtils';

export const DataContext = createContext();

const fetchWithCache = async ({
  cacheId,
  apiUrl,
  formatData,
  setData,
  setLastUpdated,
  setIsFetched,
  cacheDuration = 24 * 60 * 60 * 1000,
  useDateCheck = true,
}) => {
  if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB is not supported in this environment.');
      return false;
  }

  try {
      setIsFetched(true);
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTimestamp = Date.now();

      console.log(`Checking IndexedDB for ${cacheId}...`);
      const cachedStart = performance.now();
      const cached = await getCachedData(cacheId);
      console.log(`IndexedDB read for ${cacheId} took ${performance.now() - cachedStart}ms`);

      if (cached && cached.data) {
          let cachedData = Array.isArray(cached.data) ? cached.data : [cached.data]; // Handle single object or array
          if (cachedData.length > 0) {
              cachedData = [...cachedData].sort((a, b) => {
                  const timestampA = parseInt(a.timestamp, 10);
                  const timestampB = parseInt(b.timestamp, 10);
                  return timestampB - timestampA;
              });

              const lastRecord = cachedData[0];
              let latestCachedDate = lastRecord.time;

              if (!latestCachedDate && lastRecord.timestamp) {
                  latestCachedDate = new Date(parseInt(lastRecord.timestamp, 10) * 1000).toISOString().split('T')[0];
                  console.warn(`Missing time field in last record for ${cacheId}, computed from timestamp: ${latestCachedDate}`);
              }

              let shouldReuseCache = false;
              if (useDateCheck) {
                  console.log(`Using date check: latestCachedDate=${latestCachedDate}, currentDate=${currentDate}`);
                  if (!latestCachedDate) {
                      console.warn(`latestCachedDate is undefined for ${cacheId}, treating cache as stale`);
                      shouldReuseCache = false;
                  } else {
                      shouldReuseCache = latestCachedDate >= currentDate;
                  }
              } else {
                  const timeSinceLastFetch = currentTimestamp - cached.timestamp;
                  console.log(`Using timestamp check: timeSinceLastFetch=${timeSinceLastFetch}ms, cacheDuration=${cacheDuration}ms`);
                  shouldReuseCache = timeSinceLastFetch < cacheDuration;
              }

              if (shouldReuseCache) {
                  console.log(`Reusing cached data for ${cacheId}`);
                  setData(Array.isArray(cached.data) ? cachedData : cached.data); // Set single object or array
                  if (setLastUpdated) {
                      setLastUpdated(latestCachedDate);
                  }
                  return true;
              }
          }
      }

      console.log(`No cached data or stale cache for ${cacheId}, fetching from API...`);
      const maxRetries = 2;
      let attempts = 0;
      let response;
      while (attempts < maxRetries) {
          try {
              const fetchStart = performance.now();
              response = await fetch(apiUrl);
              console.log(`Fetch for ${apiUrl} took ${performance.now() - fetchStart}ms`);
              if (response.ok) break;
              throw new Error(`HTTP error! Status: ${response.status}`);
          } catch (err) {
              attempts++;
              console.warn(`Attempt ${attempts} failed for ${apiUrl}:`, err);
              if (attempts === maxRetries) throw err;
              await new Promise(resolve => setTimeout(resolve, 500));
          }
      }

      const data = await response.json();
      const formattedData = formatData(data);
      const isArray = Array.isArray(formattedData);
      const latestFetchedDate = isArray && formattedData.length > 0 
          ? formattedData[formattedData.length - 1].time 
          : formattedData.time || null;

      if (latestFetchedDate && cached && cached.data) {
          const cachedData = Array.isArray(cached.data) ? cached.data : [cached.data];
          const latestCachedDate = cachedData[cachedData.length - 1]?.time;
          if (latestCachedDate && latestFetchedDate <= latestCachedDate) {
              console.log(`Fetched data is not newer than cached data for ${cacheId}, reusing cache`);
              setData(Array.isArray(cached.data) ? cachedData : cached.data);
              if (setLastUpdated) {
                  setLastUpdated(latestCachedDate);
              }
              await cacheData(cacheId, cached.data, currentTimestamp);
              return true;
          }
      }

      console.log(`Updating cache with new data for ${cacheId}`);
      setData(formattedData);
      if (latestFetchedDate && setLastUpdated) {
          setLastUpdated(latestFetchedDate);
      }
      await cacheData(cacheId, formattedData, currentTimestamp);
      return true;
  } catch (error) {
      console.error(`Error fetching or caching data for ${cacheId}:`, error);
      setIsFetched(false);
      return false;
  }
};

const refreshData = async ({
  cacheId,
  setData,
  setIsFetched,
  fetchFunction,
}) => {
  try {
    console.log(`Refreshing data for ${cacheId}...`);
    await clearCache(cacheId);
    setIsFetched(false);
    setData([]);
    await fetchFunction();
  } catch (error) {
    console.error(`Error refreshing data for ${cacheId}:`, error);
  }
};

export const DataProvider = ({ children }) => {
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [btcData, setBtcData] = useState([]);
  const [fedBalanceData, setFedBalanceData] = useState([]);
  const [mvrvData, setMvrvData] = useState([]);
  const [btcLastUpdated, setBtcLastUpdated] = useState(null);
  const [fedLastUpdated, setFedLastUpdated] = useState(null);
  const [mvrvLastUpdated, setMvrvLastUpdated] = useState(null);
  const [isBtcDataFetched, setIsBtcDataFetched] = useState(false);
  const [isFedBalanceDataFetched, setIsFedBalanceDataFetched] = useState(false);
  const [isMvrvDataFetched, setIsMvrvDataFetched] = useState(false);
  const [dominanceData, setDominanceData] = useState([]);
  const [dominanceLastUpdated, setDominanceLastUpdated] = useState(null);
  const [isDominanceDataFetched, setIsDominanceDataFetched] = useState(false);
  const [ethData, setEthData] = useState([]);
  const [isEthDataFetched, setIsEthDataFetched] = useState(false);
  const [ethLastUpdated, setEthLastUpdated] = useState(null);
  const [fearAndGreedData, setFearAndGreedData] = useState([]);
  const [isFearAndGreedDataFetched, setIsFearAndGreedDataFetched] = useState(false);
  const [fearAndGreedLastUpdated, setFearAndGreedLastUpdated] = useState(null);
  const [marketCapData, setMarketCapData] = useState([]);
  const [isMarketCapDataFetched, setIsMarketCapDataFetched] = useState(false);
  const [marketCapLastUpdated, setMarketCapLastUpdated] = useState(null);
  const [macroData, setMacroData] = useState([]);
  const [isMacroDataFetched, setIsMacroDataFetched] = useState(false);
  const [macroLastUpdated, setMacroLastUpdated] = useState(null);
  const [inflationData, setInflationData] = useState([]);
  const [isInflationDataFetched, setIsInflationDataFetched] = useState(false);
  const [inflationLastUpdated, setInflationLastUpdated] = useState(null);
  const [initialClaimsData, setInitialClaimsData] = useState([]);
  const [isInitialClaimsDataFetched, setIsInitialClaimsDataFetched] = useState(false);
  const [initialClaimsLastUpdated, setInitialClaimsLastUpdated] = useState(null);
  const [interestData, setInterestData] = useState([]);
  const [isInterestDataFetched, setIsInterestDataFetched] = useState(false);
  const [interestLastUpdated, setInterestLastUpdated] = useState(null);
  const [unemploymentData, setUnemploymentData] = useState([]);
  const [isUnemploymentDataFetched, setIsUnemploymentDataFetched] = useState(false);
  const [unemploymentLastUpdated, setUnemploymentLastUpdated] = useState(null);
  const [txCountData, setTxCountData] = useState([]);
  const [isTxCountDataFetched, setIsTxCountDataFetched] = useState(false);
  const [txCountLastUpdated, setTxCountLastUpdated] = useState(null);
  const [txCountCombinedData, setTxCountCombinedData] = useState([]);
  const [isTxCountCombinedDataFetched, setIsTxCountCombinedDataFetched] = useState(false);
  const [txCountCombinedLastUpdated, setTxCountCombinedLastUpdated] = useState(null);
  const [txMvrvData, setTxMvrvData] = useState([]);
  const [isTxMvrvDataFetched, setIsTxMvrvDataFetched] = useState(false);
  const [txMvrvLastUpdated, setTxMvrvLastUpdated] = useState(null);
  const [fredSeriesData, setFredSeriesData] = useState({});
  const [altcoinData, setAltcoinData] = useState({});
  const [altcoinLastUpdated, setAltcoinLastUpdated] = useState({});
  const [isAltcoinDataFetched, setIsAltcoinDataFetched] = useState({});
  const [indicatorData, setIndicatorData] = useState({});
  const [isIndicatorDataFetched, setIsIndicatorDataFetched] = useState({});
  const [latestFearAndGreed, setLatestFearAndGreed] = useState(null);
  const [isLatestFearAndGreedFetched, setIsLatestFearAndGreedFetched] = useState(false);
  const [latestFearAndGreedLastUpdated, setLatestFearAndGreedLastUpdated] = useState(null);

  const API_BASE_URL = 'https://vercel-dataflow.vercel.app/api';
  // const API_BASE_URL = 'http://127.0.0.1:8000/api';

  useEffect(() => {
    const preloadData = async () => {
      const cacheConfigs = [
        { id: 'btcData', setData: setBtcData, setLastUpdated: setBtcLastUpdated, setIsFetched: setIsBtcDataFetched, useDateCheck: true },
        { id: 'fedBalanceData', setData: setFedBalanceData, setLastUpdated: setFedLastUpdated, setIsFetched: setIsFedBalanceDataFetched, useDateCheck: false, cacheDuration: 7 * 24 * 60 * 60 * 1000 },
        { id: 'mvrvData', setData: setMvrvData, setLastUpdated: setMvrvLastUpdated, setIsFetched: setIsMvrvDataFetched, useDateCheck: true },
        { id: 'dominanceData', setData: setDominanceData, setLastUpdated: setDominanceLastUpdated, setIsFetched: setIsDominanceDataFetched, useDateCheck: true },
        { id: 'ethData', setData: setEthData, setLastUpdated: setEthLastUpdated, setIsFetched: setIsEthDataFetched, useDateCheck: true },
        { id: 'fearAndGreedData', setData: setFearAndGreedData, setLastUpdated: setFearAndGreedLastUpdated, setIsFetched: setIsFearAndGreedDataFetched, useDateCheck: true },
        { id: 'marketCapData', setData: setMarketCapData, setLastUpdated: setMarketCapLastUpdated, setIsFetched: setIsMarketCapDataFetched, useDateCheck: true },
        { id: 'macroData', setData: setMacroData, setLastUpdated: setMacroLastUpdated, setIsFetched: setIsMacroDataFetched, useDateCheck: true },
        { id: 'inflationData', setData: setInflationData, setLastUpdated: setInflationLastUpdated, setIsFetched: setIsInflationDataFetched, useDateCheck: true },
        { id: 'initialClaimsData', setData: setInitialClaimsData, setLastUpdated: setInitialClaimsLastUpdated, setIsFetched: setIsInitialClaimsDataFetched, useDateCheck: true },
        { id: 'interestData', setData: setInterestData, setLastUpdated: setInterestLastUpdated, setIsFetched: setIsInterestDataFetched, useDateCheck: true },
        { id: 'unemploymentData', setData: setUnemploymentData, setLastUpdated: setUnemploymentLastUpdated, setIsFetched: setIsUnemploymentDataFetched, useDateCheck: true },
        { id: 'txCountData', setData: setTxCountData, setLastUpdated: setTxCountLastUpdated, setIsFetched: setIsTxCountDataFetched, useDateCheck: true },
        { id: 'txCountCombinedData', setData: setTxCountCombinedData, setLastUpdated: setTxCountCombinedLastUpdated, setIsFetched: setIsTxCountCombinedDataFetched, useDateCheck: true },
        { id: 'txMvrvData', setData: setTxMvrvData, setLastUpdated: setTxMvrvLastUpdated, setIsFetched: setIsTxMvrvDataFetched, useDateCheck: true },
        { id: 'latestFearAndGreed', setData: setLatestFearAndGreed, setLastUpdated: setLatestFearAndGreedLastUpdated, setIsFetched: setIsLatestFearAndGreedFetched, useDateCheck: true },
      ];

      for (const { id, setData, setLastUpdated, setIsFetched, useDateCheck, cacheDuration } of cacheConfigs) {
        try {
          const cached = await getCachedData(id);
          if (cached && cached.data.length > 0) {
            const { data: cachedData, timestamp } = cached;
            const currentDate = new Date().toISOString().split('T')[0];
            const currentTimestamp = Date.now();
            const latestCachedDate = cachedData[cachedData.length - 1].time;

            let shouldReuseCache = false;
            if (useDateCheck) {
              shouldReuseCache = latestCachedDate >= currentDate;
            } else {
              const timeSinceLastFetch = currentTimestamp - timestamp;
              shouldReuseCache = timeSinceLastFetch < (cacheDuration || 24 * 60 * 60 * 1000);
            }

            if (shouldReuseCache) {
              setData(cachedData);
              if (setLastUpdated) {
                setLastUpdated(latestCachedDate);
              }
              setIsFetched(true);
            }
          }
        } catch (error) {
          console.error(`Error preloading data for ${id}:`, error);
        }
      }
      setPreloadComplete(true);
    };

    preloadData();
  }, []);

  const fetchBtcData = useCallback(async () => {
    if (isBtcDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isBtcDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'btcData',
      apiUrl: `${API_BASE_URL}/btc/price/`,
      formatData: (data) =>
        data
          .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
          .map((item) => ({
            time: item.date,
            value: parseFloat(item.close),
          })),
      setData: setBtcData,
      setLastUpdated: setBtcLastUpdated,
      setIsFetched: setIsBtcDataFetched,
      useDateCheck: true,
    });
  }, [isBtcDataFetched, preloadComplete]);

  const refreshBtcData = useCallback(async () => {
    await refreshData({
      cacheId: 'btcData',
      setData: setBtcData,
      setIsFetched: setIsBtcDataFetched,
      fetchFunction: fetchBtcData,
    });
  }, [fetchBtcData]);

  const fetchLatestFearAndGreed = useCallback(async () => {
    if (isLatestFearAndGreedFetched) return;
    if (!preloadComplete) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (isLatestFearAndGreedFetched) return;
    }
    await fetchWithCache({
        cacheId: 'latestFearAndGreed',
        apiUrl: `${API_BASE_URL}/fear-and-greed/latest/`,
        formatData: (data) => ({
            value: parseInt(data.value),
            value_classification: data.value_classification,
            timestamp: data.timestamp,
            time: new Date(data.timestamp * 1000).toISOString().split('T')[0],
        }),
        setData: setLatestFearAndGreed,
        setLastUpdated: setLatestFearAndGreedLastUpdated,
        setIsFetched: setIsLatestFearAndGreedFetched,
        useDateCheck: true,
    });
  }, [isLatestFearAndGreedFetched, preloadComplete]);

  // Add refresh function
  const refreshLatestFearAndGreed = useCallback(async () => {
      await refreshData({
          cacheId: 'latestFearAndGreed',
          setData: setLatestFearAndGreed,
          setIsFetched: setIsLatestFearAndGreedFetched,
          fetchFunction: fetchLatestFearAndGreed,
      });
  }, [fetchLatestFearAndGreed]);

  const fetchFedBalanceData = useCallback(async () => {
    if (isFedBalanceDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isFedBalanceDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'fedBalanceData',
      apiUrl: `${API_BASE_URL}/fed-balance/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.observation_date,
          value: parseFloat(item.value) / 1000000,
        })),
      setData: setFedBalanceData,
      setLastUpdated: setFedLastUpdated,
      setIsFetched: setIsFedBalanceDataFetched,
      useDateCheck: false,
      cacheDuration: 7 * 24 * 60 * 60 * 1000,
    });
  }, [isFedBalanceDataFetched, preloadComplete]);

  const refreshFedBalanceData = useCallback(async () => {
    await refreshData({
      cacheId: 'fedBalanceData',
      setData: setFedBalanceData,
      setIsFetched: setIsFedBalanceDataFetched,
      fetchFunction: fetchFedBalanceData,
    });
  }, [fetchFedBalanceData]);

  const fetchMvrvData = useCallback(async () => {
    if (isMvrvDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isMvrvDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'mvrvData',
      apiUrl: `${API_BASE_URL}/mvrv/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.time.split('T')[0],
          value: parseFloat(item.cap_mvrv_cur),
        })),
      setData: setMvrvData,
      setLastUpdated: setMvrvLastUpdated,
      setIsFetched: setIsMvrvDataFetched,
      useDateCheck: false,
      cacheDuration: 7 * 24 * 60 * 60 * 1000,
    });
  }, [isMvrvDataFetched, preloadComplete]);

  const refreshMvrvData = useCallback(async () => {
    await refreshData({
      cacheId: 'mvrvData',
      setData: setMvrvData,
      setIsFetched: setIsMvrvDataFetched,
      fetchFunction: fetchMvrvData,
    });
  }, [fetchMvrvData]);

  const fetchDominanceData = useCallback(async () => {
    if (isDominanceDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isDominanceDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'dominanceData',
      apiUrl: `${API_BASE_URL}/dominance/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.date,
          value: parseFloat(item.btc),
        })),
      setData: setDominanceData,
      setLastUpdated: setDominanceLastUpdated,
      setIsFetched: setIsDominanceDataFetched,
      useDateCheck: true,
    });
  }, [isDominanceDataFetched, preloadComplete]);

  const refreshDominanceData = useCallback(async () => {
    await refreshData({
      cacheId: 'dominanceData',
      setData: setDominanceData,
      setIsFetched: setIsDominanceDataFetched,
      fetchFunction: fetchDominanceData,
    });
  }, [fetchDominanceData]);

  const fetchEthData = useCallback(async () => {
    if (isEthDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isEthDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'ethData',
      apiUrl: `${API_BASE_URL}/eth/price/`,
      formatData: (data) =>
        data
          .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
          .map((item) => ({
            time: item.date,
            value: parseFloat(item.close),
          })),
      setData: setEthData,
      setLastUpdated: setEthLastUpdated,
      setIsFetched: setIsEthDataFetched,
      useDateCheck: true,
    });
  }, [isEthDataFetched, preloadComplete]);

  const refreshEthData = useCallback(async () => {
    await refreshData({
      cacheId: 'ethData',
      setData: setEthData,
      setIsFetched: setIsEthDataFetched,
      fetchFunction: fetchEthData,
    });
  }, [fetchEthData]);

  const fetchFearAndGreedData = useCallback(async () => {
    if (isFearAndGreedDataFetched) return;
    if (!preloadComplete) {
      console.log('Waiting for preload to complete before fetching Fear and Greed data...');
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isFearAndGreedDataFetched) {
        console.log('Fear and Greed data already fetched during preload, skipping fetch');
        return;
      }
    }
    await fetchWithCache({
      cacheId: 'fearAndGreedData',
      apiUrl: `${API_BASE_URL}/fear-and-greed/`,
      formatData: (data) =>
        data.map(item => ({
          value: item.value,
          value_classification: item.value_classification,
          timestamp: item.timestamp, // Keep the original timestamp
          time: new Date(item.timestamp * 1000).toISOString().split('T')[0], // Add time field
        })),
      setData: setFearAndGreedData,
      setLastUpdated: setFearAndGreedLastUpdated,
      setIsFetched: setIsFearAndGreedDataFetched,
      useDateCheck: true,
    });
  }, [isFearAndGreedDataFetched, preloadComplete]);

  const refreshFearAndGreedData = useCallback(async () => {
    await refreshData({
      cacheId: 'fearAndGreedData',
      setData: setFearAndGreedData,
      setIsFetched: setIsFearAndGreedDataFetched,
      fetchFunction: fetchFearAndGreedData,
    });
  }, [fetchFearAndGreedData]);

  const fetchMarketCapData = useCallback(async () => {
    if (isMarketCapDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isMarketCapDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'marketCapData',
      apiUrl: `${API_BASE_URL}/total/marketcap/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.date,
          value: parseFloat(item.market_cap),
        })),
      setData: setMarketCapData,
      setLastUpdated: setMarketCapLastUpdated,
      setIsFetched: setIsMarketCapDataFetched,
      useDateCheck: true,
    });
  }, [isMarketCapDataFetched, preloadComplete]);

  const refreshMarketCapData = useCallback(async () => {
    await refreshData({
      cacheId: 'marketCapData',
      setData: setMarketCapData,
      setIsFetched: setIsMarketCapDataFetched,
      fetchFunction: fetchMarketCapData,
    });
  }, [fetchMarketCapData]);

  const fetchMacroData = useCallback(async () => {
    if (isMacroDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isMacroDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'macroData',
      apiUrl: `${API_BASE_URL}/combined-macro-data/`,
      formatData: (data) => data,
      setData: setMacroData,
      setLastUpdated: setMacroLastUpdated,
      setIsFetched: setIsMacroDataFetched,
      useDateCheck: true,
    });
  }, [isMacroDataFetched, preloadComplete]);

  const refreshMacroData = useCallback(async () => {
    await refreshData({
      cacheId: 'macroData',
      setData: setMacroData,
      setIsFetched: setIsMacroDataFetched,
      fetchFunction: fetchMacroData,
    });
  }, [fetchMacroData]);

  const fetchInflationData = useCallback(async () => {
    if (isInflationDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isInflationDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'inflationData',
      apiUrl: `${API_BASE_URL}/us-inflation/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.date,
          value: parseFloat(item.value),
        })),
      setData: setInflationData,
      setLastUpdated: setInflationLastUpdated,
      setIsFetched: setIsInflationDataFetched,
      useDateCheck: true,
    });
  }, [isInflationDataFetched, preloadComplete]);

  const refreshInflationData = useCallback(async () => {
    await refreshData({
      cacheId: 'inflationData',
      setData: setInflationData,
      setIsFetched: setIsInflationDataFetched,
      fetchFunction: fetchInflationData,
    });
  }, [fetchInflationData]);

  const fetchInitialClaimsData = useCallback(async () => {
    if (isInitialClaimsDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isInitialClaimsDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'initialClaimsData',
      apiUrl: `${API_BASE_URL}/initial-claims/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.date,
          value: parseInt(item.value, 10),
        })),
      setData: setInitialClaimsData,
      setLastUpdated: setInitialClaimsLastUpdated,
      setIsFetched: setIsInitialClaimsDataFetched,
      useDateCheck: true,
    });
  }, [isInitialClaimsDataFetched, preloadComplete]);

  const refreshInitialClaimsData = useCallback(async () => {
    await refreshData({
      cacheId: 'initialClaimsData',
      setData: setInitialClaimsData,
      setIsFetched: setIsInitialClaimsDataFetched,
      fetchFunction: fetchInitialClaimsData,
    });
  }, [fetchInitialClaimsData]);

  const fetchInterestData = useCallback(async () => {
    if (isInterestDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isInterestDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'interestData',
      apiUrl: `${API_BASE_URL}/us-interest/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.date,
          value: parseFloat(item.value),
        })),
      setData: setInterestData,
      setLastUpdated: setInterestLastUpdated,
      setIsFetched: setIsInterestDataFetched,
      useDateCheck: true,
    });
  }, [isInterestDataFetched, preloadComplete]);

  const refreshInterestData = useCallback(async () => {
    await refreshData({
      cacheId: 'interestData',
      setData: setInterestData,
      setIsFetched: setIsInterestDataFetched,
      fetchFunction: fetchInterestData,
    });
  }, [fetchInterestData]);

  const fetchUnemploymentData = useCallback(async () => {
    if (isUnemploymentDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isUnemploymentDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'unemploymentData',
      apiUrl: `${API_BASE_URL}/us-unemployment/`,
      formatData: (data) =>
        data.map((item) => ({
          time: item.date,
          value: parseFloat(item.value),
        })),
      setData: setUnemploymentData,
      setLastUpdated: setUnemploymentLastUpdated,
      setIsFetched: setIsUnemploymentDataFetched,
      useDateCheck: true,
    });
  }, [isUnemploymentDataFetched, preloadComplete]);

  const refreshUnemploymentData = useCallback(async () => {
    await refreshData({
      cacheId: 'unemploymentData',
      setData: setUnemploymentData,
      setIsFetched: setIsUnemploymentDataFetched,
      fetchFunction: fetchUnemploymentData,
    });
  }, [fetchUnemploymentData]);

  const fetchTxCountData = useCallback(async () => {
    if (isTxCountDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isTxCountDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'txCountData',
      apiUrl: `${API_BASE_URL}/btc-tx-count/`,
      formatData: (data) =>
        data
          .map((item) => ({
            time: item.time.split('T')[0],
            value: parseFloat(item.tx_count),
          }))
          .sort((a, b) => new Date(a.time) - new Date(b.time)),
      setData: setTxCountData,
      setLastUpdated: setTxCountLastUpdated,
      setIsFetched: setIsTxCountDataFetched,
      useDateCheck: true,
    });
  }, [isTxCountDataFetched, preloadComplete]);

  const refreshTxCountData = useCallback(async () => {
    await refreshData({
      cacheId: 'txCountData',
      setData: setTxCountData,
      setIsFetched: setIsTxCountDataFetched,
      fetchFunction: fetchTxCountData,
    });
  }, [fetchTxCountData]);

  const fetchTxCountCombinedData = useCallback(async () => {
    if (isTxCountCombinedDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isTxCountCombinedDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'txCountCombinedData',
      apiUrl: `${API_BASE_URL}/tx-macro/`,
      formatData: (data) => {
        let lastInflation = null;
        let lastUnemployment = null;
        let lastFedFunds = null;
        return data
          .map((item) => {
            if (item.inflation_rate !== null) lastInflation = parseFloat(item.inflation_rate);
            if (item.unemployment_rate !== null) lastUnemployment = parseFloat(item.unemployment_rate);
            if (item.interest_rate !== null) lastFedFunds = parseFloat(item.interest_rate);
            return {
              time: item.date.split('T')[0],
              tx_count: item.tx_count ? parseFloat(item.tx_count) : null,
              price: item.price ? parseFloat(item.price) : null,
              inflation_rate: lastInflation,
              unemployment_rate: lastUnemployment,
              fed_funds_rate: lastFedFunds,
            };
          })
          .sort((a, b) => new Date(a.time) - new Date(b.time));
      },
      setData: setTxCountCombinedData,
      setLastUpdated: setTxCountCombinedLastUpdated,
      setIsFetched: setIsTxCountCombinedDataFetched,
      useDateCheck: true,
    });
  }, [isTxCountCombinedDataFetched, preloadComplete]);

  const refreshTxCountCombinedData = useCallback(async () => {
    await refreshData({
      cacheId: 'txCountCombinedData',
      setData: setTxCountCombinedData,
      setIsFetched: setIsTxCountCombinedDataFetched,
      fetchFunction: fetchTxCountCombinedData,
    });
  }, [fetchTxCountCombinedData]);

  const fetchTxMvrvData = useCallback(async () => {
    if (isTxMvrvDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isTxMvrvDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'txMvrvData',
      apiUrl: `${API_BASE_URL}/tx-mvrv/`,
      formatData: (data) =>
        data
          .map((item) => ({
            time: item.date,
            tx_count: parseFloat(item.tx_count),
            mvrv: parseFloat(item.mvrv),
          }))
          .sort((a, b) => new Date(a.time) - new Date(b.time)),
      setData: setTxMvrvData,
      setLastUpdated: setTxMvrvLastUpdated,
      setIsFetched: setIsTxMvrvDataFetched,
      useDateCheck: true,
    });
  }, [isTxMvrvDataFetched, preloadComplete]);

  const refreshTxMvrvData = useCallback(async () => {
    await refreshData({
      cacheId: 'txMvrvData',
      setData: setTxMvrvData,
      setIsFetched: setIsTxMvrvDataFetched,
      fetchFunction: fetchTxMvrvData,
    });
  }, [fetchTxMvrvData]);

  const fetchAltcoinData = useCallback(async (coin) => {
    if (isAltcoinDataFetched[coin]) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isAltcoinDataFetched[coin]) return;
    }
    setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: true }));
    const success = await fetchWithCache({
      cacheId: `altcoinData_${coin}`,
      apiUrl: `${API_BASE_URL}/${coin.toLowerCase()}/price/`,
      formatData: (data) =>
        data
          .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
          .map((item) => ({
            time: item.date,
            value: parseFloat(item.close),
          })),
      setData: (data) => setAltcoinData((prev) => ({ ...prev, [coin]: data })),
      setLastUpdated: (time) =>
        setAltcoinLastUpdated((prev) => ({ ...prev, [coin]: time })),
      setIsFetched: (fetched) =>
        setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: fetched })),
      useDateCheck: true,
    });
    if (!success) {
      setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: false }));
    }
  }, [isAltcoinDataFetched, preloadComplete]);

  const refreshAltcoinData = useCallback(async (coin) => {
    await refreshData({
      cacheId: `altcoinData_${coin}`,
      setData: () => setAltcoinData((prev) => ({ ...prev, [coin]: [] })),
      setIsFetched: () =>
        setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: false })),
      fetchFunction: () => fetchAltcoinData(coin),
    });
  }, [fetchAltcoinData]);

  const fetchFredSeriesData = useCallback(async (seriesId) => {
    if (fredSeriesData[seriesId]?.length > 0) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (fredSeriesData[seriesId]?.length > 0) return;
    }
    const success = await fetchWithCache({
      cacheId: `fredSeriesData_${seriesId}`,
      apiUrl: `${API_BASE_URL}/series/${seriesId}/observations/`,
      formatData: (data) => {
        let lastValidValue = null;
        return data
          .map((item) => {
            const value =
              item.value != null && !isNaN(parseFloat(item.value))
                ? parseFloat(item.value)
                : lastValidValue;
            if (value !== null) {
              lastValidValue = value;
            }
            return {
              time: item.date,
              value,
            };
          })
          .filter((item) => item.value !== null);
      },
      setData: (data) => setFredSeriesData((prev) => ({ ...prev, [seriesId]: data })),
      setLastUpdated: () => {},
      setIsFetched: () => {},
      useDateCheck: false,
      cacheDuration: 7 * 24 * 60 * 60 * 1000,
    });
    if (!success) {
      console.error(`Failed to fetch series ${seriesId}`);
    }
  }, [fredSeriesData, preloadComplete]);

  const refreshFredSeriesData = useCallback(async (seriesId) => {
    await refreshData({
      cacheId: `fredSeriesData_${seriesId}`,
      setData: () => setFredSeriesData((prev) => ({ ...prev, [seriesId]: [] })),
      setIsFetched: () => {},
      fetchFunction: () => fetchFredSeriesData(seriesId),
    });
  }, [fetchFredSeriesData]);

  const fetchIndicatorData = useCallback(async (indicatorId) => {
    if (indicatorId !== 'btc-yield-recession') return;
    if (isIndicatorDataFetched[indicatorId]) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isIndicatorDataFetched[indicatorId]) return;
    }

    setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: true }));
    const cacheId = 'indicatorData_btc-yield-recession';
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = Date.now();

    if (typeof indexedDB !== 'undefined') {
      try {
        const cached = await getCachedData(cacheId);
        if (cached && cached.data.length > 0) {
          const { data: cachedData } = cached;
          const latestCachedDate = cachedData[cachedData.length - 1].date;
          if (latestCachedDate >= currentDate) {
            setIndicatorData((prev) => ({ ...prev, [indicatorId]: cachedData }));
            setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: true }));
            return;
          }
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for indicator data:', error);
      }
    }

    try {
      const btcResponse = await fetch(`${API_BASE_URL}/btc/price/`);
      const btcData = await btcResponse.json();
      const t10y2yResponse = await fetch(`${API_BASE_URL}/series/T10Y2Y/observations/`);
      const t10y2yData = await t10y2yResponse.json();
      const usrecdResponse = await fetch(`${API_BASE_URL}/series/USRECD/observations/`);
      let usrecdData = await usrecdResponse.json();
      const fedFundsResponse = await fetch(`${API_BASE_URL}/us-interest/`);
      const fedFundsData = await fedFundsResponse.json();
      const m2Response = await fetch(`${API_BASE_URL}/series/M2SL/observations/`);
      const m2Data = await m2Response.json();

      const startDate = '2011-08-19';
      const endDate = currentDate;
      const dateRange = [];
      let currentDateObj = new Date(startDate);
      while (currentDateObj <= new Date(endDate)) {
        dateRange.push(currentDateObj.toISOString().split('T')[0]);
        currentDateObj.setDate(currentDateObj.getDate() + 1);
      }

      const btcMap = new Map(btcData.map((d) => [d.date, parseFloat(d.close)]));
      const t10y2yMap = new Map(t10y2yData.map((d) => [d.date, parseFloat(d.value)]));
      const usrecdMap = new Map(usrecdData.map((d) => [d.date, parseInt(d.value)]));
      const fedFundsMap = new Map(fedFundsData.map((d) => [d.date, parseFloat(d.value)]));
      const m2Map = new Map(m2Data.map((d) => [d.date, parseFloat(d.value)]));

      const m2GrowthMap = new Map();
      dateRange.forEach((date) => {
        const dateObj = new Date(date);
        const oneYearAgo = new Date(dateObj);
        oneYearAgo.setFullYear(dateObj.getFullYear() - 1);
        const oneYearAgoDate = oneYearAgo.toISOString().split('T')[0];
        const currentM2 = m2Map.get(date) || m2Map.get([...m2Map.keys()].reverse().find((d) => d < date));
        const pastM2 =
          m2Map.get(oneYearAgoDate) || m2Map.get([...m2Map.keys()].reverse().find((d) => d < oneYearAgoDate));
        if (currentM2 && pastM2) {
          const growth = ((currentM2 - pastM2) / pastM2) * 100;
          m2GrowthMap.set(date, growth);
        }
      });

      usrecdData = dateRange.map((date) => {
        const value = usrecdMap.get(date) || usrecdMap.get([...usrecdMap.keys()].reverse().find((d) => d < date)) || 0;
        return { date, value };
      });
      usrecdMap.clear();
      usrecdData.forEach((d) => usrecdMap.set(d.date, d.value));

      const combinedData = dateRange
        .map((date) => ({
          date,
          btc: btcMap.get(date) || btcMap.get([...btcMap.keys()].reverse().find((d) => d < date)),
          t10y2y: t10y2yMap.get(date) || t10y2yMap.get([...t10y2yMap.keys()].reverse().find((d) => d < date)),
          fedFunds: fedFundsMap.get(date) || fedFundsMap.get([...fedFundsMap.keys()].reverse().find((d) => d < date)),
          m2Growth: m2GrowthMap.get(date) || m2GrowthMap.get([...m2GrowthMap.keys()].reverse().find((d) => d < date)),
          usrecd: usrecdMap.get(date) || 0,
        }))
        .filter((d) => d.btc !== undefined && d.t10y2y !== undefined && d.fedFunds !== undefined && d.m2Growth !== undefined);

      setIndicatorData((prev) => ({ ...prev, [indicatorId]: combinedData }));
      if (typeof indexedDB !== 'undefined' && combinedData.length > 0) {
        await cacheData(cacheId, combinedData, Date.now());
      }
    } catch (error) {
      console.error('Error fetching indicator data:', error);
      setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: false }));
    }
  }, [isIndicatorDataFetched, preloadComplete]);

  const refreshIndicatorData = useCallback(async (indicatorId) => {
    if (indicatorId !== 'btc-yield-recession') return;
    try {
      await clearCache('indicatorData_btc-yield-recession');
      setIndicatorData((prev) => ({ ...prev, [indicatorId]: [] }));
      setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: false }));
      await fetchIndicatorData(indicatorId);
    } catch (error) {
      console.error('Error refreshing indicator data:', error);
    }
  }, [fetchIndicatorData]);

  return (
    <DataContext.Provider
      value={{
        btcData,
        fetchBtcData,
        refreshBtcData,
        btcLastUpdated,
        fedBalanceData,
        fetchFedBalanceData,
        refreshFedBalanceData,
        fedLastUpdated,
        mvrvData,
        fetchMvrvData,
        refreshMvrvData,
        mvrvLastUpdated,
        dominanceData,
        fetchDominanceData,
        refreshDominanceData,
        dominanceLastUpdated,
        ethData,
        fetchEthData,
        refreshEthData,
        ethLastUpdated,
        fearAndGreedData,
        fetchFearAndGreedData,
        refreshFearAndGreedData,
        fearAndGreedLastUpdated,
        latestFearAndGreed,
        fetchLatestFearAndGreed,
        refreshLatestFearAndGreed,
        latestFearAndGreedLastUpdated,
        marketCapData,
        fetchMarketCapData,
        refreshMarketCapData,
        marketCapLastUpdated,
        macroData,
        fetchMacroData,
        refreshMacroData,
        macroLastUpdated,
        inflationData,
        fetchInflationData,
        refreshInflationData,
        inflationLastUpdated,
        initialClaimsData,
        fetchInitialClaimsData,
        refreshInitialClaimsData,
        initialClaimsLastUpdated,
        interestData,
        fetchInterestData,
        refreshInterestData,
        interestLastUpdated,
        unemploymentData,
        fetchUnemploymentData,
        refreshUnemploymentData,
        unemploymentLastUpdated,
        txCountData,
        fetchTxCountData,
        refreshTxCountData,
        txCountLastUpdated,
        txCountCombinedData,
        fetchTxCountCombinedData,
        refreshTxCountCombinedData,
        txCountCombinedLastUpdated,
        txMvrvData,
        fetchTxMvrvData,
        refreshTxMvrvData,
        txMvrvLastUpdated,
        altcoinData,
        fetchAltcoinData,
        refreshAltcoinData,
        altcoinLastUpdated,
        fredSeriesData,
        fetchFredSeriesData,
        refreshFredSeriesData,
        indicatorData,
        fetchIndicatorData,
        refreshIndicatorData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);