/**
 * Clerk-backed workbench layout persistence (load once, debounced save, unmount flush).
 * Extracted from Workbench.jsx orchestrator.
 */
import { useRef, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { apiUrl } from '../config/api';
import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
  availableStockSeries,
} from '../components/workbench/availableSeries';

export function useWorkbenchPersistence({
  isDashboard,
  mgmt,
  derivedHook,
  movingAverages,
  scaleModeState,
  setScaleModeState,
  setSnackbar,
  dataContext,
}) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const hasLoadedWorkbench = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isDirtyRef = useRef(false);
  const saveFnRef = useRef(null);
  const latestWorkbenchStateRef = useRef(null);

  const getCurrentWorkbenchState = useCallback(
    () => ({
      activeMacroSeries: mgmt.activeMacroSeries || [],
      activeCryptoSeries: mgmt.activeCryptoSeries || [],
      activeIndicatorSeries: mgmt.activeIndicatorSeries || [],
      activeStockSeries: mgmt.activeStockSeries || [],
      activeDerivedSeries: mgmt.activeDerivedSeries || [],
      derivedSeriesDefs: derivedHook.derivedSeriesDefs || [],
      seriesMovingAverages: movingAverages.seriesMovingAverages || {},
      seriesColors: movingAverages.seriesColors || {},
      scaleMode: scaleModeState,
    }),
    [
      mgmt.activeMacroSeries,
      mgmt.activeCryptoSeries,
      mgmt.activeIndicatorSeries,
      mgmt.activeStockSeries,
      mgmt.activeDerivedSeries,
      derivedHook.derivedSeriesDefs,
      movingAverages.seriesMovingAverages,
      movingAverages.seriesColors,
      scaleModeState,
    ]
  );

  const saveWorkbenchState = useCallback(
    async (state) => {
      if (!state || isDashboard || !isSignedIn) return;
      try {
        const token = await getToken();
        const resp = await fetch(apiUrl('/api/user-settings/'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workbenchState: state }),
        });
        if (!resp.ok) {
          console.warn('Save workbenchState responded not ok:', resp.status);
        }
      } catch (err) {
        console.warn('Failed to persist workbenchState (non-fatal):', err);
      }
    },
    [isDashboard, isSignedIn, getToken]
  );

  useEffect(() => {
    latestWorkbenchStateRef.current = getCurrentWorkbenchState();
  }, [getCurrentWorkbenchState]);

  useEffect(() => {
    saveFnRef.current = saveWorkbenchState;
  }, [saveWorkbenchState]);

  useEffect(() => {
    const loadWorkbench = async () => {
      if (hasLoadedWorkbench.current || isDashboard || !isSignedIn || !user) {
        hasLoadedWorkbench.current = true;
        return;
      }
      try {
        const token = await getToken();
        const response = await fetch(apiUrl('/api/user-settings/get/'), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.workbenchState) {
            const ws = data.workbenchState;
            if (Array.isArray(ws.activeMacroSeries)) {
              if (ws.activeMacroSeries.length > 0) {
                mgmt.handleMacroSeriesChange(
                  { target: { value: ws.activeMacroSeries } },
                  availableMacroSeries
                );
              } else {
                mgmt.setActiveMacroSeries([]);
              }
            }
            if (Array.isArray(ws.activeCryptoSeries)) {
              if (ws.activeCryptoSeries.length > 0) {
                mgmt.handleCryptoSeriesChange(
                  { target: { value: ws.activeCryptoSeries } },
                  availableCryptoSeries
                );
              } else {
                mgmt.setActiveCryptoSeries([]);
              }
            }
            if (Array.isArray(ws.activeIndicatorSeries)) {
              if (ws.activeIndicatorSeries.length > 0) {
                mgmt.handleIndicatorSeriesChange(
                  { target: { value: ws.activeIndicatorSeries } },
                  availableIndicatorSeries
                );
              } else {
                mgmt.setActiveIndicatorSeries([]);
              }
            }
            if (Array.isArray(ws.activeStockSeries)) {
              if (ws.activeStockSeries.length > 0) {
                mgmt.handleStockSeriesChange(
                  { target: { value: ws.activeStockSeries } },
                  availableStockSeries
                );
              } else {
                mgmt.setActiveStockSeries([]);
              }
            }
            if (Array.isArray(ws.activeDerivedSeries)) {
              mgmt.setActiveDerivedSeries(ws.activeDerivedSeries);
            }
            if (Array.isArray(ws.derivedSeriesDefs)) {
              derivedHook.setDerivedSeriesDefs(ws.derivedSeriesDefs);
            }
            if (ws.seriesMovingAverages && typeof ws.seriesMovingAverages === 'object') {
              movingAverages.setSeriesMovingAverages(ws.seriesMovingAverages);
            }
            if (ws.seriesColors && typeof ws.seriesColors === 'object') {
              movingAverages.setSeriesColors(ws.seriesColors);
            }
            if (typeof ws.scaleMode === 'number') {
              setScaleModeState(ws.scaleMode);
            }
            setTimeout(() => {
              if (derivedHook.recomputeAllDerived) derivedHook.recomputeAllDerived();
            }, 250);
          }
        }
      } catch (err) {
        console.warn('Could not load workbench state (using current):', err);
      } finally {
        hasLoadedWorkbench.current = true;
      }
    };
    loadWorkbench();
  }, [isDashboard, isSignedIn, user, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute derived after restore when base series arrive
  useEffect(() => {
    if (!hasLoadedWorkbench.current || isDashboard) return;
    const defs = derivedHook.derivedSeriesDefs || [];
    if (defs.length === 0) return;
    const dData = derivedHook.derivedData || {};
    const needs = defs.some((d) => !dData[d.id] || (dData[d.id] || []).length === 0);
    if (needs && derivedHook.recomputeAllDerived) {
      derivedHook.recomputeAllDerived();
    }
  }, [
    derivedHook.derivedSeriesDefs,
    (dataContext?.btcData || []).length,
    (dataContext?.ethData || []).length,
    Object.keys(dataContext?.fredSeriesData || {}).length,
    (dataContext?.fearAndGreedData || []).length,
    (dataContext?.dominanceData || []).length,
    (dataContext?.marketCapData || []).length,
    Object.keys(dataContext?.altcoinData || {}).length,
  ]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasLoadedWorkbench.current || isDashboard) return;
    isDirtyRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const snapshot = { ...(latestWorkbenchStateRef.current || getCurrentWorkbenchState()) };
    saveTimeoutRef.current = setTimeout(() => {
      if (saveFnRef.current) saveFnRef.current(snapshot);
    }, 800);
  }, [
    isDashboard,
    mgmt.activeMacroSeries,
    mgmt.activeCryptoSeries,
    mgmt.activeIndicatorSeries,
    mgmt.activeStockSeries,
    mgmt.activeDerivedSeries,
    derivedHook.derivedSeriesDefs,
    movingAverages.seriesMovingAverages,
    movingAverages.seriesColors,
    scaleModeState,
    getCurrentWorkbenchState,
  ]);

  // Unmount flush
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && saveFnRef.current && latestWorkbenchStateRef.current) {
        try {
          saveFnRef.current(latestWorkbenchStateRef.current);
        } catch (_) {
          /* ignore */
        }
      }
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleSaveWorkbench = useCallback(() => {
    if (isDashboard) return;
    const state = getCurrentWorkbenchState();
    saveWorkbenchState(state);
    setSnackbar?.({
      open: true,
      message: 'Workbench state saved (will persist across log out / login).',
    });
  }, [isDashboard, getCurrentWorkbenchState, saveWorkbenchState, setSnackbar]);

  return { handleSaveWorkbench, getCurrentWorkbenchState };
}

export default useWorkbenchPersistence;
