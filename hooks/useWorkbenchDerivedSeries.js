/**
 * useWorkbenchDerivedSeries
 *
 * Extracted from Workbench.jsx as core of the "derived ops" premium feature (ratio, diff, etc.).
 *
 * Owns:
 * - derivedSeriesDefs + derivedData state
 * - dialog state for "Create Derived" (show + the 4 newDerived* fields)
 * - computeDerivedData (the LOCF + guard logic; includes Infinity/zero guards + finite filter from recent hardening)
 * - handleCreateDerived (validates, normalizes via passed seriesData helpers, computes, updates local states)
 *
 * Preserves:
 * - Exact same computation (last-carry for missing times, skip if last2==0 or non-finite)
 * - Snackbar error via callback (no direct state here)
 * - After create: auto-activate via provided onActivate callback (so useSeriesManagement can own the activeDerived list)
 * - Aggressive fitContent is handled in the chart effect (not here)
 *
 * Data layer:
 * - Uses injected getRawData + getNormalizedData (from useWorkbenchSeriesData)
 * - // INTEGRATE WITH DATA LAYER
 *   TODO: When DataService implements getDerivedSeries(definition, sourceSeries), move the compute + map-carry
 *   logic behind the service (so Workbench just declares "ratio of SP500/BTC" and service returns the series + provenance).
 *   This hook then becomes a thin consumer + UI state for the dialog.
 *
 * No chart refs, no tooltip, no MA (those are orthogonal).
 */

import { useState, useCallback } from 'react';

export function useWorkbenchDerivedSeries({
  seriesData, // { getRawData, getNormalizedData, getType, getValueKey }
  onSnackbar = () => {},
  onActivateDerived = () => {},
} = {}) {
  const [derivedSeriesDefs, setDerivedSeriesDefs] = useState([]);
  const [derivedData, setDerivedData] = useState({});
  const [showDerivedDialog, setShowDerivedDialog] = useState(false);

  const [newDerivedSeries1, setNewDerivedSeries1] = useState('');
  const [newDerivedSeries2, setNewDerivedSeries2] = useState('');
  const [newDerivedOperation, setNewDerivedOperation] = useState('+');
  const [newDerivedLabel, setNewDerivedLabel] = useState('');
  const [newDerivedColor, setNewDerivedColor] = useState('#00FFFF');

  const computeDerivedData = useCallback((d1, d2, op) => {
    // Map-based last-value carry (LOCF) for non-aligned times (critical for mixed freq e.g. SP500 daily + monthly macro)
    const map1 = new Map(d1.map(d => [d.time, d.value]));
    const map2 = new Map(d2.map(d => [d.time, d.value]));
    const times = [...new Set([...d1.map(d => d.time), ...d2.map(d => d.time)])].sort();

    let last1 = null, last2 = null;
    const result = [];
    for (let t of times) {
      if (map1.has(t)) last1 = map1.get(t);
      if (map2.has(t)) last2 = map2.get(t);

      if (last1 !== null && last2 !== 0) {
        let v;
        switch (op) {
          case '+': v = last1 + last2; break;
          case '-': v = last1 - last2; break;
          case '*': v = last1 * last2; break;
          case '/': v = (last2 !== 0 && isFinite(last2)) ? last1 / last2 : null; break;
          default: v = null;
        }
        // Hardened guards (from prior perf/stability pass): drop Infinity / NaN / non-finite
        if (v !== null && isFinite(v)) {
          result.push({ time: t, value: v });
        }
      }
    }
    return result;
  }, []);

  const handleCreateDerived = useCallback(() => {
    if (!newDerivedSeries1 || !newDerivedSeries2 || !newDerivedLabel) {
      onSnackbar({ open: true, message: 'Please fill in all fields for derived series.' });
      return;
    }
    if (newDerivedSeries1 === newDerivedSeries2) {
      onSnackbar({ open: true, message: 'Series 1 and Series 2 must be different.' });
      return;
    }

    if (!seriesData || !seriesData.getRawData || !seriesData.getNormalizedData) {
      onSnackbar({ open: true, message: 'Derived series data helpers not available.' });
      return;
    }

    const type1 = seriesData.getType(newDerivedSeries1);
    const type2 = seriesData.getType(newDerivedSeries2);
    const raw1 = seriesData.getRawData(newDerivedSeries1, type1);
    const raw2 = seriesData.getRawData(newDerivedSeries2, type2);
    const valueKey1 = seriesData.getValueKey(newDerivedSeries1);
    const valueKey2 = seriesData.getValueKey(newDerivedSeries2);

    const norm1 = seriesData.getNormalizedData(raw1, valueKey1);
    const norm2 = seriesData.getNormalizedData(raw2, valueKey2);

    const computed = computeDerivedData(norm1, norm2, newDerivedOperation);

    if (computed.length === 0) {
      onSnackbar({ open: true, message: 'No overlapping data for the selected series.' });
      return;
    }

    const newId = `derived_${derivedSeriesDefs.length + 1}`;

    setDerivedData(prev => ({ ...prev, [newId]: computed }));
    setDerivedSeriesDefs(prev => [
      ...prev,
      {
        id: newId,
        label: newDerivedLabel,
        series1: newDerivedSeries1,
        series2: newDerivedSeries2,
        operation: newDerivedOperation,
        color: newDerivedColor,
        scaleId: 'derived-scale',
        chartType: 'line',
        allowLogScale: true,
      }
    ]);

    // Activate via callback so series management hook owns the active list
    onActivateDerived(newId);

    // Reset form
    setShowDerivedDialog(false);
    setNewDerivedSeries1('');
    setNewDerivedSeries2('');
    setNewDerivedOperation('+');
    setNewDerivedLabel('');
    setNewDerivedColor('#00FFFF');
  }, [
    newDerivedSeries1, newDerivedSeries2, newDerivedLabel, newDerivedOperation, newDerivedColor,
    derivedSeriesDefs.length,
    seriesData,
    computeDerivedData,
    onSnackbar,
    onActivateDerived,
  ]);

  const openDerivedDialog = useCallback(() => {
    setShowDerivedDialog(true);
  }, []);

  const closeDerivedDialog = useCallback(() => {
    setShowDerivedDialog(false);
  }, []);

  const resetDerived = useCallback(() => {
    setDerivedSeriesDefs([]);
    setDerivedData({});
    setShowDerivedDialog(false);
    setNewDerivedSeries1('');
    setNewDerivedSeries2('');
    setNewDerivedOperation('+');
    setNewDerivedLabel('');
    setNewDerivedColor('#00FFFF');
  }, []);

  return {
    // State
    derivedSeriesDefs,
    setDerivedSeriesDefs,
    derivedData,
    setDerivedData,
    showDerivedDialog,

    // Form state (for the create dialog UI)
    newDerivedSeries1,
    setNewDerivedSeries1,
    newDerivedSeries2,
    setNewDerivedSeries2,
    newDerivedOperation,
    setNewDerivedOperation,
    newDerivedLabel,
    setNewDerivedLabel,
    newDerivedColor,
    setNewDerivedColor,

    // Logic
    computeDerivedData,
    handleCreateDerived,

    // Actions
    openDerivedDialog,
    closeDerivedDialog,
    resetDerived,
  };
}

export default useWorkbenchDerivedSeries;
