// LastUpdated.jsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import '../styling/LastUpdated.css';
import { effectiveDailyReferenceDate } from '../utils/dailyReferenceDate';
import { useChartData, useChartDataActions } from './useChartData';

const LastUpdated = ({ storageKey, customDate, onRefresh }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [isClicked, setIsClicked] = useState(false);

  // Access DataContext
  const { btcLastUpdated, fedLastUpdated, mvrvLastUpdated, ethLastUpdated, dominanceLastUpdated, altcoinLastUpdated } = useChartData();
  const { fetchBtcData, refreshBtcData, fetchFedBalanceData, fetchMvrvData, fetchEthData, fetchAltcoinData } = useChartDataActions();

  // Map storageKey to last updated date
  const lastUpdatedMap = {
    btcData: btcLastUpdated,
    fedBalanceData: fedLastUpdated,
    mvrvData: mvrvLastUpdated,
    ethData: ethLastUpdated,
    dominanceData: dominanceLastUpdated,
  };

  // Map storageKey to fetch function
  const fetchFunctionMap = {
    btcData: refreshBtcData,
    fedBalanceData: fetchFedBalanceData,
    mvrvData: fetchMvrvData,
    ethData: fetchEthData,
  };

  const displayDateForKey = (key, rawDate) => {
    if (!rawDate) return rawDate;
    if (key === 'btcData') return effectiveDailyReferenceDate(rawDate);
    return rawDate;
  };

  // Format date to dd-mm-yyyy
  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-');
      return `${day}-${month}-${year}`;
    }
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Get the last updated date
  useEffect(() => {
    // Use customDate if provided, otherwise fall back to context-derived date
    if (customDate) {
      setLastUpdated(formatDate(displayDateForKey(storageKey, customDate)));
    } else {
      // Check if storageKey is for an altcoin (e.g., solData, ethData)
      const coin = Object.keys(altcoinLastUpdated).find(
        key => `${key.toLowerCase()}Data` === storageKey
      );
      if (coin && altcoinLastUpdated[coin]) {
        setLastUpdated(formatDate(altcoinLastUpdated[coin]));
      } else {
        const lastUpdatedDate = lastUpdatedMap[storageKey];
        if (lastUpdatedDate) {
          setLastUpdated(formatDate(displayDateForKey(storageKey, lastUpdatedDate)));
        } else {
          setLastUpdated('');
        }
      }
    }
  }, [storageKey, customDate, refresh, btcLastUpdated, fedLastUpdated, mvrvLastUpdated, ethLastUpdated, dominanceLastUpdated, altcoinLastUpdated]);

  // Refresh handler
  const refreshComponent = () => {
    setRefresh(prev => prev + 1);
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

    if (onRefresh) {
      onRefresh();
      return;
    }

    // Trigger fetch for altcoin or mapped data
    const coin = Object.keys(altcoinLastUpdated).find(
      key => `${key.toLowerCase()}Data` === storageKey
    );
    if (coin) {
      fetchAltcoinData(coin);
    } else {
      const fetchFunction = fetchFunctionMap[storageKey];
      if (fetchFunction) {
        fetchFunction();
      }
    }
  };

  return (
    <div
      onClick={refreshComponent}
      className={isClicked ? 'scale' : ''}
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'transform 0.3s',
        transform: isClicked ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <p
        style={{
          color: colors.greenAccent[500],
          marginBottom: '0',
          marginRight: '10px',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        Last Updated: {lastUpdated || 'loading...'}
      </p>
    </div>
  );
};

export default LastUpdated;