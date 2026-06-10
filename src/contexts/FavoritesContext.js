import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { apiUrl } from '../config/api';
import { getClerkToken } from '../utils/clerkAuth';

export const FavoritesContext = createContext({
  favoriteCharts: [],
  addFavoriteChart: () => {},
  removeFavoriteChart: () => {},
  error: '',
  loading: false,
  clearError: () => {},
});

export const FavoritesProvider = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const userId = user?.id ?? null;
  const [favoriteCharts, setFavoriteCharts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchFavorites = useCallback(async () => {
    if (!isSignedIn || !userId) return;

    const isInitialFetch = !hasFetchedRef.current;
    if (isInitialFetch) {
      setLoading(true);
    }
    setError('');

    try {
      const token = await getClerkToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/favorite-charts/'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch favorite charts');
      }
      const data = await response.json();
      const nextFavorites = data.favoriteCharts || [];
      setFavoriteCharts((prev) => (
        prev.length === nextFavorites.length && prev.every((id, index) => id === nextFavorites[index])
          ? prev
          : nextFavorites
      ));
      hasFetchedRef.current = true;
    } catch (err) {
      setError(`Failed to fetch favorite charts: ${err.message}`);
      console.error('Fetch favorites error:', err.message);
    } finally {
      if (isInitialFetch) {
        setLoading(false);
      }
    }
  }, [isSignedIn, userId]);

  const addFavoriteChart = useCallback(async (chartId) => {
    if (!isSignedIn || !userId) {
      setError('Please sign in to add favorite charts.');
      return;
    }
    // Optimistic update: Add chart to state immediately
    setFavoriteCharts((prev) => {
      if (prev.includes(chartId)) return prev; // Avoid duplicates
      return [...prev, chartId];
    });
    setLoading(true);
    setError('');
    try {
      const token = await getClerkToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/favorite-charts/add/'), {
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
      // Sync with server response
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      // Revert optimistic update on failure
      setFavoriteCharts((prev) => prev.filter((id) => id !== chartId));
      setError(err.message);
      console.error('Add favorite error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userId]);

  const removeFavoriteChart = useCallback(async (chartId) => {
    if (!isSignedIn || !userId) {
      setError('Please sign in to remove favorite charts.');
      return;
    }
    // Optimistic update: Remove chart from state immediately
    setFavoriteCharts((prev) => prev.filter((id) => id !== chartId));
    setLoading(true);
    setError('');
    try {
      const token = await getClerkToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/favorite-charts/remove/'), {
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
      // Sync with server response
      setFavoriteCharts(data.favoriteCharts || []);
    } catch (err) {
      // Revert optimistic update on failure
      setFavoriteCharts((prev) => [...prev, chartId].sort()); // Re-add and sort to maintain order
      setError(err.message);
      console.error('Remove favorite error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userId]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      hasFetchedRef.current = false;
      setFavoriteCharts([]);
      setLoading(false);
      return;
    }

    fetchFavorites();
  }, [isLoaded, isSignedIn, userId, fetchFavorites]);

  return (
    <FavoritesContext.Provider value={{ favoriteCharts, addFavoriteChart, removeFavoriteChart, error, loading, clearError }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);