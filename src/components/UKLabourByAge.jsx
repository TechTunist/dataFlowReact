import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';

const UKLabourByAge = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();

  const [data, setData] = useState([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [selectedGender, setSelectedGender] = useState('0');
  const [selectedAge, setSelectedAge] = useState('0');

  const genderOptions = [{ value: '0', label: 'All persons' }, { value: '1', label: 'Males' }, { value: '2', label: 'Females' }];
  const ageOptions = [{ value: '0', label: 'All ages' }, { value: '21', label: 'Age 16-64' }, { value: '22', label: 'Age 16-24' }, { value: '23', label: 'Age 25-49' }];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); setError(null);
      try {
        const url = `https://www.nomisweb.co.uk/api/v01/dataset/NM_170_1.data.json?geography=2092957697&c_sex=${selectedGender}&c_age=${selectedAge}&c_ecopuk11=12&measure=3&measures=20100&time=first,latest`;
        const res = await fetch(url); if (!res.ok) throw new Error('Nomis error');
        const json = await res.json();
        const obs = json.obs || [];
        const normalizeTime = (t) => {
          if (!t) return null;
          let s;
          if (typeof t === 'string') s = t;
          else if (typeof t === 'object' && t.value != null) s = String(t.value);
          else if (typeof t === 'number') s = String(t);
          else return null;
          if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
          if (/^\d{6}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-01`;
          if (/^\d{4}$/.test(s)) return `${s}-01-01`;
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
          return null;
        };
        let series = obs
          .map(o => ({ time: normalizeTime(o.time), value: parseFloat(o.obs_value?.value) }))
          .filter(d => d.time && !isNaN(d.value))
          .sort((a, b) => a.time.localeCompare(b.time));
        const seen = new Set();
        series = series.filter(d => { if (seen.has(d.time)) return false; seen.add(d.time); return true; });
        setData(series);
      } catch (err) { setError('Failed to load UK labour by age data from Nomis.'); } finally { setIsLoading(false); }
    };
    fetchData();
  }, [selectedGender, selectedAge]);

  const setInteractivity = useCallback(() => setIsInteractive(p => !p), []);
  const resetChartView = useCallback(() => { if (chartRef.current) chartRef.current.timeScale().fitContent(); }, []);
  const applyTimeRange = useCallback((range) => {
    setTimeRange(range);
    if (!chartRef.current || data.length === 0) return;
    const chart = chartRef.current;
    if (range === 'all') { chart.timeScale().fitContent(); return; }
    const now = new Date();
    let fromStr = (now.getFullYear() - (range === '10y' ? 10 : range === '5y' ? 5 : 2)) + '-01-01';
    const fromTime = data.find(d => d.time >= fromStr)?.time || data[0].time;
    const toTime = data[data.length-1].time;
    if (fromTime && toTime) chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
  }, [data]);

  useEffect(() => {
    if (data.length === 0 || !chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, { width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight, layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] }, grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } }, timeScale: { minBarSpacing: 0.001 }, leftPriceScale: { visible: true, borderVisible: false, mode: 0, scaleMargins: { top: 0.1, bottom: 0.1 } }, crosshair: { mode: 1 } });
    const s = chart.addLineSeries({ color: '#06b6d4', lineWidth: 2, priceScaleId: 'left', lastValueVisible: true });
    seriesRef.current = s; s.setData(data); chart.timeScale().fitContent();
    chart.subscribeCrosshairMove((param) => { if (!param.point || !param.time) { setTooltipData(null); return; } const d = param.seriesData.get(s); setTooltipData({ date: param.time, value: d?.value, x: param.point.x, y: param.point.y }); });
    const resize = () => { if (chartRef.current && chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight }); };
    window.addEventListener('resize', resize); chartRef.current = chart;
    return () => { window.removeEventListener('resize', resize); if (chart) chart.remove(); };
  }, [data, colors]);

  useEffect(() => { if (chartRef.current) chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive }); }, [isInteractive]);
  useEffect(() => { if (timeRange !== 'all') applyTimeRange(timeRange); }, [data.length, timeRange, applyTimeRange]);

  const genderLabel = genderOptions.find(g => g.value === selectedGender)?.label || 'Total';
  const ageLabel = ageOptions.find(a => a.value === selectedAge)?.label || 'All';
  const formatVal = (v) => v != null ? v.toFixed(1) + '%' : 'N/A';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isDashboard && (
        <div className="chart-top-div" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: colors.grey[100], fontSize: '11px' }}>Gender:</span>
            {genderOptions.map(g => <button key={g.value} onClick={() => setSelectedGender(g.value)} className="button-reset" style={{ backgroundColor: selectedGender === g.value ? '#4cceac' : 'transparent', color: selectedGender === g.value ? 'black' : '#31d6aa', borderColor: selectedGender === g.value ? 'violet' : '#70d8bd', fontSize: '11px', padding: '3px 6px' }}>{g.label}</button>)}
            <span style={{ color: colors.grey[100], fontSize: '11px', marginLeft: '8px' }}>Age:</span>
            <select value={selectedAge} onChange={e => setSelectedAge(e.target.value)} style={{ fontSize: '11px', padding: '3px' }}>{ageOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
            {['all', '10y', '5y', '2y'].map(r => <button key={r} onClick={() => applyTimeRange(r)} className="button-reset" style={{ backgroundColor: timeRange === r ? '#4cceac' : 'transparent', color: timeRange === r ? 'black' : '#31d6aa', borderColor: timeRange === r ? 'violet' : '#70d8bd', fontSize: '11px', padding: '3px 6px' }}>{r === 'all' ? 'All' : r.toUpperCase()}</button>)}
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={setInteractivity} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>{isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}</button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ flex: '1 1 auto', minHeight: isDashboard ? '380px' : '620px', overflow: 'hidden', width: '100%', border: '2px solid #a9a9a9', position: 'relative', zIndex: 1 }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>
      {!isDashboard && (
        <div className="under-chart" style={{ flexShrink: 0, padding: '10px 0 20px 0', display: 'block' }}>
          {data.length > 0 && <div style={{ marginBottom: '8px', color: colors.grey[100], fontSize: '15px', textAlign: 'left' }}>Current UK Labour Rate ({genderLabel}, {ageLabel}): <span style={{ color: '#06b6d4', fontWeight: 600 }}>{formatVal(data[data.length-1]?.value)}</span></div>}
          <div style={{ color: colors.grey[100], fontSize: '15px', lineHeight: 1.4, textAlign: 'left' }}>
            This shows labour market status (employment rate, unemployment rate, inactivity) for different age groups in the UK, from the Annual Population Survey. Switch gender and age band.
            <br /><br />
            For a layperson: it tells you how well different generations are doing in the jobs market — e.g. are young people (16-24) finding work at normal rates, or are older workers (50+) dropping out? High youth unemployment or rising inactivity can point to structural problems. In the app these demographic cuts help you judge whether UK labour strength is broad-based or fragile in key groups.
          </div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#888', textAlign: 'left' }}>Source: Nomis (ONS). Consistent quarterly series.</div>
        </div>
      )}
      {!isDashboard && tooltipData && (
        <div className="tooltip" style={{ left: '50%', top: `${tooltipData.y + 80}px`, transform: 'translateX(-50%)' }}>
          <div style={{ fontSize: '13px' }}>UK Labour ({genderLabel}, {ageLabel})</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#06b6d4' }}>{formatVal(tooltipData.value)}</div>
          <div style={{ fontSize: '12px', marginTop: 3, opacity: 0.85 }}>{tooltipData.date ? tooltipData.date.slice(0,7) : 'N/A'}</div>
        </div>
      )}
    </div>
  );
};

export default UKLabourByAge;