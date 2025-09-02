import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Button } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import { useFavorites } from '../contexts/FavoritesContext';

const SP500ROI = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { fredSeriesData, fetchFredSeriesData } = useContext(DataContext);
    const { favoriteCharts, addFavoriteChart, removeFavoriteChart } = useFavorites();
    const [yearDataSets, setYearDataSets] = useState([]);
    const [visibilityMap, setVisibilityMap] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedYears, setSelectedYears] = useState([]);
    const chartId = "sp500-roi";
    const isFavorite = favoriteCharts.includes(chartId);

    const toggleFavorite = () => {
        if (isFavorite) {
            removeFavoriteChart(chartId);
        } else {
            addFavoriteChart(chartId);
        }
    };

    const toggleLegend = () => {
        setLayout((prev) => ({
          ...prev,
          showlegend: !prev.showlegend,
        }));
    };

    const [layout, setLayout] = useState({
        title: isDashboard ? '' : 'Annual S&P 500 ROI',
        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
        plot_bgcolor: colors?.primary?.[700] || '#1F2A44',
        paper_bgcolor: colors?.primary?.[700] || '#1F2A44',
        font: { color: colors?.primary?.[100] || '#FFFFFF' },
        xaxis: {
          title: !isDashboard ? 'Days from Year Start' : '',
          autorange: true,
        },
        yaxis: {
          title: 'Logarithmic ROI (Shifted Base-10)',
          type: 'log',
          autorange: true,
        },
        showlegend: false,
        hovermode: 'x unified',
        legend: {
          orientation: 'h',
          x: 0.5,
          xanchor: 'center',
          y: -0.1,
          yanchor: 'top',
        },
    });

    // Update chart colors on theme change
    useEffect(() => {
        setLayout((prev) => ({
            ...prev,
            plot_bgcolor: colors.primary[700],
            paper_bgcolor: colors.primary[700],
            font: {
                ...prev.font,
                color: colors.primary[100],
            },
        }));
    }, [colors.primary[700], colors.primary[100]]);

    // Fetch S&P 500 data
    useEffect(() => {
        const fetchData = async () => {
            if (fredSeriesData['SP500']?.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchFredSeriesData('SP500');
            } catch (err) {
                setError('Error fetching S&P 500 data. Please try again later.');
                console.error('Error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchFredSeriesData, fredSeriesData]);

    // Process yearly data and available years
    const { yearlyDatasets, availableYears } = useMemo(() => {
        const sp500Data = fredSeriesData['SP500'] || [];
        if (sp500Data.length === 0) return { yearlyDatasets: [], availableYears: [] };
        const significantYears = ['2008', '2020'];
        const years = [...new Set(sp500Data.map(d => new Date(d.time).getFullYear()))]
            .sort((a, b) => a - b);
        const processYearlyData = (year) => {
            const yearStart = `${year}-01-01`;
            const yearEnd = `${year}-12-31`;
            const filteredData = sp500Data.filter(item => {
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
            label: `Year ${year}${significantYears.includes(`${year}`) ? ' (Significant)' : ''}`
        }));
        return { yearlyDatasets: yearlyData, availableYears: yearsAvailable };
    }, [fredSeriesData]);

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

    // Toggle select/deselect all years for legend
    const toggleAllLegend = useCallback(() => {
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            const hasHidden = Object.values(newMap).some(visible => visible === 'legendonly');
            yearDataSets.forEach(dataset => {
                if (dataset.shortName !== 'Average' && dataset.shortName !== 'Select/Deselect All') {
                    newMap[dataset.name] = hasHidden ? true : 'legendonly';
                }
            });
            return newMap;
        });
    }, [yearDataSets]);

    // Legend datasets with select/deselect all option
    const legendDataSets = useMemo(() => {
        const datasets = [...yearDataSets];
        if (datasets.length > 0) {
            datasets.push({
                name: 'Select/Deselect All',
                shortName: 'Select/Deselect All',
                data: [{ day: 0, roi: 0 }],
                visible: true,
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
            yaxis: { ...prev.yaxis, autorange: true },
            showlegend: false
        }));
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            yearDataSets.forEach(dataset => {
                newMap[dataset.name] = true;
            });
            return newMap;
        });
    }, [yearDataSets]);

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

    const handleLegendClick = useCallback((event) => {
        const name = event.data[event.curveNumber].name;
        if (name === 'Select/Deselect All') {
            toggleAllLegend();
            return false;
        }
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            newMap[name] = newMap[name] === 'legendonly' ? true : 'legendonly';
            return newMap;
        });
        return false;
    }, [toggleAllLegend]);

    // Get the latest timestamp from fredSeriesData['SP500'] for LastUpdated
    const latestTimestamp = fredSeriesData['SP500']?.length > 0
      ? fredSeriesData['SP500'][fredSeriesData['SP500'].length - 1].time
      : null;

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
                                    color: colors.primary[100],
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
                            <Button
                                onClick={toggleLegend}
                                sx={{
                                    backgroundColor: 'transparent',
                                    color: colors.primary[100],
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
                                {layout.showlegend ? 'Hide Legend' : 'Show Legend'}
                            </Button>
                        </Box>
                    </Box>
                    <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                        {isLoading && <span style={{ color: colors.primary[100], marginRight: '10px' }}>Loading...</span>}
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
                        mode: item.shortName === 'Select/Deselect All' ? 'none' : 'lines',
                        name: isMobile ? item.shortName : item.name,
                        line: {
                            color: item.shortName === 'Average' ? colors.greenAccent[500] : undefined,
                            width: item.shortName === 'Average' ? 3 : 2,
                            dash: item.shortName === 'Average' ? 'dash' : 'solid'
                        },
                        text: item.shortName !== 'Select/Deselect All'
                            ? item.data.map(d => `<b>${item.shortName} ROI: ${d.roi.toFixed(2)}</b> (${new Date(d.date).toLocaleDateString()})`)
                            : ['Select/Deselect All Years'],
                        hoverinfo: item.shortName === 'Select/Deselect All' ? 'none' : 'text',
                        hovertemplate: item.shortName === 'Select/Deselect All' ? undefined : `%{text}<extra></extra>`,
                        visible: visibilityMap[item.name] !== undefined ? visibilityMap[item.name] : true,
                        hoverlabel: {
                            bgcolor: colors.primary[900],
                            font: { color: colors.primary[100], size: isMobile ? 12 : 14 },
                            bordercolor: colors.grey[300],
                            align: 'left',
                        },
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
                {!isDashboard && fredSeriesData['SP500']?.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <LastUpdated customDate={latestTimestamp} />
                    </div>
                )}
            </div>
            {!isDashboard && (
                <p className='chart-info' style={{ color: colors.primary[100] }}>
                    The return on investment for each year is calculated as a shifted logarithmic scale (log10(price / basePrice) + 1),
                    where ROI = 1 indicates no change, above 1 indicates positive returns, and below 1 indicates negative returns.
                    Select years to average, use 'Select/Deselect All' in the legend to toggle all years,
                    or click legend items to toggle visibility.
                </p>
            )}
        </div>
    );
};

export default restrictToPaidSubscription(SP500ROI);