import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import ChartTooltip from './ChartTooltip';

const UKUnemployment = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const ukSeriesRef = useRef(null);
  const empSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();

  const [ukUnempData, setUkUnempData] = useState([]);
  const [ukEmpData, setUkEmpData] = useState([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // all, 10y, 5y, 2y

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  // Fetch UK LFS data directly from Nomis (unemp rate + emp rate for 16-64, total)
  useEffect(() => {
    const fetchData = async () => {
      if (ukUnempData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        const url = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_59_1.data.json?geography=2092957697&sex=7&economic_activity=7,8&measures=20207&value_type=0&time=first,latest';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Nomis API error');
        const json = await res.json();
        const obs = json.obs || [];

        const unempObs = obs.filter(o => String(o.economic_activity?.value) === '8');
        const empObs = obs.filter(o => String(o.economic_activity?.value) === '7');

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
        const parse = (oArr) => {
          let series = oArr
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
          return series.filter(d => { if (seen.has(d.time)) return false; seen.add(d.time); return true; });
        };

        const unemp = parse(unempObs);
        const emp = parse(empObs);

        setUkUnempData(unemp);
        setUkEmpData(emp);
      } catch (err) {
        console.error('Error fetching Nomis UK LFS data:', err);
        setError('Failed to load UK unemployment data from Nomis. The public API may be temporarily unavailable or rate-limited.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ukUnempData.length]);

  const setInteractivity = useCallback(() => setIsInteractive((prev) => !prev), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  const applyTimeRange = useCallback((range) => {
    setTimeRange(range);
    if (!chartRef.current || ukUnempData.length === 0) return;

    const chart = chartRef.current;
    const now = new Date();
    let fromDate;

    if (range === 'all') {
      chart.timeScale().fitContent();
      return;
    } else if (range === '10y') {
      fromDate = new Date(now.getFullYear() - 10, now.getMonth(), 1);
    } else if (range === '5y') {
      fromDate = new Date(now.getFullYear() - 5, now.getMonth(), 1);
    } else if (range === '2y') {
      fromDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
    }

    if (fromDate) {
      const from = fromDate.toISOString().slice(0, 7) + '-01'; // normalize to match data times
      // Find nearest data time >= from (pure UK data, consistent frequency)
      const allTimes = ukUnempData.map(d => d.time).filter(Boolean).sort();
      const fromTime = allTimes.find(t => t >= from) || allTimes[0];
      const toTime = allTimes[allTimes.length - 1];
      if (fromTime && toTime) {
        chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
      }
    }
  }, [ukUnempData]);

  // Initialize chart - pure UK LFS data only (unemployment + employment rates, same consistent frequency from Nomis).
  // leftPriceScale for rates (linear). No BTC to avoid frequency mismatch issues with daily BTC vs monthly/3m Nomis data.
  useEffect(() => {
    if ((ukUnempData.length === 0 && ukEmpData.length === 0) || !chartContainerRef.current) return;

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
        mode: 0, // linear for rates
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      crosshair: { mode: 1 },
    });

    // UK Unemployment Rate (LFS 16-64) - primary, solid green
    const ukUnempSeries = chart.addLineSeries({
      color: '#4ade80',
      lineWidth: 2.5,
      priceScaleId: 'left',
      title: 'UK Unemp Rate (16-64)',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    ukSeriesRef.current = ukUnempSeries;
    ukUnempSeries.setData(ukUnempData);

    // UK Employment Rate - secondary on same left scale, dashed
    const ukEmpSeries = chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 1.8,
      lineStyle: 1, // dashed
      priceScaleId: 'left',
      title: 'UK Employment Rate (16-64)',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    empSeriesRef.current = ukEmpSeries;
    if (ukEmpData.length) ukEmpSeries.setData(ukEmpData);

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setTooltipData(null);
        return;
      }
      const unempData = param.seriesData.get(ukUnempSeries);
      setTooltipData({
        date: param.time,
        unemp: unempData?.value,
        x: param.point.x,
        y: param.point.y,
      });
    });

    const resizeChart = () => {
      if (chartRef.current && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', resizeChart);
      if (chart) chart.remove();
      ukSeriesRef.current = null;
      empSeriesRef.current = null;
    };
  }, [ukUnempData, ukEmpData, colors]);

  // Apply interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  // Re-apply time range when data changes
  useEffect(() => {
    if (timeRange !== 'all') {
      applyTimeRange(timeRange);
    }
  }, [ukUnempData.length, timeRange, applyTimeRange]);

  const formatRate = (v) => (v != null ? v.toFixed(1) + '%' : 'N/A');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isDashboard && (
        <div className="chart-top-div" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Time range quick filters for utility */}
            {['all', '10y', '5y', '2y'].map((r) => (
              <button
                key={r}
                onClick={() => applyTimeRange(r)}
                className="button-reset"
                style={{
                  backgroundColor: timeRange === r ? '#4cceac' : 'transparent',
                  color: timeRange === r ? 'black' : '#31d6aa',
                  borderColor: timeRange === r ? 'violet' : '#70d8bd',
                  fontSize: '12px',
                  padding: '4px 8px',
                }}
              >
                {r === 'all' ? 'All' : r.toUpperCase()}
              </button>
            ))}

            {isLoading && <span style={{ color: colors.grey[100] }}>Loading Nomis...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
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
            <button onClick={resetChartView} className="button-reset extra-margin">
              Reset Chart
            </button>
          </div>
        </div>
      )}

      <div
        className="chart-container"
        style={{
          flex: '1 1 auto',
          minHeight: isDashboard ? '380px' : '620px',
          overflow: 'hidden',
          width: '100%',
          border: '2px solid #a9a9a9',
          position: 'relative',
          zIndex: 1,
        }}
        onDoubleClick={setInteractivity}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {!isDashboard && (
          <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} render={(tooltipData) => (
<>
<div style={{ fontSize: '13px', marginBottom: 2 }}>UK LFS Unemp Rate (16-64)</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#4ade80' }}>
              {tooltipData.unemp != null ? formatRate(tooltipData.unemp) : 'N/A'}
            </div>
            <div style={{ fontSize: '12px', marginTop: 4, opacity: 0.85 }}>
              {tooltipData.date ? tooltipData.date.slice(0, 7) : 'N/A'}
            </div>
</>
)} />
        )}
      </div>

      {!isDashboard && (
        <div className="under-chart" style={{ flexShrink: 0, padding: '10px 0 20px 0', display: 'block' }}>
          {ukUnempData.length > 0 && (
            <div style={{ marginBottom: '8px', color: colors.grey[100], fontSize: '15px', textAlign: 'left' }}>
              Current UK Unemployment Rate (16-64, LFS):{' '}
              <span style={{ color: colors.greenAccent[400], fontWeight: 600 }}>
                {formatRate(ukUnempData[ukUnempData.length - 1]?.value)}
              </span>
              {'  |  '} Employment Rate:{' '}
              <span style={{ color: '#22c55e' }}>
                {formatRate(ukEmpData[ukEmpData.length - 1]?.value)}
              </span>
            </div>
          )}

          <div style={{ color: colors.grey[100], fontSize: '15px', lineHeight: 1.4, textAlign: 'left' }}>
            This shows the official UK unemployment rate (ILO definition) and the employment rate for working-age people (16-64). Both come from the Labour Force Survey / Annual Population Survey — the gold-standard broad measure of the jobs market.
            <br /><br />
            Explanation: unemployment rate = % of people who want work but don&apos;t have it. Employment rate = % who actually have jobs. When unemployment goes up or employment goes down it usually means the economy is losing steam; the reverse is a sign of strength. This is the wide, reliable view (unlike the faster but narrower Claimant Count chart). In this app these UK rates are key macro context — a weakening UK labour market often coincides with lower risk appetite across global assets including crypto.
          </div>

          <div style={{ marginTop: '6px', fontSize: '12px', color: '#888', textAlign: 'left' }}>
            Data: Nomisweb public API (no key required). LFS rates are 3-month averages. Not financial advice.
          </div>
        </div>
      )}


    </div>
  );
};

export default UKUnemployment;