// src/DataContext.js
import React, { createContext, useState, useCallback } from 'react';
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

  // const API_BASE_URL = 'https://vercel-dataflow.vercel.app/api'; 
  const API_BASE_URL = 'http://127.0.0.1:8000/api'; 
  
  const fetchBtcData = useCallback(async () => {
    if (isBtcDataFetched) return;
    
    const cacheId = 'btcData';
    let cached = null;
    if (typeof indexedDB !== 'undefined') {
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
      setIsBtcDataFetched(false);
      setBtcData([]);
      await fetchBtcData();
    } catch (error) {
      console.error('Error refreshing BTC data:', error);
    }
  }, [fetchBtcData]);

  const fetchMarketCapData = useCallback(async () => {
    if (isMarketCapDataFetched) return;

    const cacheId = 'marketCapData';
    let cached = null;
    if (typeof indexedDB !== 'undefined') {
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
      setIsMarketCapDataFetched(false);
      setMarketCapData([]);
      await fetchMarketCapData();
    } catch (error) {
      console.error('Error refreshing market cap data:', error);
    }
  }, [fetchMarketCapData]);

  // ... other fetch functions (e.g., fetchEthData, fetchFedBalanceData) can be updated similarly

  const fetchAltcoinData = useCallback(
    async (coin) => {
      if (isAltcoinDataFetched[coin]) return;
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
        }
      } catch (error) {
        console.error(`Error fetching ${coin} price data:`, error);
        setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: false }));
      }
    },
    [isAltcoinDataFetched]
  );

  const fetchFedBalanceData = useCallback(async () => {
    if (isFedBalanceDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching Federal Reserve balance data:', error);
      setIsFedBalanceDataFetched(false);
    }
  }, [isFedBalanceDataFetched]);

  const fetchMvrvData = useCallback(async () => {
    if (isMvrvDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching MVRV data:', error);
      setIsMvrvDataFetched(false);
    }
  }, [isMvrvDataFetched]);

  const fetchDominanceData = useCallback(async () => {
    if (isDominanceDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching Bitcoin dominance data:', error);
      setIsDominanceDataFetched(false);
    }
  }, [isDominanceDataFetched]);

  const fetchEthData = useCallback(async () => {
    if (isEthDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching Ethereum price data:', error);
      setIsEthDataFetched(false);
    }
  }, [isEthDataFetched]);

  const fetchFearAndGreedData = useCallback(async () => {
    if (isFearAndGreedDataFetched) return;
    setIsFearAndGreedDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/fear-and-greed/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setFearAndGreedData(data);
      if (data.length > 0) {
        setFearAndGreedLastUpdated(data[data.length - 1].timestamp);
      }
    } catch (error) {
      console.error('Error fetching Fear and Greed data:', error);
      setIsFearAndGreedDataFetched(false);
    }
  }, [isFearAndGreedDataFetched]);

  const fetchMacroData = useCallback(async () => {
    if (isMacroDataFetched) return;
    setIsMacroDataFetched(true);
    try {
      const response = await fetch(`${API_BASE_URL}/combined-macro-data/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setMacroData(data);
      if (data.length > 0) {
        setMacroLastUpdated(data[data.length - 1].date);
      }
    } catch (error) {
      console.error('Error fetching combined macro data:', error);
      setIsMacroDataFetched(false);
    }
  }, [isMacroDataFetched]);

  const fetchInflationData = useCallback(async () => {
    if (isInflationDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching US inflation data:', error);
      setIsInflationDataFetched(false);
    }
  }, [isInflationDataFetched]);

  const fetchInitialClaimsData = useCallback(async () => {
    if (isInitialClaimsDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching initial claims data:', error);
      setIsInitialClaimsDataFetched(false);
    }
  }, [isInitialClaimsDataFetched]);

  const fetchInterestData = useCallback(async () => {
    if (isInterestDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching US interest data:', error);
      setIsInterestDataFetched(false);
    }
  }, [isInterestDataFetched]);

  const fetchUnemploymentData = useCallback(async () => {
    if (isUnemploymentDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching US unemployment data:', error);
      setIsUnemploymentDataFetched(false);
    }
  }, [isUnemploymentDataFetched]);

  const fetchTxCountData = useCallback(async () => {
    if (isTxCountDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching Bitcoin transaction count data:', error);
      setIsTxCountDataFetched(false);
    }
  }, [isTxCountDataFetched]);

  const fetchTxCountCombinedData = useCallback(async () => {
    if (isTxCountCombinedDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching combined transaction count data:', error);
      setIsTxCountCombinedDataFetched(false);
    }
  }, [isTxCountCombinedDataFetched]);

  const fetchTxMvrvData = useCallback(async () => {
    if (isTxMvrvDataFetched) return;
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
      }
    } catch (error) {
      console.error('Error fetching Bitcoin tx-mvrv data:', error);
      setIsTxMvrvDataFetched(false);
    }
  }, [isTxMvrvDataFetched]);

  const fetchFredSeriesData = useCallback(async (seriesId) => {
    if (fredSeriesData[seriesId]?.length > 0) return;
    try {
      const response = await fetch(`${API_BASE_URL}/series/${seriesId}/observations/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      let lastValidValue = null;
      const formattedData = data
        .map((item) => {
          const value =
            item.value != null && !isNaN(parseFloat(item.value)) ? parseFloat(item.value) : lastValidValue;
          if (value !== null) {
            lastValidValue = value;
          }
          return {
            time: item.date,
            value,
          };
        })
        .filter((item) => item.value !== null);
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

  return (
    <DataContext.Provider
      value={{
        btcData,
        fetchBtcData,
        refreshBtcData,
        btcLastUpdated,
        fedBalanceData,
        fetchFedBalanceData,
        fedLastUpdated,
        mvrvData,
        fetchMvrvData,
        mvrvLastUpdated,
        dominanceData,
        fetchDominanceData,
        dominanceLastUpdated,
        ethData,
        fetchEthData,
        ethLastUpdated,
        fearAndGreedData,
        fetchFearAndGreedData,
        fearAndGreedLastUpdated,
        marketCapData,
        fetchMarketCapData,
        refreshMarketCapData,
        marketCapLastUpdated,
        macroData,
        fetchMacroData,
        macroLastUpdated,
        inflationData,
        fetchInflationData,
        inflationLastUpdated,
        initialClaimsData,
        fetchInitialClaimsData,
        initialClaimsLastUpdated,
        interestData,
        fetchInterestData,
        interestLastUpdated,
        unemploymentData,
        fetchUnemploymentData,
        unemploymentLastUpdated,
        txCountData,
        fetchTxCountData,
        txCountLastUpdated,
        txCountCombinedData,
        fetchTxCountCombinedData,
        txCountCombinedLastUpdated,
        txMvrvData,
        fetchTxMvrvData,
        txMvrvLastUpdated,
        altcoinData,
        fetchAltcoinData,
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