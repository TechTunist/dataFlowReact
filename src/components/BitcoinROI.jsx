import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Button, useMediaQuery } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';

const BitcoinROI = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const { btcData, fetchBtcData } = useContext(DataContext);
  const [yearDataSets, setYearDataSets] = useState([]);
  const [visibilityMap, setVisibilityMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYears, setSelectedYears] = useState([]);
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
    showlegend: true,
    hovermode: 'x unified',
    hoverlabel: {
      font: {
        size: isNarrowScreen ? 8 : 12,
      },
    },
    legend: {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.1,
      yanchor: 'top'
    }
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

  // Process yearly data and available years
  const { yearlyDatasets, availableYears } = useMemo(() => {
    if (btcData.length === 0) return { yearlyDatasets: [], availableYears: [] };
    const halvingYears = ['2012', '2016', '2020', '2024'];
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
    const yearsAvailable = years.map(year => ({
      value: `${year}`,
      label: `Year ${year}${halvingYears.includes(`${year}`) ? ' (Halving)' : ''}`
    }));
    return { yearlyDatasets: yearlyData, availableYears: yearsAvailable };
  }, [btcData]);

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
        showlegend: true,
        type: 'scatter',
        mode: 'none'
      });
    }
    return datasets;
  }, [yearDataSets]);

  // Handle year selection
  const handleYearSelection = useCallback(e => {
    setSelectedYears(e.target.value);
  }, []);

  // Deselect all years for averaging
  const deselectAllYears = useCallback(() => {
    setSelectedYears([]);
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
            marginTop: '50px',
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
              '& > *': {
                flexShrink: 0,
              },
              '& .MuiFormControl-root': {
                flex: { xs: '2 1 66.67%', sm: '0 0 200px' },
                minWidth: 0,
                width: { xs: '66.67%', sm: '200px' },
              },
              '& .MuiButton-root': {
                flex: { xs: '1 1 33.33%', sm: '0 0 100px' },
                minWidth: 0,
                width: { xs: '33.33%', sm: '100px' },
                padding: { xs: '8px 16px', sm: '6px 12px' },
                fontSize: { xs: '12px', sm: '14px' },
              },
            }}
          >
            <FormControl>
              <InputLabel
                id="years-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': {
                    transform: { xs: 'translate(14px, -9px) scale(0.75)', sm: 'translate(14px, -9px) scale(0.65)' },
                  },
                  fontSize: { xs: '14px', sm: '16px' },
                }}
              >
                Years to Average
              </InputLabel>
              <Select
                multiple
                value={selectedYears}
                onChange={handleYearSelection}
                label="Years to Average"
                labelId="years-label"
                displayEmpty
                renderValue={(selected) =>
                  selected.length > 0
                    ? selected
                        .map((year) => {
                          const item = availableYears.find((y) => y.value === year);
                          return item ? item.label : year;
                        })
                        .join(', ')
                    : 'Select Years'
                }
                sx={{
                  color: colors.grey[100],
                  backgroundColor: colors.primary[500],
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: { xs: 1.5, sm: 1 }, pl: 2 },
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                  fontSize: { xs: '14px', sm: '16px' },
                  textOverflow: 'ellipsis',
                }}
              >
                {availableYears.map(({ value, label }) => (
                  <MenuItem key={value} value={value} sx={{ fontSize: { xs: '14px', sm: '16px' } }}>
                    <Checkbox
                      checked={selectedYears.includes(value)}
                      sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <span>{label}</span>
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
            showlegend: true
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
        <p className='chart-info'>
          The return on investment for each year is calculated as a shifted logarithmic scale (log10(price / basePrice) + 1),
          where ROI = 1 indicates no change, above 1 indicates positive returns, and below 1 indicates negative returns.
          Select years to average, use 'Deselect / Select All' in the legend to toggle all years, or click legend items to toggle visibility.
          Usage Example: Take the average of the post-halving years to compare against the current post-halving year ROI.
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinROI);