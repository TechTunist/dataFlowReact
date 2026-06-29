import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import ChartTooltip from './ChartTooltip';

const UKClaimantCount = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const claimantSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const [claimantData, setClaimantData] = useState([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');

  // Fetch UK Claimant Count rate (JSA / equivalent) directly from Nomis - timely narrow measure of labour stress
  useEffect(() => {
    const fetchData = async () => {
      if (claimantData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        // Total claimants rate for UK (sex=7 total, item=1 total claimants, measures for rate)
        const url = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_1_1.data.json?geography=2092957697&sex=7&item=1&measures=20201&time=first,latest';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Nomis API error ' + res.status);
        const json = await res.json();
        const obs = json.obs || [];

        const normalizeTime = (t) => {
          if (!t) return null;
          let s = (typeof t === 'object' && t.value != null) ? String(t.value) : String(t);
          if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
          if (/^\d{6}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-01`;
          if (/^\d{4}$/.test(s)) return `${s}-01-01`;
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
          return null;
        };
        let series = obs
          .map(o => {
            const raw = o.time?.value;
            return {
              time: normalizeTime(raw),
              value: parseFloat(o.obs_value?.value)
            };
          })
          .filter(d => d.time && !isNaN(d.value))
          .sort((a, b) => a.time.localeCompare(b.time));
        const seen = new Set();
        series = series.filter(d => { if (seen.has(d.time)) return false; seen.add(d.time); return true; });

        setClaimantData(series);
      } catch (err) {
        console.error('Error fetching Nomis claimant data:', err);
        setError('Failed to load UK claimant count data from Nomis API.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [claimantData.length]);

  const setInteractivity = useCallback(() => setIsInteractive((prev) => !prev), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  }, []);

  const applyTimeRange = useCallback((range) => {
    setTimeRange(range);
    if (!chartRef.current || claimantData.length === 0) return;
    const chart = chartRef.current;
    if (range === 'all') {
      chart.timeScale().fitContent();
      return;
    }
    const now = new Date();
    let fromStr;
    if (range === '10y') fromStr = (now.getFullYear() - 10) + '-01-01';
    else if (range === '5y') fromStr = (now.getFullYear() - 5) + '-01-01';
    else if (range === '2y') fromStr = (now.getFullYear() - 2) + '-01-01';
    else return;

    const fromTime = claimantData.find(d => d.time >= fromStr)?.time || claimantData[0].time;
    const toTime = claimantData[claimantData.length - 1].time;
    if (fromTime && toTime) {
      chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
    }
  }, [claimantData]);

  // Chart init - pure UK claimant rate data (left linear scale). Data normalized to consistent yyyy-mm-dd monthly for lightweight-charts.
  useEffect(() => {
    if (claimantData.length === 0 || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        horzLines: { color: colors.greenAccent[700] },
      },
      timeScale: { minBarSpacing: 0.001 },
      leftPriceScale: {
        visible: true,
        borderVisible: false,
        mode: 0, // linear for the rate
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      crosshair: { mode: 1 },
    });

    // Claimant rate - gold/amber for "warning" timely stress signal. Pure data, consistent frequency.
    const claimantSeries = chart.addAreaSeries({
      color: '#f59e0b',
      lineColor: '#fbbf24',
      topColor: 'rgba(245, 158, 11, 0.35)',
      bottomColor: 'rgba(245, 158, 11, 0.05)',
      lineWidth: 2,
      priceScaleId: 'left',
      title: 'Claimant Rate',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    claimantSeriesRef.current = claimantSeries;
    claimantSeries.setData(claimantData);

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setTooltipData(null);
        return;
      }
      const cData = param.seriesData.get(claimantSeries);
      setTooltipData({
        date: param.time,
        claimant: cData?.value,
        x: param.point.x,
        y: param.point.y,
      });
    });

    const resize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', resize);

    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', resize);
      if (chart) chart.remove();
    };
  }, [claimantData, colors]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  useEffect(() => {
    if (timeRange !== 'all') applyTimeRange(timeRange);
  }, [claimantData.length, timeRange, applyTimeRange]);

  const formatPct = (v) => (v != null ? v.toFixed(2) + '%' : 'N/A');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isDashboard && (
        <div className="chart-top-div" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {['all', '10y', '5y', '2y'].map((r) => (
              <button
                key={r}
                onClick={() => applyTimeRange(r)}
                className="button-reset"
                style={{ backgroundColor: timeRange === r ? '#4cceac' : 'transparent', color: timeRange === r ? 'black' : '#31d6aa', borderColor: timeRange === r ? 'violet' : '#70d8bd', fontSize: '12px', padding: '4px 8px' }}
              >
                {r === 'all' ? 'All' : r.toUpperCase()}
              </button>
            ))}

            {isLoading && <span style={{ color: colors.grey[100] }}>Loading Nomis...</span>}
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

      <div
        className="chart-container"
        style={{ flex: '1 1 auto', minHeight: isDashboard ? '380px' : '620px', overflow: 'hidden', width: '100%', border: '2px solid #a9a9a9', position: 'relative', zIndex: 1 }}
        onDoubleClick={setInteractivity}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {!isDashboard && (
          <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} render={(tooltipData) => (
<>
<div style={{ fontSize: '13px' }}>UK Claimant Rate</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#fbbf24' }}>{tooltipData.claimant != null ? formatPct(tooltipData.claimant) : 'N/A'}</div>
            <div style={{ fontSize: '12px', marginTop: 3, opacity: 0.85 }}>
              {tooltipData.date ? tooltipData.date.slice(0, 7) : 'N/A'}
            </div>
</>
)} />
        )}
      </div>

      {!isDashboard && (
        <div className="under-chart" style={{ flexShrink: 0, padding: '10px 0 20px 0', display: 'block' }}>
          {claimantData.length > 0 && (
            <div style={{ marginBottom: '8px', color: colors.grey[100], fontSize: '15px', textAlign: 'left' }}>
              Current UK Claimant Rate (total):{' '}
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>{formatPct(claimantData[claimantData.length - 1]?.value)}</span>
            </div>
          )}

          <div style={{ color: colors.grey[100], fontSize: '15px', lineHeight: 1.4, textAlign: 'left' }}>
            This tracks the percentage of the UK workforce claiming Jobseeker&apos;s Allowance (or equivalent unemployment-related benefits). It&apos;s a narrow but very fast monthly signal of how many people are out of work and applying for support.
            <br /><br />
            Explanation: when this number rises, it usually means the jobs market is cooling and more people are struggling to find work, an early warning for economic slowdown. In this app it acts like the UK version of US Initial Claims: a high-frequency read on labour stress that helps you understand the real-world backdrop for risk assets and crypto sentiment.
          </div>

          <div style={{ marginTop: '6px', fontSize: '12px', color: '#888', textAlign: 'left' }}>
            Source: Nomisweb (ONS). Rates are percentages. Data direct from public API in the browser for this prototype.
          </div>
        </div>
      )}


    </div>
  );
};

export default UKClaimantCount;