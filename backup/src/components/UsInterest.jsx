import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import BitcoinFees from './BitcoinTransactionFees';

const UsInterestChart = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const areaSeriesRef = useRef(null);
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { interestData, fetchInterestData } = useContext(DataContext);

    const [scaleMode, setScaleMode] = useState(0); // 0 for linear, 1 for logarithmic
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch data only if not present in context
    useEffect(() => {
        const fetchData = async () => {
            if (interestData.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchInterestData();
            } catch (err) {
                setError('Failed to fetch interest rate data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchInterestData, interestData.length]);

    const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
    const toggleScaleMode = useCallback(() => setScaleMode(prev => (prev === 1 ? 0 : 1)), []);
    const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

    // Initialize chart
    useEffect(() => {
        if (interestData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
            grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
            timeScale: { minBarSpacing: 0.001 },
        });

        const areaSeries = chart.addAreaSeries({
            priceScaleId: 'right',
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });
        areaSeriesRef.current = areaSeries;

        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
        });

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                const data = param.seriesData.get(areaSeries);
                setTooltipData({
                    date: param.time,
                    price: data?.value,
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

        const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark'
            ? { topColor: 'rgba(38, 198, 218, 0.56)', bottomColor: 'rgba(38, 198, 218, 0.04)', lineColor: 'rgba(38, 198, 218, 1)' }
            : { topColor: 'rgba(255, 165, 0, 0.56)', bottomColor: 'rgba(255, 165, 0, 0.2)', lineColor: 'rgba(255, 140, 0, 0.8)' };

        areaSeries.applyOptions({ topColor, bottomColor, lineColor });
        areaSeries.setData(interestData);

        chartRef.current = chart;
        resetChartView();

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [interestData, colors, scaleMode, theme.palette.mode]);

    // Update interactivity
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
                {!isDashboard && interestData.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: colors.greenAccent[500] }}>Last Updated: {interestData[interestData.length - 1].time}</span>
                    </div>
                )}
                {!isDashboard && <BitcoinFees />}
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
                    <div style={{ fontSize: '15px' }}>Interest Rate</div>
                    <div style={{ fontSize: '20px' }}>{tooltipData.price.toFixed(2)}%</div>
                    <div>{tooltipData.date.toString()}</div>
                </div>
            )}
            {!isDashboard && (
                <p className='chart-info'>
                    This chart shows the historical interest rates of the United States.
                </p>
            )}
        </div>
    );
};

export default UsInterestChart;