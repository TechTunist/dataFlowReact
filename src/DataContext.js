// src/DataContext.js
import React, { createContext, useState, useCallback, useEffect } from 'react';
import { initDB, cacheData, getCachedData, clearCache } from './utility/idbUtils';

export const DataContext = createContext();

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
  // const API_BASE_URL = 'http://127.0.0.1:8000/api';

  const fetchBtcData = useCallback(async (force = false) => {
    const cacheId = 'btcData';
    if (!force && isBtcDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setBtcData(cached.data);
          setBtcLastUpdated(cached.data[cached.data.length - 1].time);
          setIsBtcDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for BTC data:', error);
      }
    }

    setIsBtcDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/btc/price/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
        .map((item) => ({
          time: item.date,
          value: parseFloat(item.close),
        }));
      setBtcData(formattedData);
      if (formattedData.length > 0) {
        setBtcLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price data:', error);
      setIsBtcDataFetched(false);
    }
  }, [isBtcDataFetched]);

  const refreshBtcData = useCallback(async () => {
    try {
      await clearCache('btcData');
      setBtcData([]);
      await fetchBtcData(true);
    } catch (error) {
      console.error('Error refreshing BTC data:', error);
    }
  }, [fetchBtcData]);

  const fetchMarketCapData = useCallback(async (force = false) => {
    const cacheId = 'marketCapData';
    if (!force && isMarketCapDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setMarketCapData(cached.data);
          setMarketCapLastUpdated(cached.data[cached.data.length - 1].time);
          setIsMarketCapDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for market cap data:', error);
      }
    }

    setIsMarketCapDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/total/marketcap/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.date,
        value: parseFloat(item.market_cap),
      }));
      setMarketCapData(formattedData);
      if (formattedData.length > 0) {
        setMarketCapLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching total market cap data:', error);
      setIsMarketCapDataFetched(false);
    }
  }, [isMarketCapDataFetched]);

  const refreshMarketCapData = useCallback(async () => {
    try {
      await clearCache('marketCapData');
      setMarketCapData([]);
      await fetchMarketCapData(true);
    } catch (error) {
      console.error('Error refreshing market cap data:', error);
    }
  }, [fetchMarketCapData]);

  const fetchAltcoinData = useCallback(async (coin, force = false) => {
    const cacheId = `altcoinData_${coin}`;
    if (!force && isAltcoinDataFetched[coin]) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setAltcoinData((prev) => ({ ...prev, [coin]: cached.data }));
          setAltcoinLastUpdated((prev) => ({
            ...prev,
            [coin]: cached.data[cached.data.length - 1].time,
          }));
          setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: true }));
          return;
        }
      } catch (error) {
        console.error(`Error accessing IndexedDB for ${coin} data:`, error);
      }
    }

    setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/${coin.toLowerCase()}/price/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
        .map((item) => ({
          time: item.date,
          value: parseFloat(item.close),
        }));
      setAltcoinData((prev) => ({ ...prev, [coin]: formattedData }));
      if (formattedData.length > 0) {
        setAltcoinLastUpdated((prev) => ({
          ...prev,
          [coin]: formattedData[formattedData.length - 1].time,
        }));
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error(`Error fetching ${coin} price data:`, error);
      setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: false }));
    }
  }, [isAltcoinDataFetched]);

  const refreshAltcoinData = useCallback(async (coin) => {
    try {
      await clearCache(`altcoinData_${coin}`);
      setAltcoinData((prev) => ({ ...prev, [coin]: [] }));
      await fetchAltcoinData(coin, true);
    } catch (error) {
      console.error(`Error refreshing ${coin} data:`, error);
    }
  }, [fetchAltcoinData]);

  const fetchFedBalanceData = useCallback(async (force = false) => {
    const cacheId = 'fedBalanceData';
    if (!force && isFedBalanceDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setFedBalanceData(cached.data);
          setFedLastUpdated(cached.data[cached.data.length - 1].time);
          setIsFedBalanceDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for Fed balance data:', error);
      }
    }

    setIsFedBalanceDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/fed-balance/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.observation_date,
        value: parseFloat(item.value) / 1000000,
      }));
      setFedBalanceData(formattedData);
      if (formattedData.length > 0) {
        setFedLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching Federal Reserve balance data:', error);
      setIsFedBalanceDataFetched(false);
    }
  }, [isFedBalanceDataFetched]);

  const refreshFedBalanceData = useCallback(async () => {
    try {
      await clearCache('fedBalanceData');
      setFedBalanceData([]);
      await fetchFedBalanceData(true);
    } catch (error) {
      console.error('Error refreshing Fed balance data:', error);
    }
  }, [fetchFedBalanceData]);

  const fetchMvrvData = useCallback(async (force = false) => {
    const cacheId = 'mvrvData';
    if (!force && isMvrvDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setMvrvData(cached.data);
          setMvrvLastUpdated(cached.data[cached.data.length - 1].time);
          setIsMvrvDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for MVRV data:', error);
      }
    }

    setIsMvrvDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/mvrv/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.time.split('T')[0],
        value: parseFloat(item.cap_mvrv_cur),
      }));
      setMvrvData(formattedData);
      if (formattedData.length > 0) {
        setMvrvLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching MVRV data:', error);
      setIsMvrvDataFetched(false);
    }
  }, [isMvrvDataFetched]);

  const refreshMvrvData = useCallback(async () => {
    try {
      await clearCache('mvrvData');
      setMvrvData([]);
      await fetchMvrvData(true);
    } catch (error) {
      console.error('Error refreshing MVRV data:', error);
    }
  }, [fetchMvrvData]);

  const fetchDominanceData = useCallback(async (force = false) => {
    const cacheId = 'dominanceData';
    if (!force && isDominanceDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setDominanceData(cached.data);
          setDominanceLastUpdated(cached.data[cached.data.length - 1].time);
          setIsDominanceDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for dominance data:', error);
      }
    }

    setIsDominanceDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dominance/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.date,
        value: parseFloat(item.btc),
      }));
      setDominanceData(formattedData);
      if (formattedData.length > 0) {
        setDominanceLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching Bitcoin dominance data:', error);
      setIsDominanceDataFetched(false);
    }
  }, [isDominanceDataFetched]);

  const refreshDominanceData = useCallback(async () => {
    try {
      await clearCache('dominanceData');
      setDominanceData([]);
      await fetchDominanceData(true);
    } catch (error) {
      console.error('Error refreshing dominance data:', error);
    }
  }, [fetchDominanceData]);

  const fetchEthData = useCallback(async (force = false) => {
    const cacheId = 'ethData';
    if (!force && isEthDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setEthData(cached.data);
          setEthLastUpdated(cached.data[cached.data.length - 1].time);
          setIsEthDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for ETH data:', error);
      }
    }

    setIsEthDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/eth/price/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
        .map((item) => ({
          time: item.date,
          value: parseFloat(item.close),
        }));
      setEthData(formattedData);
      if (formattedData.length > 0) {
        setEthLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching Ethereum price data:', error);
      setIsEthDataFetched(false);
    }
  }, [isEthDataFetched]);

  const refreshEthData = useCallback(async () => {
    try {
      await clearCache('ethData');
      setEthData([]);
      await fetchEthData(true);
    } catch (error) {
      console.error('Error refreshing ETH data:', error);
    }
  }, [fetchEthData]);

  const fetchFearAndGreedData = useCallback(async (force = false) => {
    const cacheId = 'fearAndGreedData';
    if (!force && isFearAndGreedDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setFearAndGreedData(cached.data);
          setFearAndGreedLastUpdated(cached.data[cached.data.length - 1].timestamp);
          setIsFearAndGreedDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for Fear and Greed data:', error);
      }
    }

    setIsFearAndGreedDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/fear-and-greed/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setFearAndGreedData(data);
      if (data.length > 0) {
        setFearAndGreedLastUpdated(data[data.length - 1].timestamp);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, data, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching Fear and Greed data:', error);
      setIsFearAndGreedDataFetched(false);
    }
  }, [isFearAndGreedDataFetched]);

  const refreshFearAndGreedData = useCallback(async () => {
    try {
      await clearCache('fearAndGreedData');
      setFearAndGreedData([]);
      await fetchFearAndGreedData(true);
    } catch (error) {
      console.error('Error refreshing Fear and Greed data:', error);
    }
  }, [fetchFearAndGreedData]);

  const fetchMacroData = useCallback(async (force = false) => {
    const cacheId = 'macroData';
    if (!force && isMacroDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setMacroData(cached.data);
          setMacroLastUpdated(cached.data[cached.data.length - 1].date);
          setIsMacroDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for macro data:', error);
      }
    }

    setIsMacroDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/combined-macro-data/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setMacroData(data);
      if (data.length > 0) {
        setMacroLastUpdated(data[data.length - 1].date);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, data, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching combined macro data:', error);
      setIsMacroDataFetched(false);
    }
  }, [isMacroDataFetched]);

  const refreshMacroData = useCallback(async () => {
    try {
      await clearCache('macroData');
      setMacroData([]);
      await fetchMacroData(true);
    } catch (error) {
      console.error('Error refreshing macro data:', error);
    }
  }, [fetchMacroData]);

  const fetchInflationData = useCallback(async (force = false) => {
    const cacheId = 'inflationData';
    if (!force && isInflationDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setInflationData(cached.data);
          setInflationLastUpdated(cached.data[cached.data.length - 1].time);
          setIsInflationDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for inflation data:', error);
      }
    }

    setIsInflationDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/us-inflation/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.date,
        value: parseFloat(item.value),
      }));
      setInflationData(formattedData);
      if (formattedData.length > 0) {
        setInflationLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching US inflation data:', error);
      setIsInflationDataFetched(false);
    }
  }, [isInflationDataFetched]);

  const refreshInflationData = useCallback(async () => {
    try {
      await clearCache('inflationData');
      setInflationData([]);
      await fetchInflationData(true);
    } catch (error) {
      console.error('Error refreshing inflation data:', error);
    }
  }, [fetchInflationData]);

  const fetchInitialClaimsData = useCallback(async (force = false) => {
    const cacheId = 'initialClaimsData';
    if (!force && isInitialClaimsDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setInitialClaimsData(cached.data);
          setInitialClaimsLastUpdated(cached.data[cached.data.length - 1].time);
          setIsInitialClaimsDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for initial claims data:', error);
      }
    }

    setIsInitialClaimsDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/initial-claims/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.date,
        value: parseInt(item.value, 10),
      }));
      setInitialClaimsData(formattedData);
      if (formattedData.length > 0) {
        setInitialClaimsLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching initial claims data:', error);
      setIsInitialClaimsDataFetched(false);
    }
  }, [isInitialClaimsDataFetched]);

  const refreshInitialClaimsData = useCallback(async () => {
    try {
      await clearCache('initialClaimsData');
      setInitialClaimsData([]);
      await fetchInitialClaimsData(true);
    } catch (error) {
      console.error('Error refreshing initial claims data:', error);
    }
  }, [fetchInitialClaimsData]);

  const fetchInterestData = useCallback(async (force = false) => {
    const cacheId = 'interestData';
    if (!force && isInterestDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setInterestData(cached.data);
          setInterestLastUpdated(cached.data[cached.data.length - 1].time);
          setIsInterestDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for interest data:', error);
      }
    }

    setIsInterestDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/us-interest/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.date,
        value: parseFloat(item.value),
      }));
      setInterestData(formattedData);
      if (formattedData.length > 0) {
        setInterestLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching US interest data:', error);
      setIsInterestDataFetched(false);
    }
  }, [isInterestDataFetched]);

  const refreshInterestData = useCallback(async () => {
    try {
      await clearCache('interestData');
      setInterestData([]);
      await fetchInterestData(true);
    } catch (error) {
      console.error('Error refreshing interest data:', error);
    }
  }, [fetchInterestData]);

  const fetchUnemploymentData = useCallback(async (force = false) => {
    const cacheId = 'unemploymentData';
    if (!force && isUnemploymentDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setUnemploymentData(cached.data);
          setUnemploymentLastUpdated(cached.data[cached.data.length - 1].time);
          setIsUnemploymentDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for unemployment data:', error);
      }
    }

    setIsUnemploymentDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/us-unemployment/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map((item) => ({
        time: item.date,
        value: parseFloat(item.value),
      }));
      setUnemploymentData(formattedData);
      if (formattedData.length > 0) {
        setUnemploymentLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching US unemployment data:', error);
      setIsUnemploymentDataFetched(false);
    }
  }, [isUnemploymentDataFetched]);

  const refreshUnemploymentData = useCallback(async () => {
    try {
      await clearCache('unemploymentData');
      setUnemploymentData([]);
      await fetchUnemploymentData(true);
    } catch (error) {
      console.error('Error refreshing unemployment data:', error);
    }
  }, [fetchUnemploymentData]);

  const fetchTxCountData = useCallback(async (force = false) => {
    const cacheId = 'txCountData';
    if (!force && isTxCountDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setTxCountData(cached.data);
          setTxCountLastUpdated(cached.data[cached.data.length - 1].time);
          setIsTxCountDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for tx count data:', error);
      }
    }

    setIsTxCountDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/btc-tx-count/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .map((item) => ({
          time: item.time.split('T')[0],
          value: parseFloat(item.tx_count),
        }))
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      setTxCountData(formattedData);
      if (formattedData.length > 0) {
        setTxCountLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching Bitcoin transaction count data:', error);
      setIsTxCountDataFetched(false);
    }
  }, [isTxCountDataFetched]);

  const refreshTxCountData = useCallback(async () => {
    try {
      await clearCache('txCountData');
      setTxCountData([]);
      await fetchTxCountData(true);
    } catch (error) {
      console.error('Error refreshing tx count data:', error);
    }
  }, [fetchTxCountData]);

  const fetchTxCountCombinedData = useCallback(async (force = false) => {
    const cacheId = 'txCountCombinedData';
    if (!force && isTxCountCombinedDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setTxCountCombinedData(cached.data);
          setTxCountCombinedLastUpdated(cached.data[cached.data.length - 1].time);
          setIsTxCountCombinedDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for tx count combined data:', error);
      }
    }

    setIsTxCountCombinedDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tx-macro/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      let lastInflation = null;
      let lastUnemployment = null;
      let lastFedFunds = null;

      const formattedData = data
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

      setTxCountCombinedData(formattedData);
      if (formattedData.length > 0) {
        setTxCountCombinedLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching combined transaction count data:', error);
      setIsTxCountCombinedDataFetched(false);
    }
  }, [isTxCountCombinedDataFetched]);

  const refreshTxCountCombinedData = useCallback(async () => {
    try {
      await clearCache('txCountCombinedData');
      setTxCountCombinedData([]);
      await fetchTxCountCombinedData(true);
    } catch (error) {
      console.error('Error refreshing tx count combined data:', error);
    }
  }, [fetchTxCountCombinedData]);

  const fetchTxMvrvData = useCallback(async (force = false) => {
    const cacheId = 'txMvrvData';
    if (!force && isTxMvrvDataFetched) return;

    let cached = null;
    if (!force && typeof indexedDB !== 'undefined') {
      try {
        cached = await getCachedData(cacheId);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (cached && Date.now() - cached.timestamp < ONE_DAY) {
          setTxMvrvData(cached.data);
          setTxMvrvLastUpdated(cached.data[cached.data.length - 1].time);
          setIsTxMvrvDataFetched(true);
          return;
        }
      } catch (error) {
        console.error('Error accessing IndexedDB for tx-mvrv data:', error);
      }
    }

    setIsTxMvrvDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tx-mvrv/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .map((item) => ({
          time: item.date,
          tx_count: parseFloat(item.tx_count),
          mvrv: parseFloat(item.mvrv),
        }))
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      setTxMvrvData(formattedData);
      if (formattedData.length > 0) {
        setTxMvrvLastUpdated(formattedData[formattedData.length - 1].time);
        if (typeof indexedDB !== 'undefined') {
          await cacheData(cacheId, formattedData, Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching Bitcoin tx-mvrv data:', error);
      setIsTxMvrvDataFetched(false);
    }
  }, [isTxMvrvDataFetched]);

  const refreshTxMvrvData = useCallback(async () => {
    try {
      await clearCache('txMvrvData');
      setTxMvrvData([]);
      await fetchTxMvrvData(true);
    } catch (error) {
      console.error('Error refreshing tx-mvrv data:', error);
    }
  }, [fetchTxMvrvData]);

  const fetchFredSeriesData = useCallback(async (seriesId) => {
    if (fredSeriesData[seriesId]?.length > 0) return;
    try {
      const response = await fetch(`${API_BASE_URL}/series/${seriesId}/observations/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      let lastValidValue = null;
      const formattedData = data
        .map((item) => {
          const value = item.value != null && !isNaN(parseFloat(item.value)) ? parseFloat(item.value) : lastValidValue;
          if (value !== null && !isNaN(value)) {
            lastValidValue = value;
          }
          return {
            time: item.date,
            value,
          };
        })
        .filter((item) => item.value !== null && !isNaN(item.value))
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      if (formattedData.length === 0) {
        console.warn(`No valid data points for series ${seriesId}`);
      }
      setFredSeriesData((prev) => ({ ...prev, [seriesId]: formattedData }));
    } catch (error) {
      console.error(`Error fetching series ${seriesId}:`, error);
      throw error;
    }
  }, [fredSeriesData]);

  const fetchIndicatorData = async (indicatorId) => {
    if (indicatorId !== 'btc-yield-recession') return;

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
      const endDate = new Date().toISOString().split('T')[0];
      const dateRange = [];
      let currentDate = new Date(startDate);
      while (currentDate <= new Date(endDate)) {
        dateRange.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
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
    } catch (error) {
      console.error('Error fetching indicator data:', error);
      throw error;
    }
  };

  // SSE Connection
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/updates/stream/`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        // console.log(`Update detected for ${data.dataset}`);
        // Handle altcoin datasets (e.g., altcoinData_sol)
        if (data.dataset.startsWith('altcoinData_')) {
          const coin = data.dataset.replace('altcoinData_', '').toUpperCase();
          fetchAltcoinData(coin, true);
          return;
        }
        switch (data.dataset) {
          case 'btcData':
            fetchBtcData(true);
            break;
          case 'dominanceData':
            fetchDominanceData(true);
            break;
          case 'marketCapData':
            fetchMarketCapData(true);
            break;
          case 'ethData':
            fetchEthData(true);
            break;
          case 'fearAndGreedData':
            fetchFearAndGreedData(true);
            break;
          case 'fedBalanceData':
            fetchFedBalanceData(true);
            break;
          case 'inflationData':
            fetchInflationData(true);
            break;
          case 'interestData':
            fetchInterestData(true);
            break;
          case 'unemploymentData':
            fetchUnemploymentData(true);
            break;
          case 'initialClaimsData':
            fetchInitialClaimsData(true);
            break;
          case 'macroData':
            fetchMacroData(true);
            break;
          case 'mvrvData':
            fetchMvrvData(true);
            break;
          case 'txCountData':
            fetchTxCountData(true);
            break;
          case 'txCountCombinedData':
            fetchTxCountCombinedData(true);
            break;
          case 'txMvrvData':
            fetchTxMvrvData(true);
            break;
          default:
            console.warn(`No fetch function defined for dataset: ${data.dataset}`);
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      console.log('SSE connection closed');
    };
  }, [
    fetchBtcData,
    fetchMarketCapData,
    fetchFedBalanceData,
    fetchMvrvData,
    fetchDominanceData,
    fetchEthData,
    fetchFearAndGreedData,
    fetchMacroData,
    fetchInflationData,
    fetchInitialClaimsData,
    fetchInterestData,
    fetchUnemploymentData,
    fetchTxCountData,
    fetchTxCountCombinedData,
    fetchTxMvrvData,
    fetchAltcoinData,
  ]);

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
        indicatorData,
        fetchIndicatorData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => React.useContext(DataContext);