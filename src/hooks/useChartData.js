/**
 * useChartData — canonical way for charts/scenes to access market series.
 *
 * Why this exists
 * ---------------
 * Historically every chart did `useContext(DataContext)` and pulled both series
 * arrays and fetch* functions. That mixed two concerns and made it hard to see
 * which pieces re-render / load data.
 *
 * Canonical pattern (prefer this for all new and refactored charts):
 *
 *   import { useChartData } from '../hooks/useChartData';
 *
 *   // Data only (re-renders when context data changes)
 *   const { btcData, btcLastUpdated } = useChartData();
 *
 *   // Loads (stable identity — safe in effect deps)
 *   const { fetchBtcData } = useChartDataActions();
 *
 *   // Or both in one call when a component needs both:
 *   const { data, actions } = useChartSeries();
 *   const { btcData } = data;
 *   const { fetchBtcData } = actions;
 *
 * Auto-load helper (optional):
 *
 *   useEnsureSeries({
 *     ready: btcData?.length > 0,
 *     load: () => fetchBtcData(),
 *   });
 *
 * Under the hood this is DataContext + DataService. Do not call raw API URLs
 * or IndexedDB from chart components — go through fetch* / DataService.
 */

import { useEffect, useRef } from 'react';
import { useData, useDataActions } from '../DataContext';

/** Series arrays, lastUpdated stamps, flags — may re-render when any series updates. */
export function useChartData() {
  return useData();
}

/** fetch* / refresh* only — stable function identities from DataActionsContext. */
export function useChartDataActions() {
  return useDataActions();
}

/**
 * Convenience: both bags. Prefer destructuring data vs actions so future
 * splits stay obvious to newcomers.
 */
export function useChartSeries() {
  return {
    data: useData(),
    actions: useDataActions(),
  };
}

/**
 * Load a series once when not ready. Stable, no infinite loops.
 * @param {{ ready: boolean, load: () => (void|Promise<void>), enabled?: boolean }} opts
 */
export function useEnsureSeries({ ready, load, enabled = true }) {
  const attempted = useRef(false);
  useEffect(() => {
    if (!enabled || ready || attempted.current) return;
    if (typeof load !== 'function') return;
    attempted.current = true;
    Promise.resolve(load()).catch(() => {
      // Allow a later retry if load failed (e.g. auth not ready).
      attempted.current = false;
    });
  }, [ready, load, enabled]);
}

export default useChartData;
