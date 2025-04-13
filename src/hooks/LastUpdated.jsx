// LastUpdated.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import '../styling/LastUpdated.css';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataContext } from '../DataContext';

const LastUpdated = ({ storageKey }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [isClicked, setIsClicked] = useState(false);

  // Access DataContext
  const {
    btcLastUpdated,
    fedLastUpdated,
    mvrvLastUpdated,
    ethLastUpdated,
    dominanceLastUpdated,
    altcoinLastUpdated,
    fetchBtcData,
    fetchFedBalanceData,
    fetchMvrvData,
    fetchEthData,
    fetchAltcoinData,
  } = useContext(DataContext);

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
    btcData: fetchBtcData,
    fedBalanceData: fetchFedBalanceData,
    mvrvData: fetchMvrvData,
    ethData: fetchEthData,
  };

  // Get the last updated date
  useEffect(() => {
    // Check if storageKey is for an altcoin (e.g., solData, ethData)
    const coin = Object.keys(altcoinLastUpdated).find(
      key => `${key.toLowerCase()}Data` === storageKey
    );
    if (coin && altcoinLastUpdated[coin]) {
      setLastUpdated(new Date(altcoinLastUpdated[coin]).toLocaleDateString());
    } else {
      const lastUpdatedDate = lastUpdatedMap[storageKey];
      if (lastUpdatedDate) {
        setLastUpdated(new Date(lastUpdatedDate).toLocaleDateString());
      } else {
        setLastUpdated('');
      }
    }
  }, [storageKey, refresh, btcLastUpdated, fedLastUpdated, mvrvLastUpdated, ethLastUpdated, dominanceLastUpdated, altcoinLastUpdated]);

  // Refresh handler
  const refreshComponent = () => {
    setRefresh(prev => prev + 1);
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

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
        Last Updated: {lastUpdated || '(click to refresh)'}
        <RefreshIcon />
      </p>
    </div>
  );
};

export default LastUpdated;