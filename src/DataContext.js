// src/DataContext.js
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { initDB, cacheData, getCachedData, clearCache } from './utility/idbUtils';

export const DataContext = createContext();

// Utility function for fetching and caching data with hybrid date/timestamp check
const fetchWithCache = async ({
  cacheId,
  apiUrl,
  formatData,
  setData,
  setLastUpdated,
  setIsFetched,
  cacheDuration = 24 * 60 * 60 * 1000, // Default to 24 hours (used only if useDateCheck is false)
  useDateCheck = true, // Default to date-based check for daily updates
}) => {
  if (typeof indexedDB === 'undefined') {
    console.warn('IndexedDB is not supported in this environment.');
    return false;
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = Date.now();

    // Check for cached data
    const cached = await getCachedData(cacheId);
    if (cached && cached.data.length > 0) {
      const { data: cachedData, timestamp } = cached;
      const latestCachedDate = cachedData[cachedData.length - 1].time;

      // Determine if we should reuse the cached data
      let shouldReuseCache = false;

      if (useDateCheck) {
        // Use date-based check for daily-updating data
        shouldReuseCache = latestCachedDate >= currentDate;
      } else {
        // Use timestamp-based check for datasets with custom cache duration
        const timeSinceLastFetch = currentTimestamp - timestamp;
        shouldReuseCache = timeSinceLastFetch < cacheDuration;
      }

      if (shouldReuseCache) {
        setData(cachedData);
        if (setLastUpdated) {
          setLastUpdated(latestCachedDate);
        }
        setIsFetched(true);
        return true;
      }

      // If the cache is stale, fetch new data and compare the latest date
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = formatData(data);
      const latestFetchedDate = formattedData.length > 0 ? formattedData[formattedData.length - 1].time : null;

      // If the fetched data isn't newer, reuse the cached data
      if (latestFetchedDate && latestCachedDate && latestFetchedDate <= latestCachedDate) {
        setData(cachedData);
        if (setLastUpdated) {
          setLastUpdated(latestCachedDate);
        }
        setIsFetched(true);
        // Update the timestamp to prevent refetching soon (even for date-based checks)
        await cacheData(cacheId, cachedData, currentTimestamp);
        return true;
      }

      // New data is available; update the cache
      setData(formattedData);
      if (formattedData.length > 0 && setLastUpdated) {
        setLastUpdated(latestFetchedDate);
      }
      await cacheData(cacheId, formattedData, currentTimestamp);
      setIsFetched(true);
      return true;
    }

    // No cached data; fetch from API
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    const formattedData = formatData(data);

    setData(formattedData);
    if (formattedData.length > 0 && setLastUpdated) {
      setLastUpdated(formattedData[formattedData.length - 1].time);
    }
    await cacheData(cacheId, formattedData, currentTimestamp);
    setIsFetched(true);
    return true;
  } catch (error) {
    console.error(`Error fetching or caching data for ${cacheId}:`, error);
    setIsFetched(false);
    return false;
  }
};

// Utility function for refreshing data
const refreshData = async ({
  cacheId,
  setData,
  setIsFetched,
  fetchFunction,
}) => {
  try {
    await clearCache(cacheId);
    setIsFetched(false);
    setData([]);
    await fetchFunction();
  } catch (error) {
    console.error(`Error refreshing data for ${cacheId}:`, error);
  }
};

export const DataProvider = ({ children }) => {
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

  const API_BASE_URL = 'https://vercel-dataflow.vercel.app/api';

  // Preload all of IndexedDB into state on app start to prevent unnecessary fetches
  useEffect(() => {
    const preloadData = async () => {
      const cacheConfigs = [
        { id: 'btcData', setData: setBtcData, setLastUpdated: setBtcLastUpdated, setIsFetched: setIsBtcDataFetched, useDateCheck: true },
        { id: 'fedBalanceData', setData: setFedBalanceData, setLastUpdated: setFedLastUpdated, setIsFetched: setIsFedBalanceDataFetched, useDateCheck: false, cacheDuration: 7 * 24 * 60 * 60 * 1000 },
        { id: 'mvrvData', setData: setMvrvData, setLastUpdated: setMvrvLastUpdated, setIsFetched: setIsMvrvDataFetched, useDateCheck: false, cacheDuration: 7 * 24 * 60 * 60 * 1000 },
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
    };

    preloadData();
  }, []);

  const fetchBtcData = useCallback(async () => {
    if (isBtcDataFetched) return;
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
      useDateCheck: true, // Daily updates
    });
  }, [isBtcDataFetched]);

  const refreshBtcData = useCallback(async () => {
    await refreshData({
      cacheId: 'btcData',
      setData: setBtcData,
      setIsFetched: setIsBtcDataFetched,
      fetchFunction: fetchBtcData,
    });
  }, [fetchBtcData]);

  const fetchFedBalanceData = useCallback(async () => {
    if (isFedBalanceDataFetched) return;
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
      useDateCheck: false, // Use timestamp check
      cacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }, [isFedBalanceDataFetched]);

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
      useDateCheck: false, // Use timestamp check
      cacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }, [isMvrvDataFetched]);

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
      useDateCheck: true, // Daily updates
    });
  }, [isDominanceDataFetched]);

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
      useDateCheck: true, // Daily updates
    });
  }, [isEthDataFetched]);

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
    await fetchWithCache({
      cacheId: 'fearAndGreedData',
      apiUrl: `${API_BASE_URL}/fear-and-greed/`,
      formatData: (data) => data,
      setData: setFearAndGreedData,
      setLastUpdated: setFearAndGreedLastUpdated,
      setIsFetched: setIsFearAndGreedDataFetched,
      useDateCheck: true, // Daily updates
    });
  }, [isFearAndGreedDataFetched]);

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
      useDateCheck: true, // Daily updates
    });
  }, [isMarketCapDataFetched]);

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
    await fetchWithCache({
      cacheId: 'macroData',
      apiUrl: `${API_BASE_URL}/combined-macro-data/`,
      formatData: (data) => data,
      setData: setMacroData,
      setLastUpdated: setMacroLastUpdated,
      setIsFetched: setIsMacroDataFetched,
      useDateCheck: true, // Daily updates
    });
  }, [isMacroDataFetched]);

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
      useDateCheck: true, // Daily updates (though this might update monthly; adjust if needed)
    });
  }, [isInflationDataFetched]);

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
      useDateCheck: true, // Daily updates (though this might update weekly; adjust if needed)
    });
  }, [isInitialClaimsDataFetched]);

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
      useDateCheck: true, // Daily updates (though this might update less frequently; adjust if needed)
    });
  }, [isInterestDataFetched]);

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
      useDateCheck: true, // Daily updates (though this might update monthly; adjust if needed)
    });
  }, [isUnemploymentDataFetched]);

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
      useDateCheck: true, // Daily updates
    });
  }, [isTxCountDataFetched]);

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
      useDateCheck: true, // Daily updates
    });
  }, [isTxCountCombinedDataFetched]);

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
      useDateCheck: true, // Daily updates
    });
  }, [isTxMvrvDataFetched]);

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
      useDateCheck: true, // Daily updates
    });
    if (!success) {
      setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: false }));
    }
  }, [isAltcoinDataFetched]);

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
      setLastUpdated: () => {}, // No lastUpdated state for fredSeriesData
      setIsFetched: () => {}, // No isFetched state for fredSeriesData
      useDateCheck: false, // Use timestamp check
      cacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days (FRED series typically update less frequently)
    });
    if (!success) {
      console.error(`Failed to fetch series ${seriesId}`);
    }
  }, [fredSeriesData]);

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

    setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: true }));
    const cacheId = 'indicatorData_btc-yield-recession';
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = Date.now();

    if (typeof indexedDB !== 'undefined') {
      try {
        const cached = await getCachedData(cacheId);
        if (cached && cached.data.length > 0) {
          const { data: cachedData, timestamp } = cached;
          const latestCachedDate = cachedData[cachedData.length - 1].date;
          // Use date check since this includes daily Bitcoin price data
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
  }, [isIndicatorDataFetched]);

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