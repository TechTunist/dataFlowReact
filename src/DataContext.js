// src/DataContext.js
import React, { createContext, useState, useCallback, useContext, useEffect, useMemo } from 'react';
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
    // console.warn('IndexedDB is not supported in this environment.');
    return false;
  }

  try {
    setIsFetched(true);
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = Date.now();

    const cached = await getCachedData(cacheId);

    if (cached && cached.data) {
      let cachedData = Array.isArray(cached.data) ? cached.data : [cached.data];
      if (cachedData.length > 0) {
        cachedData = [...cachedData].sort((a, b) => {
          const timeA = new Date(a.time).getTime();
          const timeB = new Date(b.time).getTime();
          return timeA - timeB;
        });

        const firstRecord = cachedData[0];
        const lastRecord = cachedData[cachedData.length - 1];
        let firstCachedDate = firstRecord.time;
        let latestCachedDate = lastRecord.time;

        if (!latestCachedDate && lastRecord.timestamp) {
          latestCachedDate = new Date(parseInt(lastRecord.timestamp, 10) * 1000).toISOString().split('T')[0];
          // console.warn(`Missing time field in last record for ${cacheId}, computed from timestamp: ${latestCachedDate}`);
        }
        if (!firstCachedDate && firstRecord.timestamp) {
          firstCachedDate = new Date(parseInt(firstRecord.timestamp, 10) * 1000).toISOString().split('T')[0];
          // console.warn(`Missing time field in first record for ${cacheId}, computed from timestamp: ${firstCachedDate}`);
        }

        let shouldReuseCache = false;
        if (useDateCheck) {
          if (!latestCachedDate) {
            // console.warn(`latestCachedDate is undefined for ${cacheId}, treating cache as stale`);
            shouldReuseCache = false;
          } else {
            shouldReuseCache = latestCachedDate >= currentDate;
          }
        } else {
          const timeSinceLastFetch = currentTimestamp - cached.timestamp;
          shouldReuseCache = timeSinceLastFetch < cacheDuration;
        }

        if (shouldReuseCache) {
          setData(Array.isArray(cached.data) ? cachedData : cached.data);
          if (setLastUpdated) {
            setLastUpdated(latestCachedDate);
          }
          return true;
        }
      }
    }

    const maxRetries = 2;
    let attempts = 0;
    let response;
    while (attempts < maxRetries) {
      try {
        response = await fetch(apiUrl);
        if (response.ok) break;
        throw new Error(`HTTP error! Status: ${response.status}`);
      } catch (err) {
        attempts++;
        // console.warn(`Attempt ${attempts} failed for ${apiUrl}:`, err);
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
      const sortedCachedData = [...cachedData].sort((a, b) => new Date(a.time) - new Date(b.time));
      const latestCachedDate = sortedCachedData[sortedCachedData.length - 1]?.time;
      if (latestCachedDate && latestFetchedDate <= latestCachedDate) {
        setData(Array.isArray(cached.data) ? cachedData : cached.data);
        if (setLastUpdated) {
          setLastUpdated(latestCachedDate);
        }
        await cacheData(cacheId, cached.data, currentTimestamp);
        return true;
      }
    }

    setData(formattedData);
    if (latestFetchedDate && setLastUpdated) {
      setLastUpdated(latestFetchedDate);
    }
    await cacheData(cacheId, formattedData, currentTimestamp);
    return true;
  } catch (error) {
    // console.error(`Error fetching or caching data for ${cacheId}:`, error);
    setIsFetched(false);
    return false;
  }
};

const ADDRESS_METRICS = [
  'AdrBal1in100KCnt', 'AdrBal1in10KCnt', 'AdrBal1in1KCnt',
  'AdrBalNtv0.001Cnt', 'AdrBalNtv0.01Cnt', 'AdrBalNtv0.1Cnt',
  'AdrBalNtv1Cnt', 'AdrBalNtv10Cnt', 'AdrBalNtv100Cnt',
  'AdrBalUSD1Cnt', 'AdrBalUSD10Cnt', 'AdrBalUSD100Cnt',
  'AdrBalUSD1KCnt', 'AdrBalUSD10KCnt', 'AdrBalUSD100KCnt',
  'AdrBalUSD1MCnt',
];

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
    // console.error(`Error refreshing data for ${cacheId}:`, error);
  }
};

async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    try {
      const response = await fetch(nextUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      // Handle both flat array and paginated responses
      if (Array.isArray(data)) {
        // Flat array response (e.g., /risk-metrics/)
        results = results.concat(data);
        nextUrl = null; // No pagination for flat arrays
      } else if (data.results && Array.isArray(data.results)) {
        // Paginated response (e.g., /onchain-metrics/)
        const validResults = data.results.filter(item => item && typeof item === 'object');
        results = results.concat(validResults);
        nextUrl = data.next;
      } else {
        // console.error(`Invalid API response: unexpected structure for ${nextUrl}`, data);
        throw new Error('Invalid API response structure');
      }
      // Log the final results for debugging
      // console.debug(`Fetched ${results.length} items from ${url}`);
    } catch (err) {
      // console.error(`Error fetching page ${nextUrl}:`, err);
      throw err;
    }
  }
  return results;
}

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
  const [altcoinSeasonData, setAltcoinSeasonData] = useState({});
  const [isAltcoinSeasonDataFetched, setIsAltcoinSeasonDataFetched] = useState(false);
  const [altcoinSeasonLastUpdated, setAltcoinSeasonLastUpdated] = useState(null);
  const [onchainMetricsData, setOnchainMetricsData] = useState([]);
  const [isOnchainMetricsDataFetched, setIsOnchainMetricsDataFetched] = useState(false);
  const [onchainMetricsLastUpdated, setOnchainMetricsLastUpdated] = useState(null);
  const [onchainFetchError, setOnchainFetchError] = useState(null);
  const [mvrvRiskData, setMvrvRiskData] = useState([]);
  const [puellRiskData, setPuellRiskData] = useState([]);
  const [minerCapThermoCapRiskData, setMinerCapThermoCapRiskData] = useState([]);
  const [isMvrvRiskDataFetched, setIsMvrvRiskDataFetched] = useState(false);
  const [isPuellRiskDataFetched, setIsPuellRiskDataFetched] = useState(false);
  const [isMinerCapThermoCapRiskDataFetched, setIsMinerCapThermoCapRiskDataFetched] = useState(false);
  const [mvrvRiskLastUpdated, setMvrvRiskLastUpdated] = useState(null);
  const [puellRiskLastUpdated, setPuellRiskLastUpdated] = useState(null);
  const [minerCapThermoCapRiskLastUpdated, setMinerCapThermoCapRiskLastUpdated] = useState(null);
  const [capRealData, setCapRealData] = useState([]);
  const [revAllTimeData, setRevAllTimeData] = useState([]);

  const [feeRiskData, setFeeRiskData] = useState([]); // New state for fee_risk
  const [soplRiskData, setSoplRiskData] = useState([]); // New state for sopl_risk
  const [isFeeRiskDataFetched, setIsFeeRiskDataFetched] = useState(false); // New fetch status
  const [isSoplRiskDataFetched, setIsSoplRiskDataFetched] = useState(false); // New fetch status
  const [feeRiskLastUpdated, setFeeRiskLastUpdated] = useState(null); // New last updated
  const [soplRiskLastUpdated, setSoplRiskLastUpdated] = useState(null); // New last updated

  const [altcoinSeasonTimeseriesData, setAltcoinSeasonTimeseriesData] = useState([]);
  const [isAltcoinSeasonTimeseriesDataFetched, setIsAltcoinSeasonTimeseriesDataFetched] = useState(false);
  const [altcoinSeasonTimeseriesLastUpdated, setAltcoinSeasonTimeseriesLastUpdated] = useState(null);

  const [differenceData, setDifferenceData] = useState([]); // New state for difference data
  const [isDifferenceDataFetched, setIsDifferenceDataFetched] = useState(false); // New fetch status
  const [differenceLastUpdated, setDifferenceLastUpdated] = useState(null);

  const API_BASE_URL = 'https://vercel-dataflow.vercel.app/api';
  // const API_BASE_URL = 'http://127.0.0.1:8000/api';

  useEffect(() => {

    let isMounted = true;

    const preloadData = async () => {
      await initDB();
      await fetchFredSeriesData('SP500');

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
        { id: 'altcoinSeasonData', setData: setAltcoinSeasonData, setLastUpdated: setAltcoinSeasonLastUpdated, setIsFetched: setIsAltcoinSeasonDataFetched, useDateCheck: true },
        { id: 'onchainMetricsData', setData: setOnchainMetricsData, setLastUpdated: setOnchainMetricsLastUpdated, setIsFetched: setIsOnchainMetricsDataFetched, useDateCheck: true },
        { id: 'mvrvRiskData', setData: setMvrvRiskData, setLastUpdated: setMvrvRiskLastUpdated, setIsFetched: setIsMvrvRiskDataFetched, useDateCheck: true },
        { id: 'puellRiskData', setData: setPuellRiskData, setLastUpdated: setPuellRiskLastUpdated, setIsFetched: setIsPuellRiskDataFetched, useDateCheck: true },
        { id: 'minerCapThermoCapRiskData', setData: setMinerCapThermoCapRiskData, setLastUpdated: setMinerCapThermoCapRiskLastUpdated, setIsFetched: setIsMinerCapThermoCapRiskDataFetched, useDateCheck: true },
        { id: 'feeRiskData', setData: setFeeRiskData, setLastUpdated: setFeeRiskLastUpdated, setIsFetched: setIsFeeRiskDataFetched, useDateCheck: true }, // New
        { id: 'soplRiskData', setData: setSoplRiskData, setLastUpdated: setSoplRiskLastUpdated, setIsFetched: setIsSoplRiskDataFetched, useDateCheck: true }, // New
        { id: 'altcoinSeasonTimeseriesData', setData: setAltcoinSeasonTimeseriesData, setLastUpdated: setAltcoinSeasonTimeseriesLastUpdated, setIsFetched: setIsAltcoinSeasonTimeseriesDataFetched, useDateCheck: true },
        { id: 'differenceData', setData: setDifferenceData, setLastUpdated: setDifferenceLastUpdated, setIsFetched: setIsDifferenceDataFetched, useDateCheck: true }, 
      ];

      // Fetch all data in parallel
      const fetchPromises = cacheConfigs.map(async ({ id, setData, setLastUpdated, setIsFetched, useDateCheck }) => {
        try {
          const cached = await getCachedData(id);
          if (cached && cached.data.length > 0) {
            const sortedCachedData = [...cached.data].sort((a, b) => new Date(a.time) - new Date(b.time));
            const latestCachedDate = sortedCachedData[sortedCachedData.length - 1].time;
            const currentDate = new Date().toISOString().split('T')[0];
            const currentTimestamp = Date.now();
            const shouldReuseCache = useDateCheck
              ? latestCachedDate >= currentDate
              : currentTimestamp - cached.timestamp < (useDateCheck ? 24 : 7) * 24 * 60 * 60 * 1000;

            if (shouldReuseCache) {
              if (isMounted) {
                setData(sortedCachedData);
                setLastUpdated(latestCachedDate);
                setIsFetched(true);
              }
              return;
            }
          }
          // Trigger fetch for non-cached or stale data
          const fetchFunc = {
            btcData: fetchBtcData,
            fedBalanceData: fetchFedBalanceData,
            mvrvData: fetchMvrvData,
            dominanceData: fetchDominanceData,
            ethData: fetchEthData,
            fearAndGreedData: fetchFearAndGreedData,
            marketCapData: fetchMarketCapData,
            differenceData: fetchDifferenceData, // New
            macroData: fetchMacroData,
            inflationData: fetchInflationData,
            initialClaimsData: fetchInitialClaimsData,
            interestData: fetchInterestData,
            unemploymentData: fetchUnemploymentData,
            txCountData: fetchTxCountData,
            txCountCombinedData: fetchTxCountCombinedData,
            txMvrvData: fetchTxMvrvData,
            latestFearAndGreed: fetchLatestFearAndGreed,
            altcoinSeasonData: fetchAltcoinSeasonData,
            onchainMetricsData: fetchOnchainMetricsData,
            mvrvRiskData: fetchRiskMetricsData,
            puellRiskData: fetchRiskMetricsData,
            minerCapThermoCapRiskData: fetchRiskMetricsData,
            feeRiskData: fetchRiskMetricsData,
            soplRiskData: fetchRiskMetricsData,
            altcoinSeasonTimeseriesData: fetchAltcoinSeasonTimeseriesData,
            // Map other ids to their fetch functions (e.g., 'btcData': fetchBtcData)
            // Add mappings for all cacheIds
          }[id];
          if (fetchFunc && isMounted) await fetchFunc();
        } catch (error) {
          if (id === 'onchainMetricsData' && isMounted) setOnchainFetchError(error.message);
        }
      });

      await Promise.all(fetchPromises);
      if (isMounted && !isMvrvRiskDataFetched && !isPuellRiskDataFetched && !isMinerCapThermoCapRiskDataFetched) {
        await fetchRiskMetricsData();
      }
      if (isMounted) setPreloadComplete(true);
    };

    preloadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchDifferenceData = useCallback(async () => {
    if (isDifferenceDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isDifferenceDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'differenceData',
      apiUrl: `${API_BASE_URL}/total/difference/`,
      formatData: (data) =>
        data
          .map((item) => {
            if (!item.time || typeof item.time !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.time) || isNaN(parseFloat(item.value))) {
              console.warn('Invalid differenceData item:', item);
              return null;
            }
            return {
              time: item.time, // Corrected from item.date to item.time
              value: parseFloat(item.value) + 100, // Transform to marketCap / fairValue * 100
            };
          })
          .filter((item) => item !== null)
          .sort((a, b) => new Date(a.time) - new Date(b.time)),
      setData: setDifferenceData,
      setLastUpdated: setDifferenceLastUpdated,
      setIsFetched: setIsDifferenceDataFetched,
      useDateCheck: true,
    });
  }, [isDifferenceDataFetched, preloadComplete]);

  const refreshDifferenceData = useCallback(async () => {
    await refreshData({
      cacheId: 'differenceData',
      setData: setDifferenceData,
      setIsFetched: setIsDifferenceDataFetched,
      fetchFunction: fetchDifferenceData,
    });
  }, [fetchDifferenceData]);

    const fetchAltcoinSeasonTimeseriesData = useCallback(async () => {
      if (isAltcoinSeasonTimeseriesDataFetched) return;
      if (!preloadComplete) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (isAltcoinSeasonTimeseriesDataFetched) return;
      }
      await fetchWithCache({
        cacheId: 'altcoinSeasonTimeseriesData',
        apiUrl: `${API_BASE_URL}/altcoin-season-index-timeseries/`,
        formatData: (data) => data.map(item => ({
          index: parseFloat(item.index),
          start_date: item.start_date,
          end_date: item.end_date,
          altcoin_count: parseInt(item.altcoin_count, 10),
          altcoins_outperforming: parseInt(item.altcoins_outperforming, 10),
          season: item.season,
          time: item.end_date,
        })).sort((a, b) => new Date(a.time) - new Date(b.time)),
        setData: setAltcoinSeasonTimeseriesData,
        setLastUpdated: setAltcoinSeasonTimeseriesLastUpdated,
        setIsFetched: setIsAltcoinSeasonTimeseriesDataFetched,
        useDateCheck: true,
      });
    }, [isAltcoinSeasonTimeseriesDataFetched, preloadComplete]);
  
    const refreshAltcoinSeasonTimeseriesData = useCallback(async () => {
      await refreshData({
        cacheId: 'altcoinSeasonTimeseriesData',
        setData: setAltcoinSeasonTimeseriesData,
        setIsFetched: setIsAltcoinSeasonTimeseriesDataFetched,
        fetchFunction: fetchAltcoinSeasonTimeseriesData,
      });
    }, [fetchAltcoinSeasonTimeseriesData]);

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
      apiUrl: `${API_BASE_URL}/fear-and-greed-binary-latest/`,
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

  const refreshLatestFearAndGreed = useCallback(async () => {
    await refreshData({
      cacheId: 'latestFearAndGreed',
      setData: setLatestFearAndGreed,
      setIsFetched: setIsLatestFearAndGreedFetched,
      fetchFunction: fetchLatestFearAndGreed,
    });
  }, [fetchLatestFearAndGreed]);

  const fetchOnchainMetricsData = useCallback(async () => {
    if (isOnchainMetricsDataFetched) return;
    const cacheId = 'onchainMetricsData';
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = Date.now();

    try {
      setIsOnchainMetricsDataFetched(true);
      setOnchainFetchError(null);

      const cached = await getCachedData(cacheId);
      if (cached && cached.data.length > 0) {
        const sortedCachedData = [...cached.data].sort((a, b) => new Date(a.time) - new Date(b.time));
        const latestCachedDate = sortedCachedData[sortedCachedData.length - 1].time;
        if (latestCachedDate >= currentDate) {
          setOnchainMetricsData(sortedCachedData);
          setOnchainMetricsLastUpdated(latestCachedDate);
          return;
        }
      }

      const apiUrl = `${API_BASE_URL}/onchain-metrics/?metric=PriceUSD&metric=IssContUSD&start_time=2010-01-01`;
      const allData = await fetchAllPages(apiUrl);

      if (!allData || allData.length === 0) {
        throw new Error('No onchain metrics data returned');
      }

      const formattedData = allData.map((item) => ({
        time: item.time,
        metric: item.metric,
        value: item.value !== null ? parseFloat(item.value) : null,
        asset: item.asset,
      }));

      setOnchainMetricsData(formattedData);
      setOnchainMetricsLastUpdated(formattedData[formattedData.length - 1].time);
      await cacheData(cacheId, formattedData, currentTimestamp);
    } catch (error) {
      // console.error('Error fetching onchain metrics:', error);
      setIsOnchainMetricsDataFetched(false);
      setOnchainFetchError(error.message);
    }
  }, [isOnchainMetricsDataFetched]);

  const refreshOnchainMetricsData = useCallback(async () => {
    try {
      await clearCache('onchainMetricsData');
      setOnchainMetricsData([]);
      setIsOnchainMetricsDataFetched(false);
      await fetchOnchainMetricsData();
    } catch (error) {
      // console.error('Error refreshing onchain metrics:', error);
      setOnchainFetchError(error.message);
    }
  }, [fetchOnchainMetricsData]);

  const fetchAddressMetricsData = useCallback(async () => {
    const cacheId = 'addressMetricsData';
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = Date.now();

    try {
      setIsOnchainMetricsDataFetched(true);
      setOnchainFetchError(null);

      const cached = await getCachedData(cacheId);
      if (cached && cached.data.length > 0) {
        const sortedCachedData = [...cached.data].sort((a, b) => new Date(a.time) - new Date(b.time));
        const latestCachedDate = sortedCachedData[sortedCachedData.length - 1].time;
        if (latestCachedDate >= currentDate) {
          setOnchainMetricsData(sortedCachedData);
          setOnchainMetricsLastUpdated(latestCachedDate);
          return;
        }
      }

      const apiUrl = `${API_BASE_URL}/onchain-address-metrics/?start_time=2010-01-01`;
      const allData = await fetchAllPages(apiUrl);

      if (!allData || allData.length === 0) {
        throw new Error('No address metrics data returned');
      }

      const formattedData = allData.map((item) => ({
        time: item.time,
        ...Object.fromEntries(
          Object.entries(item)
            .filter(([key]) => ADDRESS_METRICS.includes(key))
            .map(([key, value]) => [key, value !== null ? parseFloat(value) : null])
        ),
      }));

      setOnchainMetricsData(formattedData);
      setOnchainMetricsLastUpdated(formattedData[formattedData.length - 1].time);
      await cacheData(cacheId, formattedData, currentTimestamp);
    } catch (error) {
      // console.error('Error fetching address metrics:', error);
      setIsOnchainMetricsDataFetched(false);
      setOnchainFetchError(error.message);
    }
  }, []);

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
        btc: parseFloat(item.btc),
        eth: parseFloat(item.eth),
        alt: parseFloat(item.alt),
        stable: parseFloat(item.stable),
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
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isFearAndGreedDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'fearAndGreedData',
      apiUrl: `${API_BASE_URL}/fear-and-greed-binary-json/`,
      formatData: (data) =>
        data.map(item => ({
          value: item.value.toString(),
          value_classification: item.category,
          timestamp: item.date.toString(),
          time: new Date(item.date * 1000).toISOString().split('T')[0],
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
          .filter(item => item.date && item.mvrv !== null && !isNaN(parseFloat(item.mvrv)))
          .map((item) => ({
            time: item.date,
            tx_count: parseFloat(item.tx_count),
            mvrv: parseFloat(item.mvrv),
            market_cap: item.market_cap !== null ? parseFloat(item.market_cap) : null,
            realized_cap: item.realized_cap !== null ? parseFloat(item.realized_cap) : null,
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

  const fetchAltcoinSeasonData = useCallback(async () => {
    if (isAltcoinSeasonDataFetched) return;
    if (!preloadComplete) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isAltcoinSeasonDataFetched) return;
    }
    await fetchWithCache({
      cacheId: 'altcoinSeasonData',
      apiUrl: `${API_BASE_URL}/altcoin-season-index/`,
      formatData: (data) => ({
        index: parseFloat(data.index),
        start_date: data.start_date,
        end_date: data.end_date,
        altcoin_count: parseInt(data.altcoin_count, 10),
        altcoins_outperforming: parseInt(data.altcoins_outperforming, 10),
        season: data.season,
        time: data.end_date,
      }),
      setData: setAltcoinSeasonData,
      setLastUpdated: setAltcoinSeasonLastUpdated,
      setIsFetched: setIsAltcoinSeasonDataFetched,
      useDateCheck: true,
    });
  }, [isAltcoinSeasonDataFetched, preloadComplete]);

  const refreshAltcoinSeasonData = useCallback(async () => {
    await refreshData({
      cacheId: 'altcoinSeasonData',
      setData: setAltcoinSeasonData,
      setIsFetched: setIsAltcoinSeasonDataFetched,
      fetchFunction: fetchAltcoinSeasonData,
    });
  }, [fetchAltcoinSeasonData]);

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
      // console.error(`Failed to fetch series ${seriesId}`);
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
        // console.error('Error accessing IndexedDB for indicator data:', error);
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
      // console.error('Error fetching indicator data:', error);
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
      // console.error('Error refreshing indicator data:', error);
    }
  }, [fetchIndicatorData]);

  const fetchRiskMetricsData = useCallback(async () => {
    if (isMvrvRiskDataFetched && isPuellRiskDataFetched && isMinerCapThermoCapRiskDataFetched && isFeeRiskDataFetched && isSoplRiskDataFetched) return;

    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimestamp = Date.now();

    const processRiskMetric = async (metric, cacheId, setData, setIsFetched, setLastUpdated) => {
      try {
        const cached = await getCachedData(cacheId);
        if (cached && cached.data.length > 0) {
          const sortedCachedData = [...cached.data].sort((a, b) => new Date(a.time) - new Date(b.time));
          const latestCachedDate = sortedCachedData[sortedCachedData.length - 1].time;
          if (latestCachedDate >= currentDate) {
            setData(sortedCachedData);
            setLastUpdated(latestCachedDate);
            setIsFetched(true);
            return true;
          }
        }

        const apiUrl = `${API_BASE_URL}/risk-metrics/?metric=${metric}&time__gte=2010-09-05`;
        const allData = await fetchAllPages(apiUrl);

        if (!allData || allData.length === 0) {
          throw new Error(`No data returned for ${metric}`);
        }

        const formattedData = allData
          .map((item) => {
            if (!item || !item.time || item.value == null) {
              console.warn(`Invalid item in ${metric} data:`, item);
              return null;
            }
            return {
              time: item.time,
              Risk: parseFloat(item.value),
            };
          })
          .filter((item) => item !== null)
          .sort((a, b) => new Date(a.time) - new Date(b.time));

        if (formattedData.length === 0) {
          throw new Error(`No valid formatted data for ${metric} after processing`);
        }

        setData(formattedData);
        setLastUpdated(formattedData[formattedData.length - 1].time);
        await cacheData(cacheId, formattedData, currentTimestamp);
        setIsFetched(true);
        return true;
      } catch (error) {
        console.error(`Error fetching ${metric} risk metric:`, error);
        setIsFetched(false);
        return false;
      }
    };

    await Promise.all([
      processRiskMetric('mvrv_zscore', 'mvrvRiskData', setMvrvRiskData, setIsMvrvRiskDataFetched, setMvrvRiskLastUpdated),
      processRiskMetric('puell_multiple', 'puellRiskData', setPuellRiskData, setIsPuellRiskDataFetched, setPuellRiskLastUpdated),
      processRiskMetric('miner_cap_thermo', 'minerCapThermoCapRiskData', setMinerCapThermoCapRiskData, setIsMinerCapThermoCapRiskDataFetched, setMinerCapThermoCapRiskLastUpdated),
      processRiskMetric('fee_risk', 'feeRiskData', setFeeRiskData, setIsFeeRiskDataFetched, setFeeRiskLastUpdated), // New
      processRiskMetric('sopl_risk', 'soplRiskData', setSoplRiskData, setIsSoplRiskDataFetched, setSoplRiskLastUpdated), // New
    ]);
  }, [
    isMvrvRiskDataFetched,
    isPuellRiskDataFetched,
    isMinerCapThermoCapRiskDataFetched,
    isFeeRiskDataFetched, // New
    isSoplRiskDataFetched, // New
  ]);

  const refreshRiskMetricsData = useCallback(async () => {
    try {
      await Promise.all([
        clearCache('mvrvRiskData'),
        clearCache('puellRiskData'),
        clearCache('minerCapThermoCapRiskData'),
        clearCache('feeRiskData'), // New
        clearCache('soplRiskData'), // New
      ]);
      setMvrvRiskData([]);
      setPuellRiskData([]);
      setMinerCapThermoCapRiskData([]);
      setFeeRiskData([]); // New
      setSoplRiskData([]); // New
      setIsMvrvRiskDataFetched(false);
      setIsPuellRiskDataFetched(false);
      setIsMinerCapThermoCapRiskDataFetched(false);
      setIsFeeRiskDataFetched(false); // New
      setIsSoplRiskDataFetched(false); // New
      await fetchRiskMetricsData();
    } catch (error) {
      console.error('Error refreshing risk metrics:', error);
    }
  }, [fetchRiskMetricsData]);

  const contextValue = useMemo(
    () => ({
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
      altcoinSeasonData,
      fetchAltcoinSeasonData,
      refreshAltcoinSeasonData,
      altcoinSeasonLastUpdated,
      onchainMetricsData,
      fetchOnchainMetricsData,
      refreshOnchainMetricsData,
      onchainMetricsLastUpdated,
      onchainFetchError,
      isAltcoinDataFetched,
      fetchAddressMetricsData,
      capRealData,
      revAllTimeData,
      mvrvRiskData,
      puellRiskData,
      minerCapThermoCapRiskData,
      fetchRiskMetricsData,
      refreshRiskMetricsData,
      mvrvRiskLastUpdated,
      puellRiskLastUpdated,
      minerCapThermoCapRiskLastUpdated,
      feeRiskData, // New
      soplRiskData, // New
      feeRiskLastUpdated, // New
      soplRiskLastUpdated, // New
      isFeeRiskDataFetched, // New
      isSoplRiskDataFetched, // New
      altcoinSeasonTimeseriesData,
      fetchAltcoinSeasonTimeseriesData,
      refreshAltcoinSeasonTimeseriesData,
      altcoinSeasonTimeseriesLastUpdated,
      differenceData,
      fetchDifferenceData,
      refreshDifferenceData,
      differenceLastUpdated,
    }),
    [
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
      altcoinSeasonData,
      fetchAltcoinSeasonData,
      refreshAltcoinSeasonData,
      altcoinSeasonLastUpdated,
      onchainMetricsData,
      fetchOnchainMetricsData,
      refreshOnchainMetricsData,
      onchainMetricsLastUpdated,
      onchainFetchError,
      isAltcoinDataFetched,
      fetchAddressMetricsData,
      capRealData,
      revAllTimeData,
      mvrvRiskData,
      puellRiskData,
      minerCapThermoCapRiskData,
      fetchRiskMetricsData,
      refreshRiskMetricsData,
      mvrvRiskLastUpdated,
      puellRiskLastUpdated,
      minerCapThermoCapRiskLastUpdated,
      feeRiskData, // New
      soplRiskData, // New
      feeRiskLastUpdated, // New
      soplRiskLastUpdated, // New
      isFeeRiskDataFetched, // New
      isSoplRiskDataFetched, // New
      altcoinSeasonTimeseriesData,
      fetchAltcoinSeasonTimeseriesData,
      refreshAltcoinSeasonTimeseriesData,
      altcoinSeasonTimeseriesLastUpdated,
      differenceData,
      fetchDifferenceData,
      refreshDifferenceData,
      differenceLastUpdated,
    ]
  );

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);