// src/contexts/FavoritesContext.js
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children, user, isSignedIn }) => {
  const { getToken } = useAuth();
  const [favoriteCharts, setFavoriteCharts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://vercel-dataflow.vercel.app';

  const fetchFavoriteCharts = useCallback(async () => {
    if (!isSignedIn || !user) return;

    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/favorite-charts/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch favorite charts');
      }

      const data = await response.json();
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      setError(`Failed to fetch favorite charts: ${err.message}`);
      setFavoriteCharts([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  const addFavoriteChart = useCallback(async (chartId) => {
    if (!isSignedIn || !user) return;

    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/favorite-charts/add/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chartId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add favorite chart');
      }

      const data = await response.json();
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      setError(`Failed to add favorite chart: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  const removeFavoriteChart = useCallback(async (chartId) => {
    if (!isSignedIn || !user) return;

    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/favorite-charts/remove/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chartId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove favorite chart');
      }

      const data = await response.json();
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      setError(`Failed to remove favorite chart: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchFavoriteCharts();
    }
  }, [isSignedIn, user, fetchFavoriteCharts]);

  return (
    <FavoritesContext.Provider value={{ favoriteCharts, loading, error, addFavoriteChart, removeFavoriteChart }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};