import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import {
  useTheme,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Checkbox,
  ListItemText,
  Button,
  useMediaQuery,
} from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import ChartInfoSections from './ChartInfoSections';
import { useChartData, useChartDataActions } from '../hooks/useChartData';

/**
 * Known BTC halving calendar years. Cycle phases for a year Y use offset from the
 * most recent halving year ≤ Y:
 *   0 = halving year, 1 = post-halving, 2 = midterm, 3 = pre-halving
 */
const HALVING_YEARS = [2012, 2016, 2020, 2024, 2028, 2032];

const PHASE_META = {
  'pre-halving': { id: 'pre-halving', label: 'Pre-halving' },
  halving: { id: 'halving', label: 'Halving year' },
  'post-halving': { id: 'post-halving', label: 'Post-halving' },
  midterm: { id: 'midterm', label: 'Midterm' },
};

function cyclePhaseForYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return null;
  let prev = null;
  for (const h of HALVING_YEARS) {
    if (h <= y) prev = h;
    else break;
  }
  if (prev == null) {
    if (y === 2011) return 'pre-halving';
    if (y === 2010) return 'midterm';
    return 'pre-halving';
  }
  const offset = y - prev;
  if (offset === 0) return 'halving';
  if (offset === 1) return 'post-halving';
  if (offset === 2) return 'midterm';
  if (offset === 3) return 'pre-halving';
  return 'pre-halving';
}

function phaseLabel(phase) {
  return PHASE_META[phase]?.label || phase;
}

function yearDisplayLabel(year) {
  const phase = cyclePhaseForYear(year);
  return `${year} — ${phaseLabel(phase)}`;
}

function yearsMatchingOneFilter(allYears, filterKey) {
  if (!filterKey || filterKey === 'all') return allYears;
  if (filterKey.startsWith('phase:')) {
    const phase = filterKey.slice('phase:'.length);
    return allYears.filter((y) => cyclePhaseForYear(y) === phase);
  }
  if (filterKey.startsWith('year:')) {
    const y = filterKey.slice('year:'.length);
    return allYears.filter((yr) => String(yr) === String(y));
  }
  return [];
}

function yearsMatchingFilters(allYears, filterKeys) {
  // Empty selection means no average (unlike monthly-returns, which defaults to 'all')
  if (!filterKeys?.length) return [];
  if (filterKeys.includes('all')) return allYears;
  const wanted = new Set();
  filterKeys.forEach((key) => {
    yearsMatchingOneFilter(allYears, key).forEach((y) => wanted.add(String(y)));
  });
  return allYears.filter((y) => wanted.has(String(y)));
}

function optionLabel(value, filterOptions) {
  if (value === 'all') return 'All years';
  const phase = filterOptions?.phases?.find((p) => p.value === value);
  if (phase) return phase.label;
  const year = filterOptions?.individual?.find((p) => p.value === value);
  if (year) return year.label;
  if (value.startsWith('year:')) return yearDisplayLabel(value.slice(5));
  if (value.startsWith('phase:')) return phaseLabel(value.slice(6));
  return value;
}

const selectControlSx = (colors) => ({
  color: colors.grey[100],
  backgroundColor: colors.primary[500],
  borderRadius: '8px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
  '& .MuiSelect-select': { py: 1.5, pl: 2 },
});

const labelSx = (colors) => ({
  color: colors.grey[100],
  '&.Mui-focused': { color: colors.greenAccent[500] },
  top: 0,
  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
});

const BitcoinROI = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const { btcData } = useChartData();
  const { fetchBtcData } = useChartDataActions();
  const [yearDataSets, setYearDataSets] = useState([]);
  const [visibilityMap, setVisibilityMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  /** Multi-select filter keys for averaging: 'all' | 'phase:…' | 'year:YYYY' */
  const [yearFilters, setYearFilters] = useState([]);
  const [isSelectAll, setIsSelectAll] = useState(false); // Track toggle state
  const plotRef = useRef(null);
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({
    title: isDashboard ? '' : 'Annual Bitcoin ROI',
    margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: {
      title: !isDashboard && !isMobile ? 'Days from Year Start' : '',
      autorange: true
    },
    yaxis: {
      title: 'Logarithmic ROI (Shifted Base-10)',
      type: 'linear',
      autorange: true,
      fixedrange: true
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
      y: -0.1,
      yanchor: 'top'
    } : {},
  });

  // Update chart background, font color, and tooltip size when theme or screen size changes
  useEffect(() => {
    setLayout((prev) => ({
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
        setError('Error fetching data. Please try again later.');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchBtcData, btcData.length]);

  // Process yearly data and filter options
  const { yearlyDatasets, allYearStrings, filterOptions } = useMemo(() => {
    if (btcData.length === 0) {
      return { yearlyDatasets: [], allYearStrings: [], filterOptions: { phases: [], individual: [] } };
    }
    const years = [...new Set(btcData.map(d => new Date(d.time).getFullYear()))]
      .sort((a, b) => a - b);
    const processYearlyData = (year) => {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      const filteredData = btcData.filter(item => {
        const date = new Date(item.time);
        return date >= new Date(yearStart) && date <= new Date(yearEnd);
      });
      if (filteredData.length === 0) return null;
      const basePrice = filteredData[0].value;
      return {
        name: `${year}`,
        shortName: `${year}`,
        data: filteredData.map((item, index) => ({
          day: index,
          roi: Math.log10(item.value / basePrice) + 1,
          date: item.time,
          year
        }))
      };
    };
    const yearlyData = years.map(year => processYearlyData(year)).filter(year => year !== null);
    const yearStrings = years.map((y) => `${y}`);
    const individual = [...years]
      .sort((a, b) => b - a)
      .map((y) => ({
        value: `year:${y}`,
        label: yearDisplayLabel(y),
      }));
    return {
      yearlyDatasets: yearlyData,
      allYearStrings: yearStrings,
      filterOptions: {
        phases: [
          { value: 'phase:pre-halving', label: 'All pre-halving years' },
          { value: 'phase:halving', label: 'All halving years' },
          { value: 'phase:post-halving', label: 'All post-halving years' },
          { value: 'phase:midterm', label: 'All midterm years' },
        ],
        individual,
      },
    };
  }, [btcData]);

  // Resolve multi-select filters to concrete years for averaging
  const selectedYears = useMemo(
    () => yearsMatchingFilters(allYearStrings, yearFilters),
    [allYearStrings, yearFilters]
  );

  // Compute average dataset
  const averageDataset = useMemo(() => {
    if (selectedYears.length === 0) return null;
    const selectedDatasets = yearlyDatasets.filter(d => selectedYears.includes(d.name));
    if (selectedDatasets.length === 0) return null;
    const minLength = Math.min(...selectedDatasets.map(d => d.data.length));
    const averageData = [];
    for (let day = 0; day < minLength; day++) {
      const rois = selectedDatasets
        .map(d => d.data[day]?.roi)
        .filter(roi => roi !== undefined);
      if (rois.length > 0) {
        const avgRoi = rois.reduce((sum, roi) => sum + roi, 0) / rois.length;
        averageData.push({
          day: day,
          roi: avgRoi,
          date: selectedDatasets[0].data[day].date
        });
      }
    }
    return {
      name: 'Average of Selected Years',
      shortName: 'Average',
      data: averageData
    };
  }, [selectedYears, yearlyDatasets]);

  // Toggle deselect/select all for legend
  const toggleSelectAllLegend = useCallback(() => {
    setVisibilityMap(prev => {
      const newMap = { ...prev };
      const newVisibility = isSelectAll ? true : 'legendonly';
      yearDataSets.forEach(dataset => {
        if (dataset.shortName !== 'Average' && dataset.shortName !== 'Deselect / Select All') {
          newMap[dataset.name] = newVisibility;
        }
      });
      return newMap;
    });
    setIsSelectAll(prev => !prev);
  }, [yearDataSets, isSelectAll]);

  // Legend datasets with deselect/select all option
  const legendDataSets = useMemo(() => {
    const datasets = [...yearDataSets];
    if (datasets.length > 0) {
      datasets.push({
        name: 'Deselect / Select All',
        shortName: 'Deselect / Select All',
        data: [{ day: 0, roi: 0 }],
        visible: true,
        showlegend: !isDashboard,
        type: 'scatter',
        mode: 'none'
      });
    }
    return datasets;
  }, [yearDataSets, isDashboard]);

  // Handle year filter multi-select (same pattern as monthly-returns)
  const handleYearFiltersChange = useCallback((event) => {
    const raw = event.target.value;
    let next = typeof raw === 'string' ? raw.split(',') : [...raw];
    const prev = yearFilters;

    if (next.includes('all') && !prev.includes('all')) {
      setYearFilters(['all']);
      return;
    }
    next = next.filter((v) => v !== 'all');
    setYearFilters(next);
  }, [yearFilters]);

  // Deselect all years for averaging
  const deselectAllYears = useCallback(() => {
    setYearFilters([]);
  }, []);

  useEffect(() => {
    setVisibilityMap(prev => {
      const newMap = { ...prev };
      const datasets = [...yearlyDatasets];
      if (averageDataset) {
        datasets.push(averageDataset);
      }
      datasets.forEach(dataset => {
        if (newMap[dataset.name] === undefined) {
          newMap[dataset.name] = true;
        }
      });
      return newMap;
    });
  }, [yearlyDatasets, averageDataset]);

  useEffect(() => {
    const datasets = [...yearlyDatasets];
    if (averageDataset) {
      datasets.push(averageDataset);
    }
    const updatedDatasets = datasets.map(dataset => ({
      ...dataset,
      visible: visibilityMap[dataset.name] !== undefined ? visibilityMap[dataset.name] : true
    }));
    setYearDataSets(updatedDatasets);
  }, [yearlyDatasets, averageDataset, visibilityMap]);

  const resetChartView = useCallback(() => {
    setLayout(prev => ({
      ...prev,
      xaxis: { ...prev.xaxis, autorange: true },
      yaxis: { ...prev.yaxis, autorange: true }
    }));
  }, []);

  // Handle chart relayout (e.g., zooming)
  const handleRelayout = (event) => {
    if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
      const newXMin = event['xaxis.range[0]'];
      const newXMax = event['xaxis.range[1]'];
      // Filter data for visible years within the zoomed x-axis range
      const visibleData = yearDataSets
        .filter(year => visibilityMap[year.name] !== 'legendonly')
        .flatMap(year =>
          year.data.filter(d => d.day >= newXMin && d.day <= newXMax)
        );
      if (visibleData.length > 0) {
        const yValues = visibleData.map(d => d.roi);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const padding = (yMax - yMin) * 0.05; // 5% padding for better visualization
        setLayout(prev => ({
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

  // Handle legend click to toggle visibility
  const handleLegendClick = useCallback((event) => {
    const name = event.data[event.curveNumber].name;
    if (name === 'Deselect / Select All') {
      toggleSelectAllLegend();
      return false;
    }
    setVisibilityMap(prev => {
      const newMap = { ...prev };
      newMap[name] = newMap[name] === 'legendonly' ? true : 'legendonly';
      return newMap;
    });
    return false;
  }, [toggleSelectAllLegend]);

  // Handle double-click to reset chart
  const handleDoubleClick = useCallback(() => {
    resetChartView();
  }, [resetChartView]);

  // Handle cursor changes
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

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', sm: 'space-between' },
            gap: { xs: '10px', sm: '10px' },
            marginBottom: '10px',
            marginTop: '8px',
            width: '100%',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: { xs: '10px', sm: '8px' },
              width: { xs: '100%', sm: 'auto' },
              flex: { xs: '1 1 100%', sm: '1 1 auto' },
              minWidth: 0,
              '& .MuiButton-root': {
                flex: { xs: '0 0 auto', sm: '0 0 100px' },
                minWidth: 0,
                width: { xs: 'auto', sm: '100px' },
                padding: { xs: '8px 16px', sm: '6px 12px' },
                fontSize: { xs: '12px', sm: '14px' },
              },
            }}
          >
            <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '360px' }, flex: { xs: '1 1 auto', sm: '0 0 360px' } }}>
              <InputLabel
                id="years-label"
                shrink
                sx={labelSx(colors)}
              >
                Years to Average
              </InputLabel>
              <Select
                multiple
                value={yearFilters}
                onChange={handleYearFiltersChange}
                label="Years to Average"
                labelId="years-label"
                displayEmpty
                renderValue={(selected) => {
                  if (!selected?.length) return 'Select years';
                  if (selected.includes('all')) return 'All years';
                  if (selected.length === 1) return optionLabel(selected[0], filterOptions);
                  return `${selected.length} selected`;
                }}
                sx={{
                  ...selectControlSx(colors),
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                }}
                MenuProps={{
                  autoFocus: false,
                  PaperProps: {
                    sx: {
                      maxHeight: 420,
                      backgroundColor: colors.primary[500],
                      color: colors.grey[100],
                    },
                  },
                }}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={yearFilters.includes('all')}
                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <ListItemText primary="All years" />
                </MenuItem>
                <ListSubheader
                  sx={{
                    backgroundColor: colors.primary[600],
                    color: colors.greenAccent[400],
                    lineHeight: '36px',
                  }}
                >
                  Cycle phases (add all matching years)
                </ListSubheader>
                {filterOptions.phases.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Checkbox
                      checked={yearFilters.includes(opt.value)}
                      sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
                <ListSubheader
                  sx={{
                    backgroundColor: colors.primary[600],
                    color: colors.greenAccent[400],
                    lineHeight: '36px',
                  }}
                >
                  Individual years (multi-select)
                </ListSubheader>
                {filterOptions.individual.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Checkbox
                      checked={yearFilters.includes(opt.value)}
                      sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              onClick={deselectAllYears}
              sx={{
                backgroundColor: 'transparent',
                color: '#31d6aa',
                border: `1px solid ${colors.greenAccent[400]}`,
                borderRadius: '4px',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: colors.greenAccent[400],
                  color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                },
              }}
            >
              {isMobile ? 'Deselect' : 'Deselect All'}
            </Button>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginLeft: { xs: 'auto', sm: 'auto' },
              flex: { xs: '1 1 33.33%', sm: '0 0 auto' },
            }}
          >
            {isLoading && <span style={{ color: colors.grey[100], fontSize: { xs: '14px', sm: '16px' } }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500], fontSize: { xs: '14px', sm: '16px' } }}>{error}</span>}
            <Button
              onClick={resetChartView}
              sx={{
                backgroundColor: 'transparent',
                color: '#31d6aa',
                border: `1px solid ${colors.greenAccent[400]}`,
                borderRadius: '4px',
                padding: { xs: '8px 16px', sm: '6px 12px' },
                fontSize: { xs: '14px', sm: '12px' },
                textTransform: 'none',
                width: { xs: '100%', sm: '100px' },
                display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': {
                  backgroundColor: colors.greenAccent[400],
                  color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                },
              }}
            >
              Reset Chart
            </Button>
            <Button
              onClick={resetChartView}
              sx={{
                backgroundColor: 'transparent',
                color: '#31d6aa',
                border: `1px solid ${colors.greenAccent[400]}`,
                borderRadius: '4px',
                padding: { xs: '8px 16px', sm: '6px 12px' },
                fontSize: { xs: '12px', sm: '14px' },
                textTransform: 'none',
                width: { xs: '100%', sm: '100px' },
                display: { xs: 'inline-flex', sm: 'none' },
                '&:hover': {
                  backgroundColor: colors.greenAccent[400],
                  color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                },
              }}
            >
              {isMobile ? 'Reset' : 'Reset Chart'}
            </Button>
          </Box>
        </Box>
      )}
      <div
        ref={containerRef}
        className="chart-container"
        style={{
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
          cursor: 'default'
        }}
      >
        <Plot
          ref={plotRef}
          data={legendDataSets.map(item => ({
            x: item.data.map(d => d.day),
            y: item.data.map(d => d.roi),
            type: 'scatter',
            mode: item.shortName === 'Deselect / Select All' ? 'none' : 'lines',
            name: item.name,
            line: {
              color: item.shortName === 'Average' ? colors.greenAccent[500] : undefined,
              width: item.shortName === 'Average' ? 3 : 2,
              dash: item.shortName === 'Average' ? 'dash' : 'solid'
            },
            text: item.shortName !== 'Deselect / Select All'
              ? item.data.map(d => `<b>${item.shortName} ROI: ${d.roi.toFixed(2)}</b> (${new Date(d.date).toLocaleDateString()})`)
              : ['Toggle All Series Visibility'],
            hoverinfo: item.shortName === 'Deselect / Select All' ? 'none' : 'text',
            hovertemplate: item.shortName === 'Deselect / Select All' ? undefined : `%{text}<extra></extra>`,
            visible: visibilityMap[item.name] !== undefined ? visibilityMap[item.name] : true,
            showlegend: !isDashboard
          }))}
          layout={layout}
          config={{
            staticPlot: isDashboard,
            displayModeBar: false,
            responsive: true,
            dragmode: 'zoom'
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onLegendClick={handleLegendClick}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      <div className='under-chart'>
        {!isDashboard && btcData.length > 0 && (
          <LastUpdated storageKey="btcData" />
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <ChartInfoSections
          sections={[
            {
              title: 'How it is built',
              content: 'The return on investment for each year is calculated as a shifted logarithmic scale (log10(price / basePrice) + 1), where ROI = 1 indicates no change, above 1 indicates positive returns, and below 1 indicates negative returns.',
            },
            {
              title: 'How to interpret',
              content: 'Select years or cycle phases to average (e.g. all post-halving years), use \'Deselect / Select All\' in the legend to toggle all years, or click legend items to toggle visibility. Usage example: take the average of the post-halving years to compare against the current post-halving year ROI.',
            },
          ]}
        />
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinROI);
