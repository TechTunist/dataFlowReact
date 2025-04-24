import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import { DataContext } from '../DataContext';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { Box } from '@mui/material'; // Import Box for consistent styling

const PiCycleTopChart = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const bitcoinSeriesRef = useRef();
    const ratioSeriesRef = useRef();
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { btcData, fetchBtcData } = useContext(DataContext);

    const [scaleMode, setScaleMode] = useState(1); // 1 for logarithmic, 0 for linear
    const [showMarkers, setShowMarkers] = useState(false);
    const [isInteractive, setIsInteractive] = useState(false);
    const [showRatioSeries, setShowRatioSeries] = useState(false);
    const [tooltipData, setTooltipData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const chartRef = useRef(null);

    // Fetch data only if not present in context
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

    const calculateSMA = useCallback((data, windowSize) => {
        let sma = [];
        for (let i = windowSize - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < windowSize; j++) {
                sum += parseFloat(data[i - j].value);
            }
            sma.push({ time: data[i].time, value: sum / windowSize });
        }
        return sma;
    }, []);

    const calculateRatioSeries = useCallback((data) => {
        const sma111 = calculateSMA(data, 111);
        const sma350 = calculateSMA(data, 350);
        let ratioData = [];
        for (let i = 349; i < data.length; i++) {
            if (i - 110 >= 0) {
                const ratio = sma111[i - 110].value / (sma350[i - 349].value * 2);
                ratioData.push({ time: data[i].time, value: ratio });
            }
        }
        return ratioData;
    }, [calculateSMA]);

    const markers = useMemo(() => [
        { time: '2013-04-09', position: 'aboveBar', color: colors.greenAccent[400], shape: 'arrowDown', text: 'Indicated Top', size: 2 },
        { time: '2013-12-05', position: 'aboveBar', color: colors.greenAccent[400], shape: 'arrowDown', text: 'Indicated Top', size: 2 },
        { time: '2017-12-17', position: 'aboveBar', color: colors.greenAccent[400], shape: 'arrowDown', text: 'Indicated Top', size: 2 },
        { time: '2021-04-12', position: 'aboveBar', color: colors.greenAccent[400], shape: 'arrowDown', text: 'Indicated Top', size: 2 },
    ], [colors.greenAccent]);

    const compactNumberFormatter = useCallback((value) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return value.toFixed(0);
    }, []);

    const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
    const toggleMarkers = useCallback(() => setShowMarkers(prev => !prev), []);
    const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);
    const toggleRatioSeries = useCallback(() => setShowRatioSeries(prev => !prev), []);

    // Initialize chart
    useEffect(() => {
        if (btcData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
            grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
            timeScale: { minBarSpacing: 0.001 },
        });

        const bitcoinSeries = chart.addLineSeries({
            color: '#4ba1c8',
            lineWidth: 2,
            priceLineVisible: false,
            priceFormat: { type: 'custom', formatter: compactNumberFormatter },
        });
        bitcoinSeriesRef.current = bitcoinSeries;

        const sma111Series = chart.addLineSeries({
            color: '#66ff00',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const sma350Series = chart.addLineSeries({
            color: '#fe2bc9',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const ratioSeries = chart.addLineSeries({
            color: '#ff9900',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            visible: showRatioSeries,
            priceScaleId: 'left',
        });
        ratioSeriesRef.current = ratioSeries;

        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            autoScale: true,
            borderVisible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
            priceFormat: { type: 'custom', formatter: compactNumberFormatter },
        });

        chart.priceScale('left').applyOptions({
            autoScale: true,
            borderVisible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
            priceFormat: { type: 'custom', formatter: value => value.toFixed(2) },
            visible: showRatioSeries,
        });

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                setTooltipData({
                    date: param.time,
                    bitcoinValue: param.seriesData.get(bitcoinSeries)?.value,
                    sma111Value: param.seriesData.get(sma111Series)?.value,
                    sma350Value: param.seriesData.get(sma350Series)?.value,
                    ratioValue: param.seriesData.get(ratioSeries)?.value,
                    x: param.point.x,
                    y: param.point.y,
                });
            }
        });

        bitcoinSeries.setData(btcData);
        sma111Series.setData(calculateSMA(btcData, 111));
        sma350Series.setData(calculateSMA(btcData, 350).map(point => ({ time: point.time, value: point.value * 2 })));
        ratioSeries.setData(calculateRatioSeries(btcData));

        const resizeChart = () => {
            chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            });
            chart.timeScale().fitContent();
        };
        window.addEventListener('resize', resizeChart);

        chartRef.current = chart;
        resetChartView();

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [btcData, colors, calculateSMA, calculateRatioSeries, scaleMode]);

    // Update interactivity and markers
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
        }
        if (bitcoinSeriesRef.current) {
            bitcoinSeriesRef.current.setMarkers(showMarkers ? markers : []);
        }
        if (ratioSeriesRef.current) {
            ratioSeriesRef.current.applyOptions({ visible: showRatioSeries });
            chartRef.current.priceScale('left').applyOptions({ visible: showRatioSeries });
        }
    }, [isInteractive, showMarkers, showRatioSeries, markers]);

    // Define legend items with colors matching the series
    const legendItems = useMemo(() => [
        { label: 'Bitcoin Price', color: '#4ba1c8' },
        { label: '111D SMA', color: '#66ff00' },
        { label: '350D SMA x 2', color: '#fe2bc9' },
        { label: '111/350x2 Ratio', color: '#ff9900', visible: showRatioSeries },
    ], [showRatioSeries]);

    // Define indicator description for the ratio, matching the Bitcoin chart's style
    const ratioIndicator = {
        label: '111/350x2 Ratio',
        color: '#ff9900',
        description:
            'The 111/350x2 Ratio represents the ratio of the 111-day Simple Moving Average (SMA) to twice the 350-day SMA. ' +
            'This ratio helps visualize the relative movement between these two moving averages over time. ' +
            'A ratio value near or above 1.0 has historically coincided with market tops, as seen in the PiCycle Top indicator. ' +
            'The decreasing volatility in this ratio suggests that future market tops may not see the same level of divergence between the 111 SMA and 350 SMA.',
    };

    return (
        <div style={{ height: '100%', position: 'relative' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {/* Button to toggle markers */}
                        {!isDashboard && (
                            <button
                                onClick={toggleMarkers}
                                className="button-reset extra-margin-right"
                                style={
                                    showMarkers
                                        ? {
                                              backgroundColor: '#4cceac',
                                              color: 'black',
                                              borderColor: 'violet',
                                          }
                                        : {}
                                }
                            >
                                {showMarkers ? 'Hide Top Markers' : 'Show Top Markers'}
                            </button>
                        )}
                        {/* Toggle button for ratio series */}
                        {!isDashboard && (
                            <button
                                onClick={toggleRatioSeries}
                                className="button-reset"
                                style={
                                    showRatioSeries
                                        ? {
                                              backgroundColor: '#4cceac',
                                              color: 'black',
                                              borderColor: 'violet',
                                          }
                                        : {}
                                }
                            >
                                {showRatioSeries ? 'Hide Ratio' : 'Show Ratio'}
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {!isDashboard && (
                            <button
                                onClick={setInteractivity}
                                className="button-reset"
                                style={{
                                    backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                                    color: isInteractive ? 'black' : '#31d6aa',
                                    borderColor: isInteractive ? 'violet' : '#70d8bd',
                                }}
                            >
                                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
                            </button>
                        )}
                        {!isDashboard && (
                            <button onClick={resetChartView} className="button-reset extra-margin">
                                Reset Chart
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div
                className="chart-container"
                style={{
                    position: 'relative',
                    height: 'calc(100% - 40px)',
                    width: '100%',
                    border: '2px solid #a9a9a9',
                    zIndex: 1,
                }}
                onDoubleClick={() => {
                    if (!isInteractive && !isDashboard) {
                        setInteractivity();
                    } else {
                        setInteractivity();
                    }
                }}
            >
                <div
                    ref={chartContainerRef}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                />
                {/* Legend - Styled to match Bitcoin chart's Active Indicators */}
                {!isDashboard && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            zIndex: 2,
                            backgroundColor: colors.primary[900],
                            padding: '5px 10px',
                            borderRadius: '4px',
                            color: colors.grey[100],
                            fontSize: '12px',
                        }}
                    >
                        <div>Active Indicators</div>
                        {legendItems.map((item) => (
                            item.visible !== false && (
                                <div
                                    key={item.label}
                                    style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}
                                >
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '10px',
                                            height: '10px',
                                            backgroundColor: item.color,
                                            marginRight: '5px',
                                        }}
                                    />
                                    {item.label}
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
            <div className='under-chart'>
                {!isDashboard && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                        flexWrap: 'wrap',
                        gap: '10px',
                        alignItems: 'center',
                    }}>
                        <LastUpdated storageKey="btcData" />
                        <BitcoinFees />
                    </Box>
                )}
            </div>
            {/* Conditional Rendering for the Tooltip */}
            {!isDashboard && tooltipData && (
                <div
                    className="tooltip"
                    style={{
                        position: 'fixed', // Use fixed positioning to match Bitcoin chart
                        left: (() => {
                            const sidebarWidth = isMobile ? -80 : -320;
                            const cursorX = tooltipData.x - sidebarWidth;
                            const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
                            const tooltipWidth = 200;
                            const offset = 10000 / (chartWidth + 300);

                            const rightPosition = cursorX + offset;
                            const leftPosition = cursorX - tooltipWidth - offset;

                            if (rightPosition + tooltipWidth <= chartWidth) {
                                return `${rightPosition}px`;
                            } else if (leftPosition >= 0) {
                                return `${leftPosition}px`;
                            } else {
                                return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
                            }
                        })(),
                        top: `${tooltipData.y + 100}px`,
                        zIndex: 1000, // Match Bitcoin chart's zIndex
                    }}
                >
                    <div style={{ fontSize: '15px' }}>PiCycle Top</div>
                    {tooltipData.bitcoinValue && (
                        <div style={{ fontSize: '20px' }}>
                            Bitcoin Price: ${tooltipData.bitcoinValue.toFixed(2)}
                        </div>
                    )}
                    {tooltipData.sma111Value && (
                        <div style={{ color: '#66ff00' }}>
                            111SMA: ${tooltipData.sma111Value.toFixed(2)}
                        </div>
                    )}
                    {tooltipData.sma350Value && (
                        <div style={{ color: '#fe2bc9' }}>
                            350SMA x 2: ${tooltipData.sma350Value.toFixed(2)}
                        </div>
                    )}
                    {tooltipData.ratioValue && showRatioSeries && (
                        <div style={{ color: '#ff9900' }}>
                            111/350x2 Ratio: {tooltipData.ratioValue.toFixed(4)}
                        </div>
                    )}
                    {tooltipData.date && (
                        <div style={{ fontSize: '13px' }}>{tooltipData.date}</div>
                    )}
                </div>
            )}
            {/* Indicator Description - Styled to match Bitcoin chart */}
            {!isDashboard && showRatioSeries && (
                <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
                    <p style={{ margin: '5px 0' }}>
                        <strong style={{ color: ratioIndicator.color }}>
                            {ratioIndicator.label}:
                        </strong>{' '}
                        {ratioIndicator.description}
                    </p>
                </Box>
            )}
            {/* PiCycle Top General Description */}
            <div>
                {!isDashboard && (
                    <p className='chart-info'>
                        The PiCycle Top indicator was created by Phillip Swift in 2019, with the intention of calling the top of the Bitcoin bull market within 3 days.
                        The indicator is calculated by dividing the 111-day moving average of the Bitcoin price by the 350-day moving average of the Bitcoin price.
                        When the 111 day SMA crosses above the 350 day SMA, it is considered a bearish signal, and has historically been able to predict the
                        2 market peaks in 2013, the bull market peak in 2017 and the first market peak in 2021.
                        <br /><br /><br />
                    </p>
                )}
            </div>
        </div>
    );
};

export default PiCycleTopChart;