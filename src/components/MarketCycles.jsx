import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import { Select, MenuItem, FormControl, InputLabel, Box, Checkbox, useMediaQuery } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import ChartInfoSections from './ChartInfoSections';
import { useChartData, useChartDataActions } from '../hooks/useChartData';
import {
  AVG_DAYS_TOP_TO_BOTTOM,
  CYCLE_TOP_DATE,
  PROJECTED_BOTTOM_DATE,
  BOTTOM_TO_BOTTOM_AVG_DAYS,
  formatCycleDate,
  getBtcReferenceDate,
} from '../utility/cycleBottomDaysLeft';

const MarketCycles = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData } = useChartData();
  const { fetchBtcData } = useChartDataActions();
  const [cycleDataSets, setCycleDataSets] = useState([]);
  const [startPoint, setStartPoint] = useState('bottom');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCycles, setSelectedCycles] = useState([]);
  const [seriesVisibility, setSeriesVisibility] = useState({});
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const plotRef = useRef(null);
  const containerRef = useRef(null);
  const prevSelectedCyclesRef = useRef([]);

  // Constants for cycle timing (used both for slicing historical cycle data in the chart
  // and for the "current position" metrics shown under the chart).
  const CYCLE4_END_DATE = CYCLE_TOP_DATE;      // 2025 bull market peak date (end of Cycle 4)
  const NEW_CYCLE_START_DATE = '2025-10-07';
  const AVG_BEAR_FROM_PEAK = AVG_DAYS_TOP_TO_BOTTOM; // 2-cycle top→bottom avg (363 + 376) → ~11 Oct 2026
  const AVG_PEAK_TO_PEAK = 1425;            // Avg peak-to-peak days (full cycle length). Computed from Cycle 2 (1424 days) + Cycle 3 (1426 days)

  // Local helper to compute days between dates (inclusive-ish, matches existing calcs)
  const calculateDays = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  };

  // Days-left stats for the under-chart section (specific to /market-cycles display).
  // Both values are "as measured from cycle peak":
  // - Bottom: time remaining in the expected bear phase (370 days from the 2025 peak)
  // - Peak:  time remaining until the next cycle peak, using the 1425-day peak-to-peak average
  //          minus days elapsed since the Cycle 4 peak (for the "from cycle peak" view of the current cycle).
  const cycleDaysStats = useMemo(() => {
    if (btcData.length === 0) {
      return {
        daysLeftBottom: { left: 0, avg: AVG_BEAR_FROM_PEAK },
        daysLeftPeak: { left: 0, avg: AVG_PEAK_TO_PEAK },
      };
    }

    const peakDate = CYCLE4_END_DATE;
    const currentDateStr = getBtcReferenceDate(btcData);
    const elapsedSincePeak = calculateDays(peakDate, currentDateStr) || 0;

    // Bear phase remaining (from this cycle peak)
    const leftToBottom = Math.max(0, AVG_BEAR_FROM_PEAK - elapsedSincePeak);

    // Peak-to-peak remaining (subtract current elapsed since last peak for Cycle 4)
    const leftToPeak = Math.max(0, AVG_PEAK_TO_PEAK - elapsedSincePeak);

    return {
      daysLeftBottom: { left: leftToBottom, avg: AVG_BEAR_FROM_PEAK },
      daysLeftPeak: { left: leftToPeak, avg: AVG_PEAK_TO_PEAK },
    };
  }, [btcData]);

  // Define the initial layout with useMemo
  const initialLayout = useMemo(() => ({
    title: isDashboard ? '' : 'Market Cycles RoI',
    margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: {
      title: !isDashboard && !isMobile ? 'Days from Bear Market Bottom' : '',
      autorange: true,
    },
    yaxis: {
      title: 'Logarithmic ROI (Shifted Base-10)',
      type: 'linear',
      autorange: true,
      fixedrange: true,
    },
    showlegend: !isDashboard,
    hovermode: 'x unified',
    hoverlabel: {
      font: {
        size: isNarrowScreen ? 8 : 12,
      },
    },
    legend: !isDashboard ? {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.2,
      yanchor: 'top',
    } : {},
  }), [colors, isDashboard, isMobile, isNarrowScreen]);

  // State to manage the current layout
  const [currentLayout, setCurrentLayout] = useState(initialLayout);

  // Update chart background, font color, and tooltip size when theme or screen size changes
  useEffect(() => {
    setCurrentLayout((prev) => ({
      ...prev,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: {
        ...prev.font,
        color: colors.primary[100],
      },
      hoverlabel: {
        ...prev.hoverlabel,
        font: {
          ...prev.hoverlabel.font,
          size: isNarrowScreen ? 8 : 12,
        },
      },
    }));
  }, [colors.primary[700], colors.primary[100], isNarrowScreen]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (btcData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchBtcData();
      } catch (err) {
        setError('Failed to fetch Bitcoin data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchBtcData, btcData.length]);

  // Process cycle data and compute average
  const cycleDatasets = useMemo(() => {
    if (btcData.length === 0) return [];

    const halvingDates = {
      'Cycle 1': '2012-11-28',
      'Cycle 2': '2016-07-09',
      'Cycle 3': '2020-05-11',
      'Cycle 4': '2024-04-19'
    };

    const cycleStarts = {
      bottom: {
        'Cycle 1': '2011-11-22',
        'Cycle 2': '2015-01-15',
        'Cycle 3': '2018-12-15',
        'Cycle 4': '2022-11-21'
      },
      halving: halvingDates,
      peak: {
        'Cycle 1': '2013-11-30',
        'Cycle 2': '2017-12-17',
        'Cycle 3': '2021-11-10',
        'Cycle 4': '2025-10-07',
      }
    };

    const legendYears = {
      bottom: {
        'Cycle 1': '(2011-2013)',
        'Cycle 2': '(2015-2017)',
        'Cycle 3': '(2018-2021)',
        'Cycle 4': '(2022-2025)'
      },
      halving: {
        'Cycle 1': '(2012-2013)',
        'Cycle 2': '(2016-2017)',
        'Cycle 3': '(2020-2021)',
        'Cycle 4': '(2024-2025)'
      },
      peak: {
        'Cycle 1': '(2013-2017)',
        'Cycle 2': '(2017-2021)',
        'Cycle 3': '(2021-2025)',
        'Cycle 4': '(2025-present)'
      }
    };

    const cycleEnds = {
      peak: {
        'Cycle 1': '2017-12-17',
        'Cycle 2': '2021-11-10',
        'Cycle 3': '2025-10-06',
      }
    };

    const processCycle = (start, end, cycleName) => {
      const endDate = end || btcData[btcData.length - 1].time;
      const filteredData = btcData.filter(d => 
        new Date(d.time) >= new Date(start) && new Date(d.time) <= new Date(endDate)
      );
      if (filteredData.length === 0) return null;

      const basePrice = filteredData[0].value;
      return {
        name: `${cycleName} ${legendYears[startPoint][cycleName]}`,
        shortName: cycleName,
        data: filteredData.map((item, index) => ({
          day: index,
          roi: Math.log10(item.value / basePrice) + 1,
          date: item.time,
          cycle: cycleName
        }))
      };
    };

    const cycles = [
      processCycle(cycleStarts[startPoint]['Cycle 1'], startPoint === 'peak' ? cycleEnds[startPoint]['Cycle 1'] : '2013-11-30', 'Cycle 1'),
      processCycle(cycleStarts[startPoint]['Cycle 2'], startPoint === 'peak' ? cycleEnds[startPoint]['Cycle 2'] : '2017-12-17', 'Cycle 2'),
      processCycle(cycleStarts[startPoint]['Cycle 3'], startPoint === 'peak' ? cycleEnds[startPoint]['Cycle 3'] : '2021-11-08', 'Cycle 3'),
    ];

    // Always add Cycle 4
    // In "From Cycle Peak" mode, Cycle 4 starts after the 2025 peak
    const cycle4Start = cycleStarts[startPoint]['Cycle 4'];
    const cycle4End = startPoint === 'peak' ? null : CYCLE4_END_DATE;

    cycles.push(processCycle(cycle4Start, cycle4End, 'Cycle 4'));

    const validCycles = cycles.filter(cycle => cycle !== null);

    let averageCycle = null;
    if (selectedCycles.length > 0) {
      const selectedCycleData = validCycles.filter(cycle => selectedCycles.includes(cycle.shortName));
      if (selectedCycleData.length > 0) {
        const maxDays = Math.max(...selectedCycleData.map(cycle => cycle.data.length));
        const averageData = [];
        for (let day = 0; day < maxDays; day++) {
          const rois = selectedCycleData
            .filter(cycle => cycle.data[day])
            .map(cycle => cycle.data[day].roi);
          const avgRoi = rois.length > 0 ? rois.reduce((sum, roi) => sum + roi, 0) / rois.length : null;
          if (avgRoi !== null) {
            averageData.push({
              day,
              roi: avgRoi,
              date: selectedCycleData[0].data[day]?.date || btcData[day]?.time,
              cycle: 'Average'
            });
          }
        }
        if (averageData.length > 0) {
          averageCycle = {
            name: `Average (${selectedCycles.join(', ')})`,
            shortName: 'Average',
            data: averageData
          };
        }
      }
    }

    return [...validCycles, ...(averageCycle ? [averageCycle] : [])];
  }, [btcData, startPoint, selectedCycles]);

  // Update cycle datasets and series visibility.
  // When cycles are selected for averaging, force their visibility to false (hidden on chart by default)
  // so the average line is the focus. Users can still click legend entries to re-enable individual cycles.
  // When cycles are deselected from the averages dropdown, restore their visibility on the chart.
  useEffect(() => {
    setCycleDataSets(cycleDatasets);
    const prevSelected = prevSelectedCyclesRef.current;
    setSeriesVisibility((prev) => {
      const newVisibility = {};
      cycleDatasets.forEach((cycle) => {
        if (selectedCycles.includes(cycle.shortName)) {
          newVisibility[cycle.shortName] = false;
        } else if (prevSelected.includes(cycle.shortName)) {
          newVisibility[cycle.shortName] = true;
        } else {
          newVisibility[cycle.shortName] = prev[cycle.shortName] !== undefined ? prev[cycle.shortName] : true;
        }
      });
      return newVisibility;
    });
    prevSelectedCyclesRef.current = selectedCycles;
  }, [cycleDatasets, selectedCycles]);

  // Function to format date as dd/mm/yyyy
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Memoized plot data
  const plotData = useMemo(() => {
    return cycleDataSets.map((cycle) => ({
      key: cycle.shortName,
      x: cycle.data.map((d) => d.day),
      y: cycle.data.map((d) => d.roi),
      type: 'scatter',
      mode: 'lines',
      name: isMobile ? cycle.shortName : cycle.name,
      line: {
        color: cycle.shortName === 'Average' ? colors.greenAccent[500] : undefined,
        width: cycle.shortName === 'Average' ? 3 : 2,
        dash: cycle.shortName === 'Average' ? 'dash' : 'solid',
      },
      text: cycle.data.map(
        (d) => {
          const baseText = `<b>${cycle.shortName} ROI: ${d.roi.toFixed(2)}</b>`;
          if (cycle.shortName === 'Average') {
            return baseText;
          }
          return `${baseText} (${formatDate(d.date)})`;
        }
      ),
      hoverinfo: 'text',
      hovertemplate: `%{text}<extra></extra>`,
      visible: seriesVisibility[cycle.shortName] === false ? 'legendonly' : true,
    }));
  }, [cycleDataSets, seriesVisibility, isMobile, colors.greenAccent]);

  // Handle legend click to toggle series visibility
  const handleLegendClick = useCallback((event) => {
    const cycleName = event.data[event.curveNumber].key;
    setSeriesVisibility((prev) => ({
      ...prev,
      [cycleName]: !prev[cycleName],
    }));
    return false;
  }, []);

  // Handle chart relayout (e.g., zooming)
  const handleRelayout = (event) => {
    if (event['xaxis.autorange'] || event['yaxis.autorange']) {
      setCurrentLayout(prev => ({
        ...prev,
        xaxis: { ...prev.xaxis, autorange: true, range: undefined },
        yaxis: { ...prev.yaxis, autorange: true, range: undefined },
      }));
      return;
    }

    if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
      const newXMin = event['xaxis.range[0]'];
      const newXMax = event['xaxis.range[1]'];
      const visibleData = cycleDataSets
        .filter(cycle => seriesVisibility[cycle.shortName] !== false)
        .flatMap(cycle =>
          cycle.data.filter(d => d.day >= newXMin && d.day <= newXMax)
        );
      if (visibleData.length > 0) {
        const yValues = visibleData.map(d => d.roi);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const padding = (yMax - yMin) * 0.05;
        setCurrentLayout(prev => ({
          ...prev,
          xaxis: {
            ...prev.xaxis,
            range: [newXMin, newXMax],
            autorange: false,
          },
          yaxis: {
            ...prev.yaxis,
            range: [yMin - padding, yMax + padding],
            autorange: false,
            fixedrange: true,
          },
        }));
      }
    }
  };

  // Reset chart to initial view
  const resetChartView = useCallback(() => {
    setCurrentLayout((prev) => ({
      ...prev,
      xaxis: { ...prev.xaxis, autorange: true, range: undefined },
      yaxis: { ...prev.yaxis, autorange: true, range: undefined },
    }));
  }, []);

  // Handle cycle selection for averaging
  const handleCycleSelection = (event) => {
    setSelectedCycles(event.target.value);
  };

  // Available cycles for selection (historical completed cycles only)
  const availableCycles = [
    { value: 'Cycle 1', label: 'Cycle 1 (2011-2013)' },
    { value: 'Cycle 2', label: 'Cycle 2 (2015-2017)' },
    { value: 'Cycle 3', label: 'Cycle 3 (2018-2021)' },
    { value: 'Cycle 4', label: 'Cycle 4 (2022-2025)' },
  ];

  // Handle cursor changes on mousedown/mouseup
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .market-cycles-plot .js-plotly-plot .plotly .cursor-ew-resize {
        cursor: default !important;
      }
      .market-cycles-plot .js-plotly-plot .plotly .cursor-ns-resize {
        cursor: default !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '10px',
              marginTop: '8px',
            }}
          >
            <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
              <InputLabel
                id="start-point-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                }}
              >
                Start Point
              </InputLabel>
              <Select
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
                label="Start Point"
                labelId="start-point-label"
                sx={{
                  color: colors.grey[100],
                  backgroundColor: colors.primary[500],
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: 1.5, pl: 2 },
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                }}
              >
                <MenuItem value="bottom">From Market Bottom</MenuItem>
                <MenuItem value="halving">From the Halving</MenuItem>
                <MenuItem value="peak">From Cycle Peak</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
              <InputLabel
                id="cycles-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                }}
              >
                Cycles to Average
              </InputLabel>
              <Select
                multiple
                value={selectedCycles}
                onChange={handleCycleSelection}
                label="Cycles to Average"
                labelId="cycles-label"
                displayEmpty
                renderValue={(selected) =>
                  selected.length > 0
                    ? selected.map((cycle) => `Cycle ${cycle.split(' ')[1]}`).join(', ')
                    : 'Select Cycles'
                }
                sx={{
                  color: colors.grey[100],
                  backgroundColor: colors.primary[500],
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: 1.5, pl: 2 },
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                }}
              >
                {availableCycles.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    <Checkbox
                      checked={selectedCycles.includes(value)}
                      sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <span>{label}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px my-10px' }}>
            <button onClick={resetChartView} className="button-reset extra-margin">
              Reset Chart
            </button>
          </div>
        </>
      )}
      <div
        ref={containerRef}
        className="market-cycles-plot"
        style={{
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
          cursor: 'default',
        }}
      >
        <Plot
          ref={plotRef}
          data={plotData}
          layout={currentLayout}
          config={{ staticPlot: isDashboard, displayModeBar: false, responsive: true, dragmode: 'zoom' }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onLegendClick={handleLegendClick}
        />
      </div>

      <UnderChartRow>
        {!isDashboard && btcData.length > 0 && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </UnderChartRow>

      {!isDashboard && btcData.length > 0 && (
        <>
          <UnderChartValue>
            <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
              Days left til Bottom: <b style={{ color: colors.greenAccent[500] }}>{cycleDaysStats.daysLeftBottom.left}</b> (avg: {cycleDaysStats.daysLeftBottom.avg} days from peak · projected ~{formatCycleDate(PROJECTED_BOTTOM_DATE)})
            </span>
          </UnderChartValue>
          <UnderChartValue>
            <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
              Days left til Peak: <b style={{ color: colors.greenAccent[500] }}>{cycleDaysStats.daysLeftPeak.left}</b> (avg: {cycleDaysStats.daysLeftPeak.avg} as measured from cycle peak)
            </span>
          </UnderChartValue>
        </>
      )}

      {!isDashboard && (
        <ChartInfoSections
          sections={[
            {
              title: 'How it is built',
              content: 'The return on investment between market cycles is calculated as a shifted logarithmic scale (log10(price / basePrice) + 1), where ROI = 1 indicates no change, above 1 indicates positive returns, and below 1 indicates negative returns. The average ROI line (if selected) represents the mean of the chosen historical cycles on this shifted scale.',
            },
            {
              title: 'How to interpret',
              content: 'Select cycles to average or toggle visibility via the legend.',
            },
            {
              title: 'Days left til bottom',
              content: `Measured from the 6 Oct 2025 bull-market top. Three completed top→bottom phases lasted 407, 363, and 376 days (average 382 → ~23 Oct 2026). Measuring bottom-to-bottom from the last three lows (15 Jan 2015, 15 Dec 2018, 21 Nov 2022) gives a ${BOTTOM_TO_BOTTOM_AVG_DAYS}-day average → ~26 Oct 2026. This chart uses the last two top→bottom durations only (${AVG_DAYS_TOP_TO_BOTTOM} days) → ~11 Oct 2026, a deliberate choice to bias preparation and gradual accumulation ahead of the window, rather than waiting for a later historical average. Not financial advice; past cycles varied and the actual bottom may come earlier or later.`,
            },
          ]}
        />
      )}
    </div>
  );
};

export default restrictToPaidSubscription(MarketCycles);