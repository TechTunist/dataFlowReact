import React, { useState, useEffect, useContext } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import '../styling/LastUpdated.css';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataContext } from '../DataContext';

const LastUpdated = ({ storageKey, useLocalStorage = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [lastUpdated, setLastUpdated] = useState(''); // Empty string by default
  const [refresh, setRefresh] = useState(0);
  const [isClicked, setIsClicked] = useState(false);

  // Access DataContext to get last updated dates and fetch functions
  const {
    btcLastUpdated,
    fedLastUpdated,
    mvrvLastUpdated,
    ethLastUpdated, // Added
    fetchBtcData,
    fetchFedBalanceData,
    fetchMvrvData,
    fetchEthData, // Added
    dominanceLastUpdated,
  } = useContext(DataContext);

  // Map storageKey to the corresponding last updated date from DataContext
  const lastUpdatedMap = {
    btcData: btcLastUpdated,
    fedBalanceData: fedLastUpdated,
    mvrvData: mvrvLastUpdated,
    ethData: ethLastUpdated, // Added
    dominanceData: dominanceLastUpdated,
  };

  // Map storageKey to the corresponding fetch function for refreshing
  const fetchFunctionMap = {
    btcData: fetchBtcData,
    fedBalanceData: fetchFedBalanceData,
    mvrvData: fetchMvrvData,
    ethData: fetchEthData, // Added
  };

  // Process data from local storage
  const processLocalStorageData = (dataJson) => {
    if (!dataJson) {
      setLastUpdated(''); // No data, set empty string
      return;
    }

    try {
      const parsedData = JSON.parse(dataJson);
      // Handle both array and object formats
      const dataArray = Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
      if (dataArray.length) {
        const lastDataPoint = dataArray[dataArray.length - 1];
        setLastUpdated(new Date(lastDataPoint.time).toLocaleDateString());
      } else {
        setLastUpdated('');
      }
    } catch (error) {
      console.error('Error parsing local storage data:', error);
      setLastUpdated('');
    }
  };

  // Get the last updated date based on the data source
  useEffect(() => {
    if (useLocalStorage) {
      // Use local storage if specified
      const dataJson = localStorage.getItem(storageKey);
      processLocalStorageData(dataJson);
    } else {
      // Use DataContext
      const lastUpdatedDate = lastUpdatedMap[storageKey];
      if (lastUpdatedDate) {
        setLastUpdated(new Date(lastUpdatedDate).toLocaleDateString());
      } else {
        setLastUpdated(''); // No data yet
      }
    }
  }, [storageKey, useLocalStorage, refresh, btcLastUpdated, fedLastUpdated, mvrvLastUpdated, ethLastUpdated, dominanceLastUpdated]); // Added ethLastUpdated to dependencies

  // Listen for changes in local storage (if using local storage)
  useEffect(() => {
    if (useLocalStorage) {
      const handleStorageChange = (e) => {
        if (e.key === storageKey) {
          setRefresh(prev => prev + 1);
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [storageKey, useLocalStorage]);

  // Refresh handler
  const refreshComponent = () => {
    setRefresh(prev => prev + 1); // Trigger useEffect to re-check data
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

    // If using DataContext, trigger the appropriate fetch function to refresh the data
    if (!useLocalStorage) {
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
        Last Updated: {lastUpdated || '(click to refresh)'}
        <RefreshIcon />
      </p>
    </div>
  );
};

export default LastUpdated;