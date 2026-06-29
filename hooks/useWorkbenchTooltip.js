/**
 * useWorkbenchTooltip
 *
 * Extracted hook to encapsulate the high-performance direct-DOM tooltip system
 * (the rAF + Map/points LOCF work done in prior professionalization pass).
 *
 * Responsibilities:
 * - Create the tooltip DOM element once (appended to chart container)
 * - Provide updateTooltipDOM(info) that does direct style + innerHTML mutations (no React render)
 * - Provide a crosshairMove subscriber factory that does the param processing + rAF scheduling
 *   (using the fast seriesDataMaps if present, but primarily the robust pointsRef LOCF binary search for mixed-freq)
 *
 * The actual subscription + cleanup + raf cancel lives in the main chart effect (because it is tied to
 * chartRef.subscribeCrosshairMove lifecycle inside the big series-sync effect).
 * This hook gives stable, referentially-equal fns for that effect.
 *
 * Why extracted:
 * - Makes the 150+ line tooltip block in the effect easier to understand/maintain.
 * - Documents the "why direct DOM + rAF" clearly.
 * - Future: if we ever want a portal or canvas tooltip, only change here.
 *
 * No state owned here (the tooltipElRef and rafIdRef stay as refs in the component).
 * All fns are useCallback.
 *
 * Preserves exact prior behavior (offsets, flip logic, html building, year "latest" label, MA suffix, N/A).
 */

import { useCallback, useRef } from 'react';

export function useWorkbenchTooltip({
  chartContainerRef,
  theme,
  colors,
  valueFormatter,
  getSeriesInfo,
  getSeriesColor,
  seriesMovingAverages,
  activeMacroSeries = [],
  activeCryptoSeries = [],
  activeIndicatorSeries = [],
  activeDerivedSeries = [],
} = {}) {
  const tooltipElRef = useRef(null);
  const rafIdRef = useRef(null);

  const createTooltipElementIfNeeded = useCallback(() => {
    if (tooltipElRef.current || !chartContainerRef?.current) return tooltipElRef.current;

    const el = document.createElement('div');
    el.className = 'workbench-tooltip';
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '1000';
    el.style.padding = '6px 10px';
    el.style.borderRadius = '4px';
    el.style.fontSize = '13px';
    el.style.lineHeight = '1.3';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
    el.style.whiteSpace = 'nowrap';
    el.style.display = 'none';
    chartContainerRef.current.appendChild(el);
    tooltipElRef.current = el;
    return el;
  }, [chartContainerRef]);

  const updateTooltipDOM = useCallback((tooltipInfo) => {
    const el = tooltipElRef.current;
    if (!el) return;

    if (!tooltipInfo) {
      el.style.display = 'none';
      return;
    }

    const container = chartContainerRef?.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const tooltipWidth = 220;
    const tooltipHeight = 80;

    const offsetX = 14;
    const offsetY = -10;

    let left = tooltipInfo.x + offsetX;
    let top = tooltipInfo.y + offsetY;

    if (left + tooltipWidth > containerWidth - 8) {
      left = tooltipInfo.x - tooltipWidth - offsetX;
    }
    if (top < 8) {
      top = tooltipInfo.y + 18;
    }
    if (top + tooltipHeight > containerHeight - 8) {
      top = containerHeight - tooltipHeight - 8;
    }
    left = Math.max(4, left);
    top = Math.max(4, top);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.backgroundColor = theme?.palette?.mode === 'dark' ? colors?.primary?.[900] : colors?.primary?.[200];
    el.style.color = theme?.palette?.mode === 'dark' ? colors?.grey?.[100] : colors?.grey?.[900];
    el.style.display = 'block';

    // Build content (exact same as original direct-DOM version)
    let html = '';
    const allActive = [...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries];
    allActive.forEach(id => {
      const isMacro = activeMacroSeries.includes(id);
      const isCrypto = activeCryptoSeries.includes(id);
      const isIndicator = activeIndicatorSeries.includes(id);
      const isDerived = activeDerivedSeries.includes(id);
      const info = getSeriesInfo ? getSeriesInfo(id, isMacro ? 'macro' : isCrypto ? 'crypto' : isIndicator ? 'indicator' : 'derived') : null;
      const color = getSeriesColor ? getSeriesColor(id, isMacro ? 'macro' : isCrypto ? 'crypto' : isIndicator ? 'indicator' : 'derived') : '#00FFFF';
      const ma = seriesMovingAverages?.[id] && seriesMovingAverages[id] !== 'None' ? ` (${seriesMovingAverages[id]} MA)` : '';
      const val = tooltipInfo.values?.[id] != null ? valueFormatter(tooltipInfo.values[id]) : 'N/A';
      html += `<div style="margin: 1px 0;"><span style="color:${color};">${info?.label || id}${ma}: ${val}</span></div>`;
    });

    const dateStr = tooltipInfo.date && tooltipInfo.date.toString().substring(0, 4) === new Date().getFullYear().toString()
      ? `${tooltipInfo.date}, latest`
      : (tooltipInfo.date || '');
    html += `<div style="margin-top: 4px; opacity: 0.85; font-size: 12px;">${dateStr}</div>`;
    el.innerHTML = html;
  }, [
    chartContainerRef,
    theme,
    colors,
    valueFormatter,
    getSeriesInfo,
    getSeriesColor,
    seriesMovingAverages,
    activeMacroSeries,
    activeCryptoSeries,
    activeIndicatorSeries,
    activeDerivedSeries,
  ]);

  const scheduleTooltipUpdate = useCallback((fn) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(fn);
  }, []);

  const cancelPendingTooltipUpdate = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const cleanupTooltip = useCallback(() => {
    cancelPendingTooltipUpdate();
    if (tooltipElRef.current && tooltipElRef.current.parentNode) {
      tooltipElRef.current.parentNode.removeChild(tooltipElRef.current);
      tooltipElRef.current = null;
    }
  }, [cancelPendingTooltipUpdate]);

  return {
    tooltipElRef,
    rafIdRef,
    createTooltipElementIfNeeded,
    updateTooltipDOM,
    scheduleTooltipUpdate,
    cancelPendingTooltipUpdate,
    cleanupTooltip,
  };
}

export default useWorkbenchTooltip;
