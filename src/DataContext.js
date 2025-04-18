// DataContext.js
import React, { createContext, useState, useCallback } from 'react';

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
  // New state for indicator data
  const [indicatorData, setIndicatorData] = useState({});
  const [isIndicatorDataFetched, setIsIndicatorDataFetched] = useState({});

  const fetchBtcData = useCallback(async () => {
    if (isBtcDataFetched) return;
    setIsBtcDataFetched(true);
    try {
      const response = await fetch('https://vercel-dataflow.vercel.app/api/btc/price/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .filter(item => item.close != null && !isNaN(parseFloat(item.close)))
        .map(item => ({
          time: item.date,
          value: parseFloat(item.close),
        }));
      setBtcData(formattedData);
      if (formattedData.length > 0) {
        setBtcLastUpdated(formattedData[formattedData.length - 1].time);
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price data:', error);
      setIsBtcDataFetched(false);
    }
  }, [isBtcDataFetched]);

  const fetchAltcoinData = useCallback(async (coin) => {
    if (isAltcoinDataFetched[coin]) return;
    setIsAltcoinDataFetched(prev => ({ ...prev, [coin]: true }));
    try {
      const response = await fetch(`https://vercel-dataflow.vercel.app/api/${coin.toLowerCase()}/price/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .filter(item => item.close != null && !isNaN(parseFloat(item.close)))
        .map(item => ({
          time: item.date,
          value: parseFloat(item.close),
        }));
      setAltcoinData(prev => ({ ...prev, [coin]: formattedData }));
      if (formattedData.length > 0) {
        setAltcoinLastUpdated(prev => ({ ...prev, [coin]: formattedData[formattedData.length - 1].time }));
      }
    } catch (error) {
      console.error(`Error fetching ${coin} price data:`, error);
      setIsAltcoinDataFetched(prev => ({ ...prev, [coin]: false }));
    }
  }, [isAltcoinDataFetched]);

  const fetchFedBalanceData = useCallback(async () => {
    if (isFedBalanceDataFetched) return;
    setIsFedBalanceDataFetched(true);
    try {
      const response = await fetch('https://vercel-dataflow.vercel.app/api/fed-balance/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/mvrv/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/dominance/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/eth/price/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .filter(item => item.close != null && !isNaN(parseFloat(item.close)))
        .map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/fear-and-greed/');
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

  const fetchMarketCapData = useCallback(async () => {
    if (isMarketCapDataFetched) return;
    setIsMarketCapDataFetched(true);
    try {
      const response = await fetch('https://vercel-dataflow.vercel.app/api/total/marketcap/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
        time: item.date,
        value: parseFloat(item.market_cap),
      }));
      setMarketCapData(formattedData);
      if (formattedData.length > 0) {
        setMarketCapLastUpdated(formattedData[formattedData.length - 1].time);
      }
    } catch (error) {
      console.error('Error fetching total market cap data:', error);
      setIsMarketCapDataFetched(false);
    }
  }, [isMarketCapDataFetched]);

  const fetchMacroData = useCallback(async () => {
    if (isMacroDataFetched) return;
    setIsMacroDataFetched(true);
    try {
      const response = await fetch('https://vercel-dataflow.vercel.app/api/combined-macro-data/');
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/us-inflation/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/initial-claims/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/us-interest/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/us-unemployment/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data.map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/btc-tx-count/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .map(item => ({
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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/tx-macro/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      let lastInflation = null;
      let lastUnemployment = null;
      let lastFedFunds = null;

      const formattedData = data.map(item => {
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
      }).sort((a, b) => new Date(a.time) - new Date(b.time));

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
      const response = await fetch('https://vercel-dataflow.vercel.app/api/tx-mvrv/');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const formattedData = data
        .map(item => ({
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
      const response = await fetch(`https://vercel-dataflow.vercel.app/api/series/${seriesId}/observations/`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      let lastValidValue = null;
      const formattedData = data
        .map(item => {
          const value = item.value != null && !isNaN(parseFloat(item.value)) ? parseFloat(item.value) : lastValidValue;
          if (value !== null) {
            lastValidValue = value;
          }
          return {
            time: item.date,
            value,
          };
        })
        .filter(item => item.value !== null);
      setFredSeriesData(prev => ({ ...prev, [seriesId]: formattedData }));
    } catch (error) {
      console.error(`Error fetching series ${seriesId}:`, error);
      throw error;
    }
  }, [fredSeriesData]);

  // New fetchIndicatorData for combining BTC, T10Y2Y, USRECD
  const fetchIndicatorData = useCallback(async (indicatorId) => {
    if (isIndicatorDataFetched[indicatorId]) return;
    setIsIndicatorDataFetched(prev => ({ ...prev, [indicatorId]: true }));

    try {
      // Fetch required data
      await Promise.all([
        fetchBtcData(),
        fetchFredSeriesData('T10Y2Y'),
        fetchFredSeriesData('USRECD'),
      ]);

      // Get data from context
      const btc = btcData;
      const t10y2y = fredSeriesData['T10Y2Y'] || [];
      const usrecd = fredSeriesData['USRECD'] || [];

      // Use BTC dates as the base (2011-08-19 onward)
      const dates = btc.map(d => d.time);
      if (dates.length === 0) {
        console.error('No Bitcoin data available');
        setIsIndicatorDataFetched(prev => ({ ...prev, [indicatorId]: false }));
        return;
      }

      // Forward-fill USRECD to daily
      const dailyUsrecd = [];
      let lastUsrecd = 0;
      let usrecdIndex = 0;
      for (const date of dates) {
        while (
          usrecdIndex < usrecd.length &&
          usrecd[usrecdIndex].time <= date
        ) {
          lastUsrecd = usrecd[usrecdIndex].value;
          usrecdIndex++;
        }
        dailyUsrecd.push({ time: date, value: lastUsrecd });
      }

      // Combine datasets
      const combinedData = dates.map((date, i) => {
        const btcValue = btc[i].value;
        const t10y2yValue = t10y2y.find(d => d.time === date)?.value || null;
        const usrecdValue = dailyUsrecd[i].value;
        return {
          date,
          btc: btcValue,
          t10y2y: t10y2yValue,
          usrecd: usrecdValue,
        };
      }).filter(d => d.t10y2y !== null); // Skip missing T10Y2Y values

      setIndicatorData(prev => ({
        ...prev,
        [indicatorId]: combinedData,
      }));
    } catch (error) {
      console.error(`Error fetching indicator ${indicatorId}:`, error);
      setIsIndicatorDataFetched(prev => ({ ...prev, [indicatorId]: false }));
    }
  }, [
    btcData,
    fredSeriesData,
    fetchBtcData,
    fetchFredSeriesData,
    isIndicatorDataFetched,
  ]);

  return (
    <DataContext.Provider value={{
      btcData,
      fedBalanceData,
      mvrvData,
      btcLastUpdated,
      fedLastUpdated,
      mvrvLastUpdated,
      fetchBtcData,
      fetchFedBalanceData,
      fetchMvrvData,
      dominanceData,
      dominanceLastUpdated,
      fetchDominanceData,
      ethData,
      fetchEthData,
      ethLastUpdated,
      fearAndGreedData,
      fetchFearAndGreedData,
      fearAndGreedLastUpdated,
      marketCapData,
      fetchMarketCapData,
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
      txCountLastUpdated,
      fetchTxCountData,
      fetchTxCountCombinedData,
      txCountCombinedData,
      txMvrvData,
      txMvrvLastUpdated,
      fetchTxMvrvData,
      altcoinData,
      fetchAltcoinData,
      altcoinLastUpdated,
      fredSeriesData,
      fetchFredSeriesData,
      indicatorData,
      fetchIndicatorData, // Add new fetch function
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => React.useContext(DataContext);