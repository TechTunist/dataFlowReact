import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { useChartData, useChartDataActions } from '../hooks/useChartData';
import BitcoinFees from './BitcoinTransactionFees';
import ChartTooltip from './ChartTooltip';
import MacroChartControls, { getOverlaySeriesLabel } from './macro/MacroChartControls';
import useUsMacroChartEnhancements from '../hooks/useUsMacroChartEnhancements';
import ChartInfoSections from './ChartInfoSections';

const UsInflationChart = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const areaSeriesRef = useRef(null);
    const overlaySeriesRef = useRef(null);
    const primaryDataRef = useRef([]);
    const overlayDataRef = useRef([]);
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { inflationData } = useChartData();
    const { fetchInflationData } = useChartDataActions();

    const [scaleMode, setScaleMode] = useState(1);
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

    const {
        overlaySeriesId,
        setOverlaySeriesId,
        smoothingPeriod,
        setSmoothingPeriod,
        plottedPrimaryData,
        plottedOverlayData,
        hasOverlay,
        overlayMeta,
        formatOverlayValue,
    } = useUsMacroChartEnhancements({
        primaryData: inflationData,
        scaleMode,
        defaultOverlaySeriesId: 'SP500',
        setIsLoading,
        setError,
    });

    const overlayColor = overlayMeta?.color
        || (theme.palette.mode === 'dark' ? 'rgb(223, 175, 185)' : 'rgba(112, 153, 112, 0.8)');

    useEffect(() => {
        const fetchData = async () => {
            if (inflationData.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchInflationData();
            } catch (err) {
                setError('Failed to fetch inflation data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchInflationData, inflationData.length]);

    const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
    const toggleScaleMode = useCallback(() => setScaleMode(prev => (prev === 1 ? 0 : 1)), []);
    const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

    const findNearestData = useCallback((data, targetTime) => {
        if (!data.length) return null;
        const target = new Date(targetTime).getTime();
        let left = 0;
        let right = data.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midTime = new Date(data[mid].time).getTime();
            if (midTime === target) return data[mid];
            if (midTime < target) left = mid + 1;
            else right = mid - 1;
        }
        const prev = right >= 0 ? data[right] : null;
        const next = left < data.length ? data[left] : null;
        if (!prev) return next;
        if (!next) return prev;
        return Math.abs(new Date(prev.time).getTime() - target) <= Math.abs(new Date(next.time).getTime() - target) ? prev : next;
    }, []);

    useEffect(() => {
        if (!chartContainerRef.current || plottedPrimaryData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
            grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
            timeScale: { minBarSpacing: 0.001 },
            rightPriceScale: { visible: true, borderVisible: false },
            leftPriceScale: { visible: hasOverlay, borderVisible: false },
        });

        const areaSeries = chart.addAreaSeries({
            priceScaleId: 'right',
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });
        areaSeriesRef.current = areaSeries;

        const mode = scaleMode;
        chart.priceScale('right').applyOptions({ mode, borderVisible: false });
        chart.priceScale('left').applyOptions({ mode, borderVisible: false, visible: hasOverlay });

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                const primaryNearest = param.seriesData.get(areaSeries) || findNearestData(primaryDataRef.current, param.time);
                const overlayNearest = hasOverlay && overlaySeriesRef.current
                    ? (param.seriesData.get(overlaySeriesRef.current) || findNearestData(overlayDataRef.current, param.time))
                    : null;
                setTooltipData({
                    date: param.time,
                    primaryValue: primaryNearest?.value,
                    overlayValue: overlayNearest?.value,
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
        areaSeries.setData(plottedPrimaryData);
        primaryDataRef.current = plottedPrimaryData;

        if (hasOverlay && plottedOverlayData.length > 0) {
            const overlaySeries = chart.addLineSeries({
                priceScaleId: 'left',
                lineWidth: 2,
                color: overlayColor,
                priceFormat: { type: 'custom', minMove: 0.01, formatter: formatOverlayValue },
            });
            overlaySeriesRef.current = overlaySeries;
            overlaySeries.setData(plottedOverlayData);
            overlayDataRef.current = plottedOverlayData;
        } else {
            overlaySeriesRef.current = null;
            overlayDataRef.current = [];
        }

        chartRef.current = chart;
        resetChartView();

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [plottedPrimaryData, plottedOverlayData, colors, scaleMode, theme.palette.mode, hasOverlay, overlayColor, formatOverlayValue, findNearestData, resetChartView]);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
        }
    }, [isInteractive]);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <MacroChartControls
                    colors={colors}
                    overlaySeriesId={overlaySeriesId}
                    onOverlayChange={setOverlaySeriesId}
                    smoothingPeriod={smoothingPeriod}
                    onSmoothingChange={setSmoothingPeriod}
                    excludeOverlayIds={['INFLATION']}
                />
            )}
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <label className="switch">
                            <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                            <span className="slider round"></span>
                        </label>
                        <span style={{ color: colors.primary[100] }}>
                            {scaleMode === 1 ? 'Logarithmic' : 'Linear'}
                        </span>
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
                {!isDashboard && (
                    <ChartTooltip tooltipData={tooltipData} xNudge={80} chartContainerRef={chartContainerRef} render={(tooltipData) => (
<>
<div style={{ fontSize: '15px' }}>US Inflation</div>
                        <div style={{ fontSize: '20px' }}>{tooltipData.primaryValue != null ? `${tooltipData.primaryValue.toFixed(2)}%` : 'N/A'}</div>
                        {hasOverlay && (
                            <>
                                <div style={{ fontSize: '15px', color: overlayColor }}>{getOverlaySeriesLabel(overlaySeriesId)}</div>
                                <div style={{ fontSize: '20px', color: overlayColor }}>
                                    {tooltipData.overlayValue != null ? formatOverlayValue(tooltipData.overlayValue) : 'N/A'}
                                </div>
                            </>
                        )}
                        <div>{tooltipData.date.toString().substring(0, 4) === currentYear ? `${tooltipData.date.toString().substring(0, 4)} - latest` : tooltipData.date.toString().substring(0, 4)}</div>
</>
)} />
                )}
            </div>
            <div className='under-chart'>
                {!isDashboard && inflationData.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: colors.greenAccent[500] }}>Last Updated: {inflationData[inflationData.length - 1].time}</span>
                    </div>
                )}
                {!isDashboard && <BitcoinFees />}
            </div>
            {!isDashboard && (
                <ChartInfoSections
                    sections={[
                        {
                            title: 'What it is',
                            content: 'Historical annualized U.S. inflation rate.',
                        },
                        {
                            title: 'What this chart shows',
                            content:
                                'Monthly inflation readings (latest datapoint is the most recent month) with optional asset overlays such as Bitcoin or the S&P 500.',
                        },
                        {
                            title: 'How to interpret',
                            content:
                                'Compare how inflation regimes have aligned with market performance. Use smoothing to reduce monthly noise and reveal the underlying trend.',
                        },
                    ]}
                />
            )}
        </div>
    );
};

export default UsInflationChart;