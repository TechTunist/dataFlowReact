import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import { Select, MenuItem, FormControl, InputLabel, Box, Checkbox } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const MarketCycles = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { btcData, fetchBtcData } = useContext(DataContext);
    const [cycleDataSets, setCycleDataSets] = useState([]);
    const [startPoint, setStartPoint] = useState('bottom');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCycles, setSelectedCycles] = useState([]); // Default to excluding Cycle 1

    // Memoized layout
    const [layout, setLayout] = useState({
        title: isDashboard ? '' : 'Market Cycles RoI',
        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
        plot_bgcolor: colors.primary[700],
        paper_bgcolor: colors.primary[700],
        font: { color: colors.primary[100] },
        xaxis: { 
            title: !isDashboard && !isMobile ? 'Days from Bear Market Bottom' : '',
            autorange: true
        },
        yaxis: { 
            title: 'Logarithmic ROI (Base-10)', 
            type: 'linear',
            autorange: true 
        },
        showlegend: !isDashboard,
        hovermode: 'x unified',
        legend: !isDashboard ? {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.2,
            yanchor: 'top'
        } : {}
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
                'Cycle 3': '2021-11-10'
            }
        };

        const legendYears = {
            bottom: {
                'Cycle 1': '(2011-2013)',
                'Cycle 2': '(2015-2017)',
                'Cycle 3': '(2018-2021)',
                'Cycle 4': '(2022-present)'
            },
            halving: {
                'Cycle 1': '(2012-2013)',
                'Cycle 2': '(2016-2017)',
                'Cycle 3': '(2020-2021)',
                'Cycle 4': '(2024-present)'
            },
            peak: {
                'Cycle 1': '(2013-2017)',
                'Cycle 2': '(2017-2021)',
                'Cycle 3': '(2021-present)'
            }
        };

        const cycleEnds = {
            peak: {
                'Cycle 1': '2017-12-17',
                'Cycle 2': '2021-11-10',
                'Cycle 3': null
            }
        };

        const processCycle = (start, end, cycleName, shortName) => {
            const endDate = end || btcData[btcData.length - 1].time;
            const filteredData = btcData.filter(d => new Date(d.time) >= new Date(start) && new Date(d.time) <= new Date(endDate));
            if (filteredData.length === 0) return null;

            const basePrice = filteredData[0].value;
            return {
                name: `${cycleName} ${legendYears[startPoint][cycleName]}`,
                shortName: cycleName,
                data: filteredData.map((item, index) => ({
                    day: index,
                    roi: Math.log(item.value / basePrice) / Math.LN10,
                    date: item.time,
                    cycle: cycleName
                }))
            };
        };

        const cycles = [
            processCycle(cycleStarts[startPoint]['Cycle 1'], startPoint === 'peak' ? cycleEnds[startPoint]['Cycle 1'] : '2013-11-30', 'Cycle 1'),
            processCycle(cycleStarts[startPoint]['Cycle 2'], startPoint === 'peak' ? cycleEnds[startPoint]['Cycle 2'] : '2017-12-17', 'Cycle 2'),
            processCycle(cycleStarts[startPoint]['Cycle 3'], startPoint === 'peak' ? cycleEnds[startPoint]['Cycle 3'] : '2021-11-08', 'Cycle 3')
        ];

        if (startPoint !== 'peak') {
            cycles.push(processCycle(cycleStarts[startPoint]['Cycle 4'], null, 'Cycle 4'));
        }

        const validCycles = cycles.filter(cycle => cycle !== null);

        // Compute average ROI for selected cycles
        let averageCycle = null;
        if (selectedCycles.length > 0) {
            const selectedCycleData = validCycles.filter(cycle => selectedCycles.includes(cycle.shortName));
            if (selectedCycleData.length > 0) {
                // Find the maximum number of days among selected cycles
                const maxDays = Math.max(...selectedCycleData.map(cycle => cycle.data.length));
                const averageData = [];

                for (let day = 0; day < maxDays; day++) {
                    const rois = selectedCycleData
                        .filter(cycle => cycle.data[day]) // Ensure data exists for the day
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

        // Combine individual cycles and average
        return [...validCycles, ...(averageCycle ? [averageCycle] : [])];
    }, [btcData, startPoint, selectedCycles]);

    // Update layout
    useEffect(() => {
        setLayout(prev => ({
            ...prev,
            plot_bgcolor: colors.primary[700],
            paper_bgcolor: colors.primary[700],
            font: { color: colors.primary[100] },
            xaxis: {
                ...prev.xaxis,
                title: !isDashboard && !isMobile ? 
                    (startPoint === 'bottom' ? 'Days from Bear Market Bottom' : 
                    (startPoint === 'halving' ? 'Days from Halving' : 'Days from Cycle Peak')) : ''
            }
        }));
        setCycleDataSets(cycleDatasets);
    }, [colors, startPoint, isDashboard, isMobile, cycleDatasets]);

    const resetChartView = useCallback(() => {
        setLayout(prev => ({
            ...prev,
            xaxis: { ...prev.xaxis, autorange: true },
            yaxis: { ...prev.yaxis, autorange: true }
        }));
    }, []);

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

    // Handle cycle selection for averaging
    const handleCycleSelection = (event) => {
        setSelectedCycles(event.target.value);
    };

    // Available cycles for selection
    const availableCycles = [
        { value: 'Cycle 1', label: 'Cycle 1 (2011-2013)' },
        { value: 'Cycle 2', label: 'Cycle 2 (2015-2017)' },
        { value: 'Cycle 3', label: 'Cycle 3 (2018-2021)' }
    ];

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
                            marginBottom: '30px',
                            marginTop: '50px',
                        }}
                    >
                        <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
                            <InputLabel
                                id="start-point-label"
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
                                    borderRadius: "8px",
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
                                    top: 0,
                                    '&.MuiInputLabel-shrink': {
                                        transform: 'translate(14px, -9px) scale(0.75)',
                                    },
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
                                        ? selected.map(cycle => `Cycle ${cycle.split(' ')[1]}`).join(', ')
                                        : 'Select Cycles'
                                }
                                sx={{
                                    color: colors.grey[100],
                                    backgroundColor: colors.primary[500],
                                    borderRadius: "8px",
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
                    <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                        <button onClick={resetChartView} className="button-reset extra-margin">
                            Reset Chart
                        </button>
                    </div>
                </>
            )}
            <div
                className="chart-container"
                style={{ 
                    height: isDashboard ? "100%" : 'calc(100% - 40px)',
                    width: '100%',
                    border: '2px solid #a9a9a9' 
                }}
            >
                <Plot
                    data={cycleDataSets.map(cycle => ({
                        x: cycle.data.map(d => d.day),
                        y: cycle.data.map(d => d.roi),
                        type: 'scatter',
                        mode: 'lines',
                        name: isMobile ? cycle.shortName : cycle.name,
                        line: {
                            color: cycle.shortName === 'Average' ? colors.greenAccent[500] : undefined,
                            width: cycle.shortName === 'Average' ? 3 : 2,
                            dash: cycle.shortName === 'Average' ? 'dash' : 'solid'
                        },
                        text: cycle.data.map(d => `<b>${cycle.shortName}   ROI: ${d.roi.toFixed(2)}</b>  (${new Date(d.date).toLocaleDateString()})`),
                        hoverinfo: 'text',
                        hovertemplate: `%{text}<extra></extra>`
                    }))}
                    layout={layout}
                    config={{
                        staticPlot: isDashboard,
                        displayModeBar: false,
                        responsive: true
                    }}
                    useResizeHandler={true}
                    style={{ width: "100%", height: "100%" }}
                    onRelayout={handleRelayout}
                />
            </div>
            <div className='under-chart'>
                {!isDashboard && btcData.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: colors.greenAccent[500] }}>
                            Last Updated: {btcData[btcData.length - 1].time}
                        </span>
                    </div>
                )}
                {!isDashboard && <BitcoinFees />}
            </div>
            {!isDashboard && (
                <p className='chart-info'>
                    The return on investment between market cycles has been normalized by taking the natural log of the price ratio,
                    which is useful when the starting prices of different cycles can differ by orders of magnitude.
                    The average ROI line (if selected) represents the mean logarithmic ROI of the chosen historical cycles.
                </p>
            )}
        </div>
    );
};

export default restrictToPaidSubscription(MarketCycles);