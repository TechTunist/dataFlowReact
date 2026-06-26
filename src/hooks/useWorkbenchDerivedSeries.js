/**
 * useWorkbenchDerivedSeries
 *
 * Extracted from Workbench.jsx as core of the "derived ops" premium feature (ratio, diff, etc.).
 *
 * Owns:
 * - derivedSeriesDefs + derivedData state
 * - dialog state for "Create Derived" (show + arith fields + trend mode fields: mode/base/trendType/degree)
 * - computeDerivedData (LOCF arith) + computeTrendData (imported regression fits for linear/log/poly/power/exp)
 * - handleCreateDerived (validates + branches arith vs trendline; auto-labels if empty)
 * - provenance helpers: getDerivedDescription, getDerivedInputIds (used for display + freshness)
 * - recomputeAllDerived() for restoring persisted defs after async base data loads
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
import { computeTrendData } from '../utils/trendRegression';
import {
  computeRatioComparison,
  describeRatioDerived,
} from '../utils/derivedRatioUtils';

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

  // Trendline / mode support (arithmetic keeps prior behavior; trendline fits regression to single base series)
  const [newDerivedMode, setNewDerivedMode] = useState('arithmetic'); // 'arithmetic' | 'trendline' | 'ratio'
  const [newDerivedBaseSeries, setNewDerivedBaseSeries] = useState('');
  const [newDerivedTrendType, setNewDerivedTrendType] = useState('linear');
  const [newDerivedPolyDegree, setNewDerivedPolyDegree] = useState(2);

  // Ratio comparison mode
  const [newDerivedRatioOutput, setNewDerivedRatioOutput] = useState('relative_performance');
  const [newDerivedZscoreWindow, setNewDerivedZscoreWindow] = useState(252);

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

  // Small local getter (seriesData is injected and up-to-date via parent re-renders + deps)
  const getSeriesLabel = useCallback((id) => {
    if (!id || !seriesData) return id || '';
    const t = seriesData.getSeriesType ? seriesData.getSeriesType(id, []) : seriesData.getType(id);
    const info = seriesData.getSeriesInfo ? seriesData.getSeriesInfo(id, t) : null;
    return info?.label || id;
  }, [seriesData]);

  // Provenance helpers (used by Workbench for display + last-updated freshness)
  const getDerivedInputIds = useCallback((id) => {
    const def = derivedSeriesDefs.find(d => d.id === id);
    if (!def) return [];
    if (def.trendType) return def.baseSeries ? [def.baseSeries] : [];
    if (def.ratioOutput) return [def.series1, def.series2].filter(Boolean);
    return [def.series1, def.series2].filter(Boolean);
  }, [derivedSeriesDefs]);

  const getDerivedDescription = useCallback((idOrDef) => {
    const def = typeof idOrDef === 'string' ? derivedSeriesDefs.find(d => d.id === idOrDef) : idOrDef;
    if (!def) return '';
    if (def.ratioOutput) {
      return describeRatioDerived(def, getSeriesLabel);
    }
    if (def.trendType) {
      const baseL = getSeriesLabel(def.baseSeries);
      const typeLabels = {
        linear: 'Linear',
        logarithmic: 'Logarithmic',
        polynomial: `Polynomial (deg ${def.polyDegree || 2})`,
        power: 'Power',
        exponential: 'Exponential',
      };
      const tLabel = typeLabels[def.trendType] || def.trendType;
      return `${tLabel} trend of ${baseL}`;
    }
    const l1 = getSeriesLabel(def.series1);
    const l2 = getSeriesLabel(def.series2);
    const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    const opSym = opMap[def.operation] || def.operation;
    return `${l1} ${opSym} ${l2}`;
  }, [derivedSeriesDefs, getSeriesLabel]);

  const handleCreateDerived = useCallback(() => {
    const isArith = newDerivedMode === 'arithmetic';
    const isRatio = newDerivedMode === 'ratio';

    if (!seriesData || !seriesData.getRawData || !seriesData.getNormalizedData) {
      onSnackbar({ open: true, message: 'Derived series data helpers not available.' });
      return;
    }

    let finalLabel = (newDerivedLabel || '').trim();

    if (isArith || isRatio) {
      if (!newDerivedSeries1 || !newDerivedSeries2) {
        onSnackbar({ open: true, message: isRatio ? 'Please select a numerator and denominator.' : 'Please select Series 1 and Series 2.' });
        return;
      }
      if (newDerivedSeries1 === newDerivedSeries2) {
        onSnackbar({ open: true, message: 'Numerator and denominator must be different.' });
        return;
      }
      if (isArith && !finalLabel) {
        const l1 = getSeriesLabel(newDerivedSeries1);
        const l2 = getSeriesLabel(newDerivedSeries2);
        const opSym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[newDerivedOperation] || newDerivedOperation;
        finalLabel = `${l1} ${opSym} ${l2}`;
      }
      if (isRatio && !finalLabel) {
        finalLabel = describeRatioDerived({
          series1: newDerivedSeries1,
          series2: newDerivedSeries2,
          ratioOutput: newDerivedRatioOutput,
          zscoreWindow: newDerivedZscoreWindow,
        }, getSeriesLabel);
      }
    } else {
      if (!newDerivedBaseSeries) {
        onSnackbar({ open: true, message: 'Please select a base series for the trendline.' });
        return;
      }
      if (!finalLabel) {
        const baseL = getSeriesLabel(newDerivedBaseSeries);
        const typeNice = {
          linear: 'Linear',
          logarithmic: 'Logarithmic',
          polynomial: `Polynomial deg${newDerivedPolyDegree || 2}`,
          power: 'Power',
          exponential: 'Exponential',
        }[newDerivedTrendType] || 'Trend';
        finalLabel = `${typeNice} (${baseL})`;
      }
    }

    if (!finalLabel) {
      onSnackbar({ open: true, message: 'Please provide a label for the derived series.' });
      return;
    }

    let computed = [];
    let defExtra = {};

    if (isRatio) {
      const type1 = seriesData.getSeriesType ? seriesData.getSeriesType(newDerivedSeries1, []) : seriesData.getType(newDerivedSeries1);
      const type2 = seriesData.getSeriesType ? seriesData.getSeriesType(newDerivedSeries2, []) : seriesData.getType(newDerivedSeries2);
      const raw1 = seriesData.getRawData(newDerivedSeries1, type1);
      const raw2 = seriesData.getRawData(newDerivedSeries2, type2);
      const valueKey1 = seriesData.getValueKey(newDerivedSeries1);
      const valueKey2 = seriesData.getValueKey(newDerivedSeries2);
      const norm1 = seriesData.getNormalizedData(raw1, valueKey1);
      const norm2 = seriesData.getNormalizedData(raw2, valueKey2);

      const ratioResult = computeRatioComparison(norm1, norm2, {
        ratioOutput: newDerivedRatioOutput,
        zscoreWindow: newDerivedZscoreWindow,
      });
      if (!ratioResult) {
        onSnackbar({ open: true, message: 'No overlapping data for ratio comparison. Ensure both series have positive values from the anchor date.' });
        return;
      }
      computed = ratioResult.points;
      defExtra = {
        series1: newDerivedSeries1,
        series2: newDerivedSeries2,
        ratioOutput: newDerivedRatioOutput,
        zscoreWindow: newDerivedZscoreWindow,
        anchorTime: ratioResult.anchorTime,
        allowLogScale: newDerivedRatioOutput === 'relative_performance',
      };
    } else if (isArith) {
      const type1 = seriesData.getSeriesType ? seriesData.getSeriesType(newDerivedSeries1, []) : seriesData.getType(newDerivedSeries1);
      const type2 = seriesData.getSeriesType ? seriesData.getSeriesType(newDerivedSeries2, []) : seriesData.getType(newDerivedSeries2);
      const raw1 = seriesData.getRawData(newDerivedSeries1, type1);
      const raw2 = seriesData.getRawData(newDerivedSeries2, type2);
      const valueKey1 = seriesData.getValueKey(newDerivedSeries1);
      const valueKey2 = seriesData.getValueKey(newDerivedSeries2);

      const norm1 = seriesData.getNormalizedData(raw1, valueKey1);
      const norm2 = seriesData.getNormalizedData(raw2, valueKey2);

      computed = computeDerivedData(norm1, norm2, newDerivedOperation);
      defExtra = {
        series1: newDerivedSeries1,
        series2: newDerivedSeries2,
        operation: newDerivedOperation,
      };
    } else {
      const baseType = seriesData.getSeriesType ? seriesData.getSeriesType(newDerivedBaseSeries, []) : seriesData.getType(newDerivedBaseSeries);
      const rawBase = seriesData.getRawData(newDerivedBaseSeries, baseType);
      const valueKeyB = seriesData.getValueKey(newDerivedBaseSeries);
      const normBase = seriesData.getNormalizedData(rawBase, valueKeyB);

      computed = computeTrendData(normBase, newDerivedTrendType, newDerivedPolyDegree);
      defExtra = {
        baseSeries: newDerivedBaseSeries,
        trendType: newDerivedTrendType,
        polyDegree: newDerivedTrendType === 'polynomial' ? newDerivedPolyDegree : undefined,
      };
    }

    if (computed.length === 0) {
      onSnackbar({
        open: true,
        message: isRatio
          ? 'No ratio data could be computed for the selected series.'
          : isArith
            ? 'No overlapping data for the selected series.'
            : 'No data available to fit trendline.',
      });
      return;
    }

    const newId = `derived_${derivedSeriesDefs.length + 1}`;

    setDerivedData(prev => ({ ...prev, [newId]: computed }));
    setDerivedSeriesDefs(prev => [
      ...prev,
      {
        id: newId,
        label: finalLabel,
        color: newDerivedColor,
        scaleId: 'derived-scale',
        chartType: 'line',
        allowLogScale: true,
        ...defExtra,
      }
    ]);

    // Activate via callback so series management hook owns the active list
    onActivateDerived(newId);

    // Reset form (both arith + trend fields)
    setShowDerivedDialog(false);
    setNewDerivedSeries1('');
    setNewDerivedSeries2('');
    setNewDerivedOperation('+');
    setNewDerivedLabel('');
    setNewDerivedColor('#00FFFF');
    setNewDerivedMode('arithmetic');
    setNewDerivedBaseSeries('');
    setNewDerivedTrendType('linear');
    setNewDerivedPolyDegree(2);
    setNewDerivedRatioOutput('relative_performance');
    setNewDerivedZscoreWindow(252);
  }, [
    newDerivedMode,
    newDerivedSeries1, newDerivedSeries2, newDerivedOperation,
    newDerivedRatioOutput, newDerivedZscoreWindow,
    newDerivedBaseSeries, newDerivedTrendType, newDerivedPolyDegree,
    newDerivedLabel, newDerivedColor,
    derivedSeriesDefs.length,
    seriesData,
    computeDerivedData,
    getSeriesLabel,
    onSnackbar,
    onActivateDerived,
  ]);

  const openDerivedDialog = useCallback(() => {
    setShowDerivedDialog(true);
  }, []);

  const closeDerivedDialog = useCallback(() => {
    setShowDerivedDialog(false);
    // Clear transient form so next open starts fresh (arith default + empty)
    setNewDerivedSeries1('');
    setNewDerivedSeries2('');
    setNewDerivedOperation('+');
    setNewDerivedLabel('');
    setNewDerivedColor('#00FFFF');
    setNewDerivedMode('arithmetic');
    setNewDerivedBaseSeries('');
    setNewDerivedTrendType('linear');
    setNewDerivedPolyDegree(2);
    setNewDerivedRatioOutput('relative_performance');
    setNewDerivedZscoreWindow(252);
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
    setNewDerivedMode('arithmetic');
    setNewDerivedBaseSeries('');
    setNewDerivedTrendType('linear');
    setNewDerivedPolyDegree(2);
    setNewDerivedRatioOutput('relative_performance');
    setNewDerivedZscoreWindow(252);
  }, []);

  // Recompute derived data from current defs (using latest getters from seriesData).
  // Used on restore from persisted workbench state (bases may load async, so safe to call multiple times).
  const recomputeAllDerived = useCallback(() => {
    if (!seriesData || !derivedSeriesDefs || derivedSeriesDefs.length === 0) return;
    const newData = {};
    derivedSeriesDefs.forEach((def) => {
      try {
        if (def.trendType && def.baseSeries) {
          const bType = seriesData.getSeriesType ? seriesData.getSeriesType(def.baseSeries, []) : seriesData.getType(def.baseSeries);
          const raw = seriesData.getRawData(def.baseSeries, bType);
          const vk = seriesData.getValueKey(def.baseSeries);
          const norm = seriesData.getNormalizedData(raw, vk);
          const comp = computeTrendData(norm, def.trendType, def.polyDegree || 2);
          if (comp && comp.length > 0) newData[def.id] = comp;
        } else if (def.ratioOutput && def.series1 && def.series2) {
          const t1 = seriesData.getSeriesType ? seriesData.getSeriesType(def.series1, []) : seriesData.getType(def.series1);
          const t2 = seriesData.getSeriesType ? seriesData.getSeriesType(def.series2, []) : seriesData.getType(def.series2);
          const r1 = seriesData.getRawData(def.series1, t1);
          const r2 = seriesData.getRawData(def.series2, t2);
          const vk1 = seriesData.getValueKey(def.series1);
          const vk2 = seriesData.getValueKey(def.series2);
          const n1 = seriesData.getNormalizedData(r1, vk1);
          const n2 = seriesData.getNormalizedData(r2, vk2);
          const ratioResult = computeRatioComparison(n1, n2, {
            ratioOutput: def.ratioOutput,
            zscoreWindow: def.zscoreWindow || 252,
          });
          if (ratioResult?.points?.length > 0) newData[def.id] = ratioResult.points;
        } else if (def.series1 && def.series2) {
          const t1 = seriesData.getSeriesType ? seriesData.getSeriesType(def.series1, []) : seriesData.getType(def.series1);
          const t2 = seriesData.getSeriesType ? seriesData.getSeriesType(def.series2, []) : seriesData.getType(def.series2);
          const r1 = seriesData.getRawData(def.series1, t1);
          const r2 = seriesData.getRawData(def.series2, t2);
          const vk1 = seriesData.getValueKey(def.series1);
          const vk2 = seriesData.getValueKey(def.series2);
          const n1 = seriesData.getNormalizedData(r1, vk1);
          const n2 = seriesData.getNormalizedData(r2, vk2);
          const comp = computeDerivedData(n1, n2, def.operation);
          if (comp && comp.length > 0) newData[def.id] = comp;
        }
      } catch (e) {
        console.warn('Workbench: recompute derived failed for', def && def.id, e);
      }
    });
    if (Object.keys(newData).length > 0) {
      setDerivedData((prev) => ({ ...prev, ...newData }));
    }
  }, [derivedSeriesDefs, seriesData, computeDerivedData, computeTrendData]);

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

    // Trend / mode form state
    newDerivedMode,
    setNewDerivedMode,
    newDerivedBaseSeries,
    setNewDerivedBaseSeries,
    newDerivedTrendType,
    setNewDerivedTrendType,
    newDerivedPolyDegree,
    setNewDerivedPolyDegree,

    newDerivedRatioOutput,
    setNewDerivedRatioOutput,
    newDerivedZscoreWindow,
    setNewDerivedZscoreWindow,

    // Logic
    computeDerivedData,
    handleCreateDerived,
    recomputeAllDerived,

    // Provenance (for UI + last-updated)
    getDerivedDescription,
    getDerivedInputIds,

    // Actions
    openDerivedDialog,
    closeDerivedDialog,
    resetDerived,
  };
}

export default useWorkbenchDerivedSeries;
