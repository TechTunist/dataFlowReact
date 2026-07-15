import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, useMediaQuery, Box } from "@mui/material";
import '../styling/bitcoinChart.css';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import ChartInfoSections from './ChartInfoSections';
import BitcoinFees from './BitcoinTransactionFees';
import { useChartData, useChartDataActions } from '../hooks/useChartData';

/** Stable range definitions (same colours / labels as original). */
const EXTENSION_RANGES = [
  { range: [-Infinity, -50], color: 'rgb(0, 0, 153)', label: '<-50' },
  { range: [-50, -25], color: 'rgb(0, 102, 255)', label: '-50 - -25' },
  { range: [-25, 0], color: 'rgb(0, 255, 255)', label: '-25 - 0' },
  { range: [0, 25], color: 'rgb(0, 255, 0)', label: '0 - 25' },
  { range: [25, 50], color: 'rgb(255, 255, 51)', label: '25 - 50' },
  { range: [50, 75], color: 'rgb(255, 204, 51)', label: '50 - 75' },
  { range: [75, 100], color: 'rgb(255, 153, 0)', label: '75 - 100' },
  { range: [100, Infinity], color: 'rgb(255, 0, 0)', label: '>100' },
];

const WINDOW_SIZE = 140; // 20 weeks * 7 days
const DOWNSAMPLE_FACTOR = 5;

/**
 * Fixed extension (y2) axis window so the zero line stays put and ribbon height is bounded.
 * True extension values still used for range colour / hover; only drawing is clipped.
 */
const EXT_AXIS_MIN = -100;
const EXT_AXIS_MAX = 120;

const INITIAL_RANGE_VISIBILITY = EXTENSION_RANGES.reduce((acc, r) => {
  acc[r.label] = true;
  return acc;
}, {});

function findRangeForExtension(extension) {
  for (let i = 0; i < EXTENSION_RANGES.length; i++) {
    const r = EXTENSION_RANGES[i];
    if (extension >= r.range[0] && extension < r.range[1]) return r;
  }
  return null;
}

function clipExtensionForDisplay(extension) {
  if (!Number.isFinite(extension)) return 0;
  if (extension < EXT_AXIS_MIN) return EXT_AXIS_MIN;
  if (extension > EXT_AXIS_MAX) return EXT_AXIS_MAX;
  return extension;
}

/** O(n) 20-week MA + extension (same formula as before, no per-point re-sum). */
function calculateExtension(data) {
  if (!data.length) return [];
  const out = new Array(data.length);
  let windowSum = 0;
  for (let index = 0; index < data.length; index++) {
    const value = parseFloat(data[index].value);
    windowSum += value;
    if (index >= WINDOW_SIZE) {
      windowSum -= parseFloat(data[index - WINDOW_SIZE].value);
    }
    const count = Math.min(index + 1, WINDOW_SIZE);
    const ma = windowSum / count;
    const extension = ma !== 0 ? ((value - ma) / ma) * 100 : 0;
    out[index] = {
      time: data[index].time,
      value,
      MA: ma,
      Extension: extension,
    };
  }
  return out;
}

function downsampleData(data, factor = DOWNSAMPLE_FACTOR) {
  if (data.length <= 200) return data;
  const downsampled = [];
  for (let i = 0; i < data.length - 1; i += factor) {
    const end = Math.min(i + factor, data.length);
    let sumValue = 0;
    let sumExt = 0;
    const len = end - i;
    for (let j = i; j < end; j++) {
      sumValue += data[j].value;
      sumExt += data[j].Extension;
    }
    downsampled.push({
      time: data[i].time,
      value: sumValue / len,
      Extension: sumExt / len,
    });
  }
  if (data.length > 0) {
    const lastPoint = data[data.length - 1];
    downsampled.push({
      time: lastPoint.time,
      value: lastPoint.value,
      Extension: lastPoint.Extension,
    });
  }
  return downsampled;
}

/**
 * Merge consecutive same-range day-segments into fewer polygons.
 * Visual matches original per-day quads [t,t,t+1,t+1]×[0,e,e',0] but ~1 poly per run.
 */
function buildMergedAreaPolygons(chartData) {
  if (chartData.length < 2) return [];

  const polygons = [];
  let runStart = null;
  let runRange = null;

  const flushRun = (endPointIdx) => {
    if (runStart == null || !runRange || endPointIdx < runStart) return;
    // Points from runStart .. endPointIdx inclusive form the top of the ribbon.
    // Clip Y to fixed axis bounds so extreme extensions do not move the zero line.
    const xs = [chartData[runStart].time];
    const ys = [0];
    for (let i = runStart; i <= endPointIdx; i++) {
      xs.push(chartData[i].time);
      ys.push(clipExtensionForDisplay(chartData[i].Extension));
    }
    xs.push(chartData[endPointIdx].time);
    ys.push(0);

    const fillcolor = runRange.color.replace('rgb', 'rgba').replace(')', ',0.8)');
    polygons.push({
      rangeLabel: runRange.label,
      trace: {
        x: xs,
        y: ys,
        type: 'scatter',
        mode: 'lines',
        fill: 'toself',
        fillcolor,
        line: { width: 0 },
        showlegend: false,
        yaxis: 'y2',
        hoverinfo: 'skip',
        // visibility applied later
        name: `_area_${runRange.label}_${runStart}`,
      },
    });
    runStart = null;
    runRange = null;
  };

  for (let i = 0; i < chartData.length - 1; i++) {
    const avgExtension = (chartData[i].Extension + chartData[i + 1].Extension) / 2;
    const range = findRangeForExtension(avgExtension);
    if (!range) {
      if (runStart != null) flushRun(i);
      continue;
    }
    if (runStart == null) {
      runStart = i;
      runRange = range;
    } else if (runRange.label !== range.label) {
      flushRun(i);
      runStart = i;
      runRange = range;
    }
  }
  if (runStart != null) {
    flushRun(chartData.length - 1);
  }

  return polygons;
}

const Bitcoin20WeekExtension = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { btcData } = useChartData();
  const { fetchBtcData } = useChartDataActions();
  const plotRef = useRef(null);
  const containerRef = useRef(null);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  const [showExtensionArea, setShowExtensionArea] = useState(true);
  const [showExtensionPoints, setShowExtensionPoints] = useState(false);
  const [showPriceLine, setShowPriceLine] = useState(true);
  const [rangeVisibility, setRangeVisibility] = useState(INITIAL_RANGE_VISIBILITY);
  // Bumped only on "Reset Chart" so Plotly drops preserved zoom (uirevision).
  // Control toggles intentionally keep the same revision so camera stays put.
  const [viewRevision, setViewRevision] = useState(0);

  // Heavy math + geometry once when price data changes (not on every legend click)
  const chartData = useMemo(() => {
    if (!btcData?.length) return [];
    return downsampleData(calculateExtension(btcData), DOWNSAMPLE_FACTOR);
  }, [btcData]);

  const areaPolygons = useMemo(() => buildMergedAreaPolygons(chartData), [chartData]);

  // Hover helper traces + static geometry (only rebuild when chartData changes)
  const staticTraces = useMemo(() => {
    if (chartData.length === 0) return null;

    const times = chartData.map((d) => d.time);
    const prices = chartData.map((d) => d.value);
    const extensions = chartData.map((d) => d.Extension);

    const priceLineTrace = {
      x: times,
      y: prices,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'grey', width: 1.5 },
      name: 'Price',
      yaxis: 'y',
      hoverinfo: 'skip',
      showlegend: false,
    };

    // Pre-filter per range once (for hover traces)
    const byRange = EXTENSION_RANGES.map((range) => {
      const xs = [];
      const ysPrice = [];
      const ysExt = [];
      const customExt = [];
      const customPrice = [];
      for (let i = 0; i < chartData.length; i++) {
        const d = chartData[i];
        if (d.Extension >= range.range[0] && d.Extension < range.range[1]) {
          xs.push(d.time);
          ysPrice.push(d.value);
          ysExt.push(d.Extension);
          customExt.push([d.Extension]);
          customPrice.push([d.value]);
        }
      }
      return { range, xs, ysPrice, ysExt, customExt, customPrice };
    });

    // Unique internal names so legend clicks don't hit hover traces first.
    // legendgroup ties area/hover together for each range band.
    const rangeTraces = byRange.map(({ range, xs, ysPrice, customExt }) => ({
      x: xs,
      y: ysPrice,
      customdata: customExt,
      type: 'scatter',
      mode: 'none',
      name: `_hover_price_${range.label}`,
      legendgroup: range.label,
      hovertemplate:
        '<b>Price:</b> $%{y:,.0f}<br>' +
        '<b>Extension:</b> %{customdata[0]:.2f}%<br>' +
        '<b>Date:</b> %{x|%B %d, %Y}<extra></extra>',
      hoverlabel: { bgcolor: range.color, font: { color: '#000' } },
      showlegend: false,
      _rangeLabel: range.label,
    }));

    const extensionRangeTraces = byRange.map(({ range, xs, ysExt, customPrice }) => ({
      x: xs,
      y: ysExt,
      customdata: customPrice,
      type: 'scatter',
      mode: 'none',
      name: `_hover_ext_${range.label}`,
      legendgroup: range.label,
      yaxis: 'y2',
      hovertemplate:
        '<b>Price:</b> $%{customdata[0]:,.0f}<br>' +
        '<b>Extension:</b> %{y:.2f}%<br>' +
        '<b>Date:</b> %{x|%B %d, %Y}<extra></extra>',
      hoverlabel: { bgcolor: range.color, font: { color: '#000' } },
      showlegend: false,
      _rangeLabel: range.label,
    }));

    // Area polygons (merged runs) — visibility applied later
    const segmentTraces = areaPolygons.map(({ rangeLabel, trace }) => ({
      ...trace,
      legendgroup: rangeLabel,
      _rangeLabel: rangeLabel,
    }));

    return {
      times,
      prices,
      extensions,
      priceLineTrace,
      rangeTraces,
      extensionRangeTraces,
      segmentTraces,
    };
  }, [chartData, areaPolygons]);

  // Apply visibility only — cheap path when toggling React controls
  // Plotly.react often ignores `visible` alone on fill traces; clear geometry when off.
  const datasets = useMemo(() => {
    if (!staticTraces) return [];

    const {
      times,
      prices,
      extensions,
      priceLineTrace,
      rangeTraces,
      extensionRangeTraces,
      segmentTraces,
    } = staticTraces;

    const rangeOn = (label) => !!rangeVisibility[label];

    // Only include real points (null-padded arrays are unreliable with Plotly updates)
    const pointXs = [];
    const pointYs = [];
    const pointColors = [];
    if (showExtensionPoints) {
      for (let i = 0; i < prices.length; i++) {
        const range = findRangeForExtension(extensions[i]);
        if (range && rangeOn(range.label)) {
          pointXs.push(times[i]);
          pointYs.push(prices[i]);
          pointColors.push(range.color);
        }
      }
    }

    const coloredPointsTrace = {
      x: pointXs,
      y: pointYs,
      type: 'scatter',
      mode: showExtensionPoints && pointXs.length ? 'markers' : 'none',
      marker: {
        color: pointColors,
        size: 6,
      },
      name: 'Extension Points',
      yaxis: 'y',
      hoverinfo: 'skip',
      visible: !!(showExtensionPoints && pointXs.length),
      showlegend: false,
    };

    const rangeTracesVisible = rangeTraces.map((t) => ({
      ...t,
      visible: rangeOn(t._rangeLabel),
    }));

    const extensionRangeTracesVisible = extensionRangeTraces.map((t) => ({
      ...t,
      visible: rangeOn(t._rangeLabel),
    }));

    // Empty x/y when off so fill ribbons actually disappear (visible:false alone is flaky)
    const segmentTracesVisible = segmentTraces.map((t) => {
      const on = !!(showExtensionArea && rangeOn(t._rangeLabel));
      if (!on) {
        return {
          ...t,
          x: [],
          y: [],
          fill: 'none',
          visible: false,
        };
      }
      return {
        ...t,
        visible: true,
      };
    });

    return [
      {
        ...priceLineTrace,
        visible: !!showPriceLine,
      },
      coloredPointsTrace,
      ...rangeTracesVisible,
      ...extensionRangeTracesVisible,
      ...segmentTracesVisible,
    ];
  }, [staticTraces, rangeVisibility, showExtensionArea, showExtensionPoints, showPriceLine]);

  const visibilityRevision = useMemo(
    () =>
      [
        showPriceLine ? 1 : 0,
        showExtensionArea ? 1 : 0,
        showExtensionPoints ? 1 : 0,
        ...EXTENSION_RANGES.map((r) => (rangeVisibility[r.label] ? 1 : 0)),
      ].join(''),
    [showPriceLine, showExtensionArea, showExtensionPoints, rangeVisibility]
  );

  const layout = useMemo(() => ({
    title: isDashboard ? '' : 'Bitcoin Price vs. 20-Week MA Extension',
    autosize: true,
    margin: { l: 60, r: 50, b: isNarrowScreen ? 80 : 50, t: 30, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { autorange: true },
    yaxis: {
      title: { text: 'Price ($)', font: { color: colors.primary[100], size: 14 }, standoff: 5 },
      type: 'log',
      autorange: true,
      automargin: true,
      fixedrange: true,
    },
    yaxis2: {
      title: { text: 'Extension (%)', font: { color: colors.primary[100], size: 14 }, standoff: 5 },
      overlaying: 'y',
      side: 'right',
      // Fixed window: zero line stays put; areas clipped to this range in polygon builder
      range: [EXT_AXIS_MIN, EXT_AXIS_MAX],
      autorange: false,
      automargin: true,
      // Zero line is part of the extension-area readout — hide when area is off
      zeroline: !!showExtensionArea,
      zerolinecolor: colors.primary[100],
      zerolinewidth: 1,
      fixedrange: true,
    },
    // Legend is a custom React control bar (Plotly legend was unreliable for our multi-trace setup)
    showlegend: false,
    hovermode: 'closest',
    hoverdistance: 10,
    // datarevision forces Plotly.react to re-apply geometry when controls change
    datarevision: visibilityRevision,
    // Keep camera/zoom across control toggles; bump viewRevision only on reset
    uirevision: `btc-20-ext-controls-${viewRevision}`,
  }), [colors, isDashboard, isNarrowScreen, visibilityRevision, showExtensionArea, viewRevision]);

  // Optional zoomed layout overrides (same behaviour as before, without remounting)
  const [axisOverride, setAxisOverride] = useState(null);

  const mergedLayout = useMemo(() => {
    if (!axisOverride) return layout;
    return {
      ...layout,
      xaxis: { ...layout.xaxis, ...axisOverride.xaxis },
      yaxis: { ...layout.yaxis, ...axisOverride.yaxis },
      // Never let zoom override the locked extension axis / zero line
      yaxis2: { ...layout.yaxis2 },
    };
  }, [layout, axisOverride]);

  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  const resetChartView = useCallback(() => {
    // Clear React zoom overrides and change uirevision so Plotly drops its
    // preserved UI zoom (double-click already does this natively).
    setAxisOverride(null);
    setViewRevision((v) => v + 1);
  }, []);

  const handleRelayout = useCallback((event) => {
    if (event['xaxis.range[0]'] == null || chartData.length === 0) return;
    const newXMin = new Date(event['xaxis.range[0]']);
    const newXMax = new Date(event['xaxis.range[1]']);
    const visibleData = chartData.filter((d) => {
      const date = new Date(d.time);
      return date >= newXMin && date <= newXMax;
    });
    if (visibleData.length === 0) return;

    const yValues = visibleData.map((d) => d.value);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const factor = 1.05;
    const clampedYMin = Math.max(yMin / factor, 1e-10);
    const clampedYMax = yMax * factor;

    // Only re-fit price (left) axis on zoom; extension (right) axis stays locked
    setAxisOverride({
      xaxis: {
        range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
        autorange: false,
      },
      yaxis: {
        range: [Math.log10(clampedYMin), Math.log10(clampedYMax)],
        autorange: false,
      },
    });
  }, [chartData]);

  const allRangesOn = useMemo(
    () => EXTENSION_RANGES.every((r) => rangeVisibility[r.label]),
    [rangeVisibility]
  );

  const toggleRange = useCallback((label) => {
    setRangeVisibility((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  /** Double-click a range chip: isolate that band (all others off). */
  const isolateRange = useCallback((label) => {
    setRangeVisibility(
      EXTENSION_RANGES.reduce((acc, r) => {
        acc[r.label] = r.label === label;
        return acc;
      }, {})
    );
  }, []);

  const toggleSelectAllRanges = useCallback(() => {
    // If every range is on → turn all off; otherwise turn all on (even if some are already on)
    setRangeVisibility((prev) => {
      const everyOn = EXTENSION_RANGES.every((r) => prev[r.label]);
      return EXTENSION_RANGES.reduce((acc, r) => {
        acc[r.label] = !everyOn;
        return acc;
      }, {});
    });
  }, []);

  const handleDoubleClick = useCallback(() => {
    resetChartView();
  }, [resetChartView]);

  const legendChipSx = (active, accent) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    userSelect: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${active ? (accent || colors.grey[300]) : colors.grey[600]}`,
    backgroundColor: active ? colors.primary[600] : colors.primary[800],
    opacity: active ? 1 : 0.55,
    color: colors.primary[100],
    fontSize: isNarrowScreen ? '10px' : '12px',
    lineHeight: 1.2,
    '&:hover': { opacity: 1, borderColor: colors.greenAccent[500] },
  });

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .chart-container .js-plotly-plot .plotly .cursor-ew-resize {
        cursor: default !important;
      }
      .chart-container .js-plotly-plot .plotly .cursor-ns-resize {
        cursor: default !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const latestExtension =
    chartData.length > 0 ? chartData[chartData.length - 1].Extension.toFixed(2) : 'N/A';

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className="chart-top-div">
          <div />
          <div>
            <button type="button" onClick={resetChartView} className="button-reset">
              Reset Chart
            </button>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="chart-container"
        style={{
          height: isDashboard ? '100%' : isNarrowScreen ? 'calc(100% + 180px)' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <Plot
          ref={plotRef}
          data={datasets}
          layout={mergedLayout}
          config={{ staticPlot: isDashboard, displayModeBar: false, responsive: true, dragmode: 'zoom' }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onDoubleClick={handleDoubleClick}
          revision={visibilityRevision}
        />
      </div>

      {/* Reliable React legend — same controls/colours as before, without Plotly legend bugs */}
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            mt: 1.5,
            mb: 0.5,
            px: 1,
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => setShowPriceLine((v) => !v)}
            sx={legendChipSx(showPriceLine, 'grey')}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'grey' }} />
            Price
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setShowExtensionPoints((v) => !v)}
            sx={legendChipSx(showExtensionPoints, colors.greenAccent[500])}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: showExtensionPoints ? colors.greenAccent[500] : colors.grey[600],
              }}
            />
            Extension Points
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setShowExtensionArea((v) => !v)}
            sx={legendChipSx(showExtensionArea, colors.greenAccent[500])}
          >
            <Box
              sx={{
                width: 12,
                height: 8,
                bgcolor: showExtensionArea ? 'rgba(0, 255, 0, 0.7)' : colors.grey[600],
              }}
            />
            Extension Area
          </Box>
          <Box
            component="button"
            type="button"
            onClick={toggleSelectAllRanges}
            sx={legendChipSx(true, colors.grey[300])}
          >
            {allRangesOn ? 'Deselect All' : 'Select All'}
          </Box>
          {EXTENSION_RANGES.map((range) => {
            const on = !!rangeVisibility[range.label];
            return (
              <Box
                key={range.label}
                component="button"
                type="button"
                title="Click to toggle · Double-click to isolate"
                onClick={() => toggleRange(range.label)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isolateRange(range.label);
                }}
                sx={legendChipSx(on, range.color)}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '2px',
                    bgcolor: on ? range.color : 'rgb(128,128,128)',
                  }}
                />
                {range.label}
              </Box>
            );
          })}
        </Box>
      )}

      <UnderChartRow>
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </UnderChartRow>
      {!isDashboard && (
        <div>
          <UnderChartValue>
            <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
              Latest Extension: <b style={{ color: colors.greenAccent[500] }}>{latestExtension}%</b>
            </span>
          </UnderChartValue>
          <ChartInfoSections
            sections={[
              {
                title: 'What it is',
                content:
                  'The Bitcoin 20-Week Extension measures the percentage difference between the current price and the 20-week moving average (MA), which helps to identify if we are currently in a bubble or a bear market.',
              },
              {
                title: 'What this chart shows',
                content:
                  'The chart is colour-coded by extension range. Use the controls under the chart to toggle Price, Extension Points, Extension Area, Select/Deselect All ranges, or individual bands. Deselected bands hide both their coloured area (when Extension Area is on) and matching points (when Extension Points is on).',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(Bitcoin20WeekExtension);
