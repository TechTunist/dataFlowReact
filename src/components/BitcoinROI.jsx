// src/components/BitcoinROI.js
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Button } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import { useFavorites } from '../contexts/FavoritesContext';

const BitcoinROI = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { btcData, fetchBtcData } = useContext(DataContext);
    const { favoriteCharts, addFavoriteChart, removeFavoriteChart } = useFavorites();
    const [yearDataSets, setYearDataSets] = useState([]);
    const [visibilityMap, setVisibilityMap] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedYears, setSelectedYears] = useState([]);

    const chartId = "bitcoin-roi"; // Unique ID for this chart
    const isFavorite = favoriteCharts.includes(chartId);

    const toggleFavorite = () => {
        if (isFavorite) {
        removeFavoriteChart(chartId);
        } else {
        addFavoriteChart(chartId);
        }
    };

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
            title: 'Logarithmic ROI (Base-10)', 
            type: 'linear',
            autorange: true 
        },
        showlegend: true,
        hovermode: 'x unified',
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.1,
            yanchor: 'top'
        }
    });

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

        // Define halving years
        const halvingYears = ['2012', '2016', '2020', '2024'];

        // Get unique years from data
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
                    roi: Math.log(item.value / basePrice) / Math.LN10,
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

    // Deselect all years for legend
    const deselectAllLegend = useCallback(() => {
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            yearDataSets.forEach(dataset => {
                if (dataset.shortName !== 'Average') {
                    newMap[dataset.name] = 'legendonly';
                }
            });
            return newMap;
        });
    }, [yearDataSets]);

    // Legend datasets with deselect all option
    const legendDataSets = useMemo(() => {
        const datasets = [...yearDataSets];
        if (datasets.length > 0) {
            datasets.push({
                name: 'Deselect All',
                shortName: 'Deselect All',
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
        // setSelectedYears(availableYears.map(y => y.value));
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            yearDataSets.forEach(dataset => {
                newMap[dataset.name] = true;
            });
            return newMap;
        });
    }, [availableYears, yearDataSets]);

    const handleRelayout = useCallback((event) => {
        if (event['xaxis.range[0]'] || event['yaxis.range[0]']) {
            setLayout(prev => ({
                ...prev,
                xaxis: {
                    ...prev.xaxis,
                    range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
                    autorange: false
                },
                yaxis: {
                    ...prev.yaxis,
                    range: [event['yaxis.range[0]'], event['yaxis.range[1]']],
                    autorange: false
                }
            }));
        }
    }, []);

    // Handle legend click to toggle visibility
    const handleLegendClick = useCallback((event) => {
        const name = event.data[event.curveNumber].name;
        if (name === 'Deselect All') {
            deselectAllLegend();
            return false;
        }
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            newMap[name] = newMap[name] === 'legendonly' ? true : 'legendonly';
            return newMap;
        });
        return false;
    }, [deselectAllLegend]);

    return (
        <div style={{ height: '100%' }}>
          {!isDashboard && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  marginBottom: '10px',
                  marginTop: '50px',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    gap: '20px',
                  }}
                >
                  <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
                    <InputLabel
                      id="years-label"
                      shrink
                      sx={{
                        color: colors.grey[100],
                        '&.Mui-focused': { color: colors.greenAccent[500] },
                        top: 0,
                        '&.MuiInputLabel-shrink': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
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
                          ? selected.map(year => {
                              const item = availableYears.find(y => y.value === year);
                              return item ? item.label : year;
                            }).join(', ')
                          : 'Select Years'
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
                      {availableYears.map(({ value, label }) => (
                        <MenuItem key={value} value={value}>
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
                      padding: '8px 16px',
                      fontSize: '14px',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: colors.greenAccent[400],
                        color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                      },
                    }}
                  >
                    Deselect All
                  </Button>
                </Box>
                <Button
                  onClick={toggleFavorite}
                  sx={{
                    color: isFavorite ? colors.yellowAccent[500] : colors.grey[100],
                    minWidth: 'auto',
                    padding: '4px',
                  }}
                >
                  {isFavorite ? '★' : '☆'}
                </Button>
              </Box>
              <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                {isLoading && <span style={{ color: colors.grey[100], marginRight: '10px' }}>Loading...</span>}
                {error && <span style={{ color: colors.redAccent[500], marginRight: '10px' }}>{error}</span>}
                <button onClick={resetChartView} className="button-reset extra-margin">
                  Reset Chart
                </button>
              </div>
            </>
          )}
          <div
            className="chart-container"
            style={{
              height: isDashboard ? '100%' : 'calc(100% - 40px)',
              width: '100%',
              border: '2px solid #a9a9a9'
            }}
          >
            <Plot
              data={legendDataSets.map(item => ({
                x: item.data.map(d => d.day),
                y: item.data.map(d => d.roi),
                type: 'scatter',
                mode: item.shortName === 'Deselect All' ? 'none' : 'lines',
                name: isMobile ? item.shortName : item.name,
                line: {
                  color: item.shortName === 'Average' ? colors.greenAccent[500] : undefined,
                  width: item.shortName === 'Average' ? 3 : 2,
                  dash: item.shortName === 'Average' ? 'dash' : 'solid'
                },
                text: item.shortName !== 'Deselect All'
                  ? item.data.map(d => `<b>${item.shortName}   ROI: ${d.roi.toFixed(2)}</b>  (${new Date(d.date).toLocaleDateString()})`)
                  : ['Deselect All Years'],
                hoverinfo: item.shortName === 'Deselect All' ? 'none' : 'text',
                hovertemplate: item.shortName === 'Deselect All' ? undefined : `%{text}<extra></extra>`,
                visible: visibilityMap[item.name] !== undefined ? visibilityMap[item.name] : true,
                showlegend: true
              }))}
              layout={layout}
              config={{
                staticPlot: isDashboard,
                displayModeBar: false,
                responsive: true
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              onRelayout={handleRelayout}
              onLegendClick={handleLegendClick}
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
              The return on investment for each year has been normalized by taking the natural log of the price ratio,
              showing growth from the start of each year. Select years to average, use 'Deselect All' in the legend to hide all years,
              or click legend items to toggle visibility.
            </p>
          )}
        </div>
      );
    };
    
    export default restrictToPaidSubscription(BitcoinROI);