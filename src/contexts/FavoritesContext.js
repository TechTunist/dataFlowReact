import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

export const FavoritesContext = createContext({
  favoriteCharts: [],
  addFavoriteChart: () => {},
  removeFavoriteChart: () => {},
  error: '',
  loading: false,
  clearError: () => {},
});

export const FavoritesProvider = ({ children }) => {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [favoriteCharts, setFavoriteCharts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://vercel-dataflow.vercel.app';

  const fetchFavorites = useCallback(async () => {
    if (!isSignedIn || !user) return;
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(`${API_BASE_URL}/api/favorite-charts/?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch favorite charts');
      }
      const data = await response.json();
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      setError(`Failed to fetch favorite charts: ${err.message}`);
      console.error('Fetch favorites error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  const addFavoriteChart = useCallback(async (chartId) => {
    if (!isSignedIn || !user) {
      setError('Please sign in to add favorite charts.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await getToken({ forceRefreshToken: true });
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(`${API_BASE_URL}/api/favorite-charts/add/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chartId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add favorite chart');
      }
      const data = await response.json();
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      setError(err.message);
      console.error('Add favorite error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  const removeFavoriteChart = useCallback(async (chartId) => {
    if (!isSignedIn || !user) {
      setError('Please sign in to remove favorite charts.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await getToken({ forceRefreshToken: true });
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(`${API_BASE_URL}/api/favorite-charts/remove/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chartId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove favorite chart');
      }
      const data = await response.json();
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      setError(err.message);
      console.error('Remove favorite error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <FavoritesContext.Provider value={{ favoriteCharts, addFavoriteChart, removeFavoriteChart, error, loading, clearError }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);