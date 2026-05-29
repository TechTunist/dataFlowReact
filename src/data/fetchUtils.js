/**
 * fetchUtils.js
 *
 * Small, focused wrappers around the existing fetchWithCache and refreshData
 * patterns from DataContext. This lets the new DataService layer reuse the
 * battle-tested caching logic without duplicating it.
 *
 * These are intentionally thin right now. As the DataContext refactor progresses,
 * more of the original fetch logic can move here.
 */

import { fetchWithCache as originalFetchWithCache, refreshData as originalRefreshData } from '../DataContext';

// Re-export the core functions so the service layer has a single import point.
// In the future we can enhance these here (logging, metrics, etc.) without
// touching DataContext.
export const fetchWithCache = originalFetchWithCache;
export const refreshData = originalRefreshData;

// Convenience wrapper that many price/macro fetches use
export async function fetchSeriesWithCache({
  cacheId,
  endpoint,
  formatData,
  setData,
  setLastUpdated,
  setIsFetched,
  ...rest
}) {
  return fetchWithCache({
    cacheId,
    apiUrl: endpoint, // caller should pass full apiUrl(...) result
    formatData,
    setData,
    setLastUpdated,
    setIsFetched,
    ...rest,
  });
}