import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinTxCountChart = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { txCountData, fetchTxCountData, txCountLastUpdated } = useContext(DataContext);

    const [scaleMode, setScaleMode] = useState(0); // Start with logarithmic (1) instead of linear (0)
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [useWeekly, setUseWeekly] = useState(false); // Toggle for weekly aggregation
    const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (txCountData.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchTxCountData();
            } catch (err) {
                setError('Failed to fetch transaction count data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchTxCountData, txCountData.length]);

    // Aggregate data to weekly
    const weeklyData = useMemo(() => {
        if (!useWeekly || txCountData.length === 0) return txCountData;
        const weekly = {};
        txCountData.forEach(({ time, value }) => {
          const date = new Date(time);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay())).toISOString().split('T')[0];
          weekly[weekStart] = (weekly[weekStart] || 0) + value;
        });
        return Object.entries(weekly)
          .map(([time, value]) => ({ time, value }))
          .sort((a, b) => new Date(a.time) - new Date(b.time)); // Sort weekly data
      }, [txCountData, useWeekly]);

    const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
    const toggleScaleMode = useCallback(() => setScaleMode(prev => (prev === 1 ? 0 : 1)), []);
    const toggleWeekly = useCallback(() => setUseWeekly(prev => !prev), []);
    const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

    // Initialize chart
    useEffect(() => {
        if (weeklyData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
            grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
            timeScale: { minBarSpacing: 0.001 },
        });

        // Option 1: Line Chart
        // const lineSeries = chart.addLineSeries({
        //     priceScaleId: 'right',
        //     lineWidth: 2,
        //     priceFormat: { type: 'price', precision: 0, minMove: 1 },
        //     color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
        // });
        // seriesRef.current = lineSeries;

        // // Option 4: Moving Average (uncomment to enable)
        // const movingAverageData = weeklyData.map((item, idx, arr) => {
        //     const startIdx = Math.max(0, idx - 29); // 30-day moving average
        //     const slice = arr.slice(startIdx, idx + 1);
        //     const avg = slice.reduce((sum, d) => sum + d.value, 0) / slice.length;
        //     return { time: item.time, value: avg };
        // });
        // const maSeries = chart.addLineSeries({
        //     color: 'rgba(255, 99, 71, 0.8)', // Tomato color for contrast
        //     lineWidth: 1,
        // });
        // maSeries.setData(movingAverageData);

        // Option 5: Bar Chart (uncomment to replace line chart)
        const barSeries = chart.addHistogramSeries({
            priceScaleId: 'right',
            priceFormat: { type: 'price', precision: 0, minMove: 1 },
            color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.8)' : 'rgba(255, 140, 0, 0.6)',
        });
        seriesRef.current = barSeries;

        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
        });

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                const data = param.seriesData.get(seriesRef.current);
                setTooltipData({
                    date: param.time,
                    value: data?.value,
                    x: param.point.x,
                    y: param.point.y,
                });
            }
        });

        const resizeChart = () => {
            chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            });
            chart.timeScale().fitContent();
        };
        window.addEventListener('resize', resizeChart);

        seriesRef.current.setData(weeklyData);
        chartRef.current = chart;
        resetChartView();

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [weeklyData, colors, scaleMode, theme.palette.mode]);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
        }
    }, [isInteractive]);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <label className="switch">
                            <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                            <span className="slider round"></span>
                        </label>
                        <span style={{ color: colors.primary[100] }}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
                        <label className="switch">
                            <input type="checkbox" checked={useWeekly} onChange={toggleWeekly} />
                            <span className="slider round"></span>
                        </label>
                        <span style={{ color: colors.primary[100] }}>{useWeekly ? 'Weekly' : 'Daily'}</span>
                        {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
                        {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={setInteractivity} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
                            {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
                        </button>
                        <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
                    </div>
                </div>
            )}
            <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }} onDoubleClick={setInteractivity}>
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
            <div className='under-chart'>
                {!isDashboard && weeklyData.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: colors.greenAccent[500] }}>Last Updated: {txCountLastUpdated}</span>
                    </div>
                )}
            </div>
            {!isDashboard && tooltipData && (
                <div className="tooltip" style={{
                    left: (() => {
                        const sidebarWidth = isMobile ? -80 : -320;
                        const cursorX = tooltipData.x - sidebarWidth;
                        const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
                        const tooltipWidth = 200;
                        const offset = 10000 / (chartWidth + 300);
                        const rightPosition = cursorX + offset;
                        const leftPosition = cursorX - tooltipWidth - offset;
                        return rightPosition + tooltipWidth <= chartWidth ? `${rightPosition}px` : (leftPosition >= 0 ? `${leftPosition}px` : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`);
                    })(),
                    top: `${tooltipData.y + 100}px`,
                }}>
                    <div style={{ fontSize: '15px' }}>Transaction Count</div>
                    <div style={{ fontSize: '20px' }}>{tooltipData.value.toLocaleString()}</div>
                    <div>{tooltipData.date.toString().substring(0, 4) === currentYear ? `${tooltipData.date.toString().substring(0, 4)} - latest` : tooltipData.date.toString().substring(0, 4)}</div>
                </div>
            )}
            {!isDashboard && (
                <p className='chart-info'>
                    This chart shows the {useWeekly ? 'weekly' : 'daily'} transaction count on the Bitcoin blockchain,
                    with the latest datapoint representing the most recent {useWeekly ? 'week\'s' : 'day\'s'} transaction volume.
                </p>
            )}
        </div>
    );
};

// export default BitcoinTxCountChart;
export default restrictToPaidSubscription(BitcoinTxCountChart);