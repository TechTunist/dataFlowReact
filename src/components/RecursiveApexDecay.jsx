import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { tokens } from '../theme';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow } from './ChartUnderSection';
import {
  RAD_NAME,
  RAD_ABBREV,
  buildRadModel,
  formatRadDate,
  formatRadPrice,
  radLaymanSummary,
  daysBetween,
} from '../utility/recursiveApexDecay';

const RecursiveApexDecay = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const isNarrow = useMediaQuery('(max-width:600px)');
  const { btcData, fetchBtcData } = useContext(DataContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  /** Bump to clear Plotly zoom/pan UI state without calling Plotly.relayout (avoids drawing.tester errors). */
  const [uiRevision, setUiRevision] = useState(0);
  const plotRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (btcData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchBtcData();
      } catch (err) {
        setError('Failed to load Bitcoin price history. Showing verified seed apexes only.');
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchBtcData, btcData.length]);

  const analysis = useMemo(() => buildRadModel(btcData), [btcData]);
  const summary = useMemo(() => radLaymanSummary(analysis), [analysis]);
  const { projection, apexes, cycles, transitions, timing, uncertainty } = analysis;
  const b4 = projection.b4;
  const t5 = projection.t5;
  const t4 = analysis.t4;
  const b4Unc = uncertainty?.b4;
  const t5Unc = uncertainty?.t5;

  const setInteractivity = useCallback(() => {
    setIsInteractive((prev) => !prev);
  }, []);

  const currentPrice = useMemo(() => {
    if (!btcData.length) return null;
    const last = btcData[btcData.length - 1];
    const v = parseFloat(last?.value);
    return Number.isFinite(v) ? v : null;
  }, [btcData]);

  const daysToB4 = useMemo(() => {
    if (!b4.date) return null;
    const today = btcData.length
      ? String(btcData[btcData.length - 1].time).slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    return daysBetween(today, b4.date);
  }, [b4.date, btcData]);

  // Chart series: price history + projected path
  const plotData = useMemo(() => {
    const traces = [];

    if (btcData.length > 0) {
      traces.push({
        x: btcData.map((d) => d.time),
        y: btcData.map((d) => d.value),
        type: 'scatter',
        mode: 'lines',
        name: 'BTC price',
        line: { color: colors.greenAccent[400] || '#4cceac', width: 1.5 },
        hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>',
      });
    }

    // Historical apex markers
    const tops = apexes.filter((a) => a.type === 'top');
    const bottoms = apexes.filter((a) => a.type === 'bottom');

    traces.push({
      x: tops.map((a) => a.date),
      y: tops.map((a) => a.price),
      type: 'scatter',
      mode: 'markers+text',
      name: 'Cycle tops',
      marker: {
        color: colors.redAccent[400] || '#e2726e',
        size: isDashboard ? 8 : 11,
        symbol: 'triangle-up',
        line: { width: 1, color: colors.grey[100] },
      },
      text: tops.map((a) =>
        isDashboard || isNarrow
          ? a.id
          : `${a.id}  ${formatRadPrice(a.price, { compact: true })}`,
      ),
      textposition: 'top center',
      textfont: {
        size: isNarrow ? 9 : 11,
        color: colors.redAccent[300] || '#e99592',
      },
      hovertemplate: '%{customdata}<br>%{x}<br>%{y:$,.0f}<extra>Top</extra>',
      customdata: tops.map((a) => a.id),
    });

    traces.push({
      x: bottoms.map((a) => a.date),
      y: bottoms.map((a) => a.price),
      type: 'scatter',
      mode: 'markers+text',
      name: 'Cycle bottoms',
      marker: {
        color: colors.blueAccent[400] || '#868dfb',
        size: isDashboard ? 8 : 11,
        symbol: 'triangle-down',
        line: { width: 1, color: colors.grey[100] },
      },
      text: bottoms.map((a) =>
        isDashboard || isNarrow
          ? a.id
          : `${a.id}  ${formatRadPrice(a.price, { compact: true })}`,
      ),
      textposition: 'bottom center',
      textfont: {
        size: isNarrow ? 9 : 11,
        color: colors.blueAccent[300] || '#a4a9fc',
      },
      hovertemplate: '%{customdata}<br>%{x}<br>%{y:$,.0f}<extra>Bottom</extra>',
      customdata: bottoms.map((a) => a.id),
    });

    // ±1σ price uncertainty envelope at projected center dates.
    // Date ±1σ ranges are shown on the projection cards.
    if (!isDashboard && t4 && b4.date && t5.date && b4Unc?.price && t5Unc?.price) {
      const b4P = b4Unc.price.sigma1;
      const t5P = t5Unc.price.sigma1;
      traces.push({
        x: [t4.date, b4.date, t5.date, t5.date, b4.date, t4.date],
        y: [t4.price, b4P.high, t5P.high, t5P.low, b4P.low, t4.price],
        type: 'scatter',
        mode: 'lines',
        name: '±1σ (std. dev.) price band',
        fill: 'toself',
        fillcolor: 'rgba(76,206,172,0.18)',
        line: { width: 0, color: 'transparent' },
        hoverinfo: 'skip',
        showlegend: true,
      });
    }

    // Projected path T4 → B4 → T5
    if (t4 && b4.price && t5.price && b4.date && t5.date) {
      traces.push({
        x: [t4.date, b4.date, t5.date],
        y: [t4.price, b4.price, t5.price],
        type: 'scatter',
        mode: 'lines+markers+text',
        name: 'RAD projection',
        line: {
          color: '#f7c948',
          width: 3,
          dash: 'dash',
        },
        marker: {
          color: ['#f7c948', '#4cceac', '#f7c948'],
          size: isDashboard ? 10 : 14,
          symbol: ['circle', 'diamond', 'star'],
          line: { width: 1.5, color: colors.grey[100] },
        },
        text: isDashboard
          ? ['', 'B4', 'T5']
          : [
              '',
              `B4  ${formatRadPrice(b4.price, { compact: true })}`,
              `T5  ${formatRadPrice(t5.price, { compact: true })}`,
            ],
        textposition: ['top center', 'bottom center', 'top center'],
        textfont: {
          size: isNarrow ? 10 : 12,
          color: '#f7c948',
          family: 'inherit',
        },
        hovertemplate:
          '%{text}<br>%{x}<br>%{y:$,.0f}<extra>RAD projection</extra>',
      });
    }

    return traces;
  }, [btcData, apexes, t4, b4, t5, b4Unc, t5Unc, colors, isDashboard, isNarrow]);

  const plotLayout = useMemo(
    () => ({
      title: isDashboard ? '' : `${RAD_ABBREV} — cycle apexes & projection`,
      margin: {
        l: isMobile ? 48 : 60,
        r: isMobile ? 16 : 30,
        b: isMobile ? 40 : 50,
        t: isDashboard ? 16 : 48,
        pad: 4,
      },
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100], size: isNarrow ? 10 : 12 },
      xaxis: {
        title: !isDashboard && !isMobile ? 'Date' : '',
        gridcolor: colors.primary[500],
        zeroline: false,
        showspikes: true,
        spikemode: 'across',
        spikethickness: 1,
        fixedrange: isDashboard || !isInteractive,
        autorange: true,
      },
      yaxis: {
        title: !isDashboard && !isMobile ? 'BTC price (log)' : '',
        type: 'log',
        gridcolor: colors.primary[500],
        fixedrange: isDashboard || !isInteractive,
        tickformat: '~s',
        tickprefix: '$',
        autorange: true,
      },
      showlegend: !isDashboard && !isNarrow,
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.18,
        yanchor: 'top',
        font: { size: 11 },
      },
      hovermode: 'closest',
      dragmode: isDashboard || !isInteractive ? false : 'zoom',
      // Changing uirevision resets zoom/pan without calling Plotly.relayout (which can throw).
      uirevision: `rad-${uiRevision}`,
    }),
    [colors, isDashboard, isMobile, isNarrow, isInteractive, uiRevision],
  );

  const resetChartView = useCallback(() => {
    setUiRevision((n) => n + 1);
  }, []);

  const fmtMult = (m) => {
    if (m == null || !Number.isFinite(m)) return '—';
    if (m >= 10) return `${m.toFixed(1)}×`;
    return `${m.toFixed(2)}×`;
  };

  const fmtPct = (p) => {
    if (p == null || !Number.isFinite(p)) return '—';
    return `${p.toFixed(0)}%`;
  };

  const fmtRate = (r) => {
    if (r == null || !Number.isFinite(r)) return '—';
    return r.toFixed(3);
  };

  // —— Dashboard compact view ——
  if (isDashboard) {
    return (
      <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', p: 0.5 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 0.5,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Chip
            size="small"
            label={`B4 ${formatRadPrice(b4.price, { compact: true })}`}
            sx={{ bgcolor: 'rgba(76,206,172,0.2)', color: colors.greenAccent[400], fontWeight: 700 }}
          />
          <Chip
            size="small"
            label={`T5 ${formatRadPrice(t5.price, { compact: true })}`}
            sx={{ bgcolor: 'rgba(247,201,72,0.2)', color: '#f7c948', fontWeight: 700 }}
          />
        </Box>
        <Box ref={containerRef} sx={{ flex: 1, minHeight: 0 }}>
          <Plot
            data={plotData}
            layout={{ ...plotLayout, height: undefined }}
            config={{ staticPlot: true, displayModeBar: false, responsive: true }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
      </Box>
    );
  }

  // —— Full page ——
  return (
    <Box
      className="recursive-apex-decay"
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        color: colors.grey[100],
      }}
    >
      {/* Hero: theory name + one-liner */}
      <Box sx={{ textAlign: 'center', px: { xs: 0.5, md: 2 }, pt: 0.5 }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          sx={{ fontWeight: 800, letterSpacing: 0.3, color: colors.grey[100] }}
        >
          {RAD_NAME}{' '}
          <Box component="span" sx={{ color: '#f7c948' }}>
            ({RAD_ABBREV})
          </Box>
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mt: 1,
            maxWidth: 820,
            mx: 'auto',
            color: colors.grey[300],
            lineHeight: 1.55,
            fontSize: isMobile ? '0.95rem' : '1.05rem',
          }}
        >
          {summary.headline} Each cycle the growth multiplies less and the crash is a bit milder —
          RAD extends that pattern to the next floor and the next peak.
        </Typography>
      </Box>

      {/* Eye-catching projection cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          px: { xs: 0.5, md: 1 },
        }}
      >
        <Box
          sx={{
            p: { xs: 1.5, md: 2.25 },
            borderRadius: 2,
            border: '2px solid',
            borderColor: colors.greenAccent[500],
            background: `linear-gradient(145deg, ${colors.primary[600]} 0%, rgba(76,206,172,0.12) 100%)`,
            boxShadow: '0 0 24px rgba(76,206,172,0.18)',
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: colors.greenAccent[400], fontWeight: 700, letterSpacing: 1.2 }}
          >
            Next cycle bottom (B4)
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 800,
              color: colors.greenAccent[400],
              lineHeight: 1.15,
              mt: 0.5,
            }}
          >
            {formatRadPrice(b4.price)}
          </Typography>
          <Typography sx={{ color: colors.grey[200], mt: 0.75, fontSize: '0.95rem' }}>
            ~{formatRadDate(b4.date)}
            {daysToB4 != null && daysToB4 >= 0 && (
              <Box component="span" sx={{ color: colors.grey[400] }}>
                {' '}
                · {daysToB4} days from latest bar
              </Box>
            )}
          </Typography>
          <Typography sx={{ color: colors.grey[400], mt: 0.5, fontSize: '0.85rem' }}>
            ~{fmtPct(b4.dropPct)} drop from T4 ({formatRadPrice(t4?.price)}) · retention{' '}
            {fmtMult(b4.retention)}
          </Typography>
          {b4Unc?.price && b4Unc?.date && (
            <Box sx={{ mt: 1.25, pt: 1, borderTop: `1px solid ${colors.primary[400]}` }}>
              <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block', mb: 0.5 }}>
                Margin of error (±1σ, one standard deviation)
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: colors.grey[300], lineHeight: 1.45 }}>
                <strong style={{ color: colors.greenAccent[400] }}>Price:</strong>{' '}
                {formatRadPrice(b4Unc.price.sigma1.low, { compact: true })} –{' '}
                {formatRadPrice(b4Unc.price.sigma1.high, { compact: true })}
                <br />
                <strong style={{ color: colors.greenAccent[400] }}>Date:</strong>{' '}
                {formatRadDate(b4Unc.date.sigma1.start)} – {formatRadDate(b4Unc.date.sigma1.end)}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: { xs: 1.5, md: 2.25 },
            borderRadius: 2,
            border: '2px solid',
            borderColor: '#f7c948',
            background: `linear-gradient(145deg, ${colors.primary[600]} 0%, rgba(247,201,72,0.14) 100%)`,
            boxShadow: '0 0 24px rgba(247,201,72,0.2)',
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: '#f7c948', fontWeight: 700, letterSpacing: 1.2 }}
          >
            Next cycle top (T5)
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 800,
              color: '#f7c948',
              lineHeight: 1.15,
              mt: 0.5,
            }}
          >
            {formatRadPrice(t5.price)}
          </Typography>
          <Typography sx={{ color: colors.grey[200], mt: 0.75, fontSize: '0.95rem' }}>
            ~{formatRadDate(t5.date)}
          </Typography>
          <Typography sx={{ color: colors.grey[400], mt: 0.5, fontSize: '0.85rem' }}>
            ~{fmtMult(t5.bullMult)} from projected bottom · top-to-top check{' '}
            {formatRadPrice(t5.fromTopPath, { compact: true })}
          </Typography>
          {t5Unc?.price && t5Unc?.date && (
            <Box sx={{ mt: 1.25, pt: 1, borderTop: `1px solid ${colors.primary[400]}` }}>
              <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block', mb: 0.5 }}>
                Margin of error (±1σ, one standard deviation)
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: colors.grey[300], lineHeight: 1.45 }}>
                <strong style={{ color: '#f7c948' }}>Price:</strong>{' '}
                {formatRadPrice(t5Unc.price.sigma1.low, { compact: true })} –{' '}
                {formatRadPrice(t5Unc.price.sigma1.high, { compact: true })}
                <br />
                <strong style={{ color: '#f7c948' }}>Date:</strong>{' '}
                {formatRadDate(t5Unc.date.sigma1.start)} – {formatRadDate(t5Unc.date.sigma1.end)}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Plain-English note: what ±1σ means for non-stats users */}
      {(b4Unc?.price || t5Unc?.price) && (
        <Typography
          variant="body2"
          sx={{
            px: { xs: 0.5, md: 1 },
            color: colors.grey[400],
            lineHeight: 1.55,
            fontSize: '0.9rem',
          }}
        >
          <strong style={{ color: colors.grey[200] }}>What ±1σ means:</strong> the Greek letter{' '}
          <strong style={{ color: colors.grey[200] }}>σ</strong> (sigma) stands for{' '}
          <strong style={{ color: colors.grey[200] }}>standard deviation</strong> — a common way to
          measure how spread out a set of numbers is around its centre. Here, “±1 standard deviation”
          is our reasonable error band around the RAD point estimate: most of the time you would
          expect the real outcome to land inside that range if history is a fair guide, not a guarantee
          that it will. The band is wider when past cycles disagreed more; narrower when they lined up.
        </Typography>
      )}

      {/* Quick context widgets */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr 1fr',
            md: 'repeat(4, 1fr)',
          },
          gap: 1,
          px: { xs: 0.5, md: 1 },
        }}
      >
        {[
          {
            label: 'Latest top (T4)',
            value: formatRadPrice(t4?.price, { compact: true }),
            sub: formatRadDate(t4?.date),
          },
          {
            label: currentPrice != null ? 'Latest close' : 'Seed model',
            value: currentPrice != null ? formatRadPrice(currentPrice, { compact: true }) : 'Verified',
            sub: currentPrice != null ? 'from BTC series' : 'fixed apexes',
          },
          {
            label: 'Avg bear length',
            value: timing.bearAvgLast2 != null ? `${Math.round(timing.bearAvgLast2)}d` : '—',
            sub: 'last 2 top→bottom',
          },
          {
            label: 'Avg bull length',
            value: timing.bullAvgAll != null ? `${Math.round(timing.bullAvgAll)}d` : '—',
            sub: 'bottom→next top',
          },
        ].map((w) => (
          <Box
            key={w.label}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: colors.primary[600],
              border: `1px solid ${colors.primary[400]}`,
            }}
          >
            <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block' }}>
              {w.label}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.grey[100] }}>
              {w.value}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.grey[500] }}>
              {w.sub}
            </Typography>
          </Box>
        ))}
      </Box>

      {error && (
        <Typography sx={{ color: colors.redAccent[400], px: 1, fontSize: '0.9rem' }}>{error}</Typography>
      )}
      {isLoading && (
        <Typography sx={{ color: colors.grey[400], px: 1, fontSize: '0.9rem' }}>
          Loading Bitcoin price history…
        </Typography>
      )}

      {/* Chart */}
      <Box sx={{ px: { xs: 0, md: 0.5 } }}>
        <Box
          className="chart-top-div"
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            mb: 0.5,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
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
          <button type="button" onClick={resetChartView} className="button-reset">
            Reset Chart
          </button>
        </Box>
        <Box
          ref={containerRef}
          sx={{
            height: 'var(--chart-area-min-height, clamp(360px, 55vh, 640px))',
            width: '100%',
            border: '2px solid #a9a9a9',
            borderRadius: 1,
            overflow: 'hidden',
            cursor: isInteractive ? 'crosshair' : 'default',
          }}
        >
          <Plot
            ref={plotRef}
            data={plotData}
            layout={plotLayout}
            config={{
              displayModeBar: false,
              responsive: true,
              // Zoom/scroll only when interactivity is on
              scrollZoom: isInteractive,
              doubleClick: isInteractive ? 'reset' : false,
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
        <UnderChartRow>
          {btcData.length > 0 && <LastUpdated storageKey="btcData" />}
        </UnderChartRow>
      </Box>

      {/* Compact historical cycle table */}
      <Box sx={{ px: { xs: 0.5, md: 1 } }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
          What happened each cycle
        </Typography>
        <TableContainer
          component={Paper}
          sx={{ bgcolor: colors.primary[600], border: `1px solid ${colors.primary[400]}` }}
        >
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.grey[300], borderColor: colors.primary[400] }}>
                  Cycle
                </TableCell>
                <TableCell sx={{ color: colors.grey[300], borderColor: colors.primary[400] }}>
                  Top
                </TableCell>
                <TableCell sx={{ color: colors.grey[300], borderColor: colors.primary[400] }}>
                  Bottom
                </TableCell>
                <TableCell sx={{ color: colors.grey[300], borderColor: colors.primary[400] }}>
                  Crash
                </TableCell>
                <TableCell
                  sx={{
                    color: colors.grey[300],
                    borderColor: colors.primary[400],
                    display: { xs: 'none', md: 'table-cell' },
                  }}
                >
                  Bottom → next top
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cycles.map((c) => (
                <TableRow key={c.cycle}>
                  <TableCell sx={{ color: colors.grey[100], borderColor: colors.primary[500] }}>
                    {c.cycle}
                  </TableCell>
                  <TableCell sx={{ color: colors.redAccent[300], borderColor: colors.primary[500] }}>
                    {formatRadPrice(c.top.price, { compact: true })}
                    <Typography variant="caption" display="block" sx={{ color: colors.grey[500] }}>
                      {formatRadDate(c.top.date)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: colors.blueAccent[300], borderColor: colors.primary[500] }}>
                    {formatRadPrice(c.bottom.price, { compact: true })}
                    <Typography variant="caption" display="block" sx={{ color: colors.grey[500] }}>
                      {formatRadDate(c.bottom.date)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: colors.grey[100], borderColor: colors.primary[500] }}>
                    {fmtPct(c.dropPct)}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: colors.grey[100],
                      borderColor: colors.primary[500],
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    {c.bullMult != null ? fmtMult(c.bullMult) : '— (projected)'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow
                sx={{
                  bgcolor: 'rgba(247,201,72,0.08)',
                  '& td': { borderColor: colors.primary[400] },
                }}
              >
                <TableCell sx={{ color: '#f7c948', fontWeight: 700 }}>4 (RAD)</TableCell>
                <TableCell sx={{ color: colors.redAccent[300] }}>
                  {formatRadPrice(t4?.price, { compact: true })}
                  <Typography variant="caption" display="block" sx={{ color: colors.grey[500] }}>
                    {formatRadDate(t4?.date)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: colors.greenAccent[400], fontWeight: 700 }}>
                  {formatRadPrice(b4.price, { compact: true })}
                  <Typography variant="caption" display="block" sx={{ color: colors.grey[500] }}>
                    ~{formatRadDate(b4.date)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: colors.greenAccent[400], fontWeight: 700 }}>
                  ~{fmtPct(b4.dropPct)}
                </TableCell>
                <TableCell
                  sx={{
                    color: '#f7c948',
                    fontWeight: 700,
                    display: { xs: 'none', md: 'table-cell' },
                  }}
                >
                  ~{fmtMult(t5.bullMult)} → {formatRadPrice(t5.price, { compact: true })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="body2" sx={{ mt: 1.25, color: colors.grey[400], lineHeight: 1.5 }}>
          Crashes are getting milder ({cycles.map((c) => fmtPct(c.dropPct)).join(' → ')} → projected{' '}
          {fmtPct(b4.dropPct)}). Recovery “times bigger” is slowing (
          {transitions.bottomToTop.multipliers.map((m) => fmtMult(m)).join(' → ')} → projected{' '}
          {fmtMult(t5.bullMult)}).
        </Typography>
      </Box>

      {/* Detailed methodology — below the fold */}
      <Box
        sx={{
          mt: 1,
          px: { xs: 0.5, md: 1 },
          py: 2,
          borderTop: `1px solid ${colors.primary[400]}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Detailed methodology & calculations
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.greenAccent[400], mt: 2 }}>
          1. Transition multipliers (rate of change inputs)
        </Typography>
        <Typography variant="body2" sx={{ color: colors.grey[300], mb: 1, lineHeight: 1.55 }}>
          <strong>Top→top:</strong>{' '}
          {transitions.topToTop.multipliers.map((m) => fmtMult(m)).join(' · ')}
          <br />
          <strong>Top→bottom retention</strong> (bottom ÷ top):{' '}
          {transitions.topToBottom.multipliers.map((m) => fmtMult(m)).join(' · ')}
          <br />
          <strong>Bottom→top (bull):</strong>{' '}
          {transitions.bottomToTop.multipliers.map((m) => fmtMult(m)).join(' · ')}
          <br />
          <strong>Bottom→bottom:</strong>{' '}
          {transitions.bottomToBottom.multipliers.length
            ? transitions.bottomToBottom.multipliers.map((m) => fmtMult(m)).join(' · ')
            : '—'}
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.greenAccent[400], mt: 2 }}>
          2. Rate of change & rate of rate of change
        </Typography>
        <Typography variant="body2" sx={{ color: colors.grey[300], mb: 1, lineHeight: 1.55 }}>
          For a sequence of multipliers m₀, m₁, m₂:
          <br />
          rate₁ = m₁/m₀, rate₂ = m₂/m₁
          <br />
          Δrate (second-order) = rate₂ − rate₁
          <br />
          rate₃ = rate₂ + Δrate
          <br />
          projected next multiplier m₃ = m₂ × rate₃
        </Typography>
        <Box
          component="ul"
          sx={{
            color: colors.grey[300],
            pl: 2.5,
            m: 0,
            mb: 1.5,
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}
        >
          <li>
            Retention rates: {transitions.topToBottom.projection.rates?.map(fmtRate).join(', ') || '—'}
            {transitions.topToBottom.projection.rateOfRate != null && (
              <>
                {' '}
                · Δrate = {fmtRate(transitions.topToBottom.projection.rateOfRate)} · next rate ={' '}
                {fmtRate(transitions.topToBottom.projection.rate3)} → retention{' '}
                {fmtMult(b4.retention)}
              </>
            )}
          </li>
          <li>
            Bull mult rates: {transitions.bottomToTop.projection.rates?.map(fmtRate).join(', ') || '—'}
            {transitions.bottomToTop.projection.rateOfRate != null && (
              <>
                {' '}
                · Δrate = {fmtRate(transitions.bottomToTop.projection.rateOfRate)} · next rate ={' '}
                {fmtRate(transitions.bottomToTop.projection.rate3)} → mult {fmtMult(t5.bullMult)}
              </>
            )}
          </li>
          <li>
            Top→top rates: {transitions.topToTop.projection.rates?.map(fmtRate).join(', ') || '—'}
            {transitions.topToTop.projection.rateOfRate != null && (
              <>
                {' '}
                · Δrate = {fmtRate(transitions.topToTop.projection.rateOfRate)} → next top mult{' '}
                {fmtMult(t5.topToTopMult)}
              </>
            )}
          </li>
        </Box>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.greenAccent[400], mt: 2 }}>
          3. How B4 and T5 are built
        </Typography>
        <Typography variant="body2" sx={{ color: colors.grey[300], mb: 1, lineHeight: 1.55 }}>
          <strong>Primary path (cycle-faithful):</strong> B4 = T4 × projected retention (
          {formatRadPrice(t4?.price)} × {fmtMult(b4.retention)} = {formatRadPrice(b4.price)}). Then T5
          = B4 × projected bull mult ({formatRadPrice(b4.price)} × {fmtMult(t5.bullMult)} ={' '}
          {formatRadPrice(t5.fromBottomPath)}).
          <br />
          <strong>Timing:</strong> B4 date = T4 + last-two-cycle average top→bottom (
          {timing.bearAvgLast2 != null ? Math.round(timing.bearAvgLast2) : '—'} days). T5 date = B4 +
          average bottom→top ({timing.bullAvgAll != null ? Math.round(timing.bullAvgAll) : '—'} days).
          <br />
          <strong>Cross-check (top→top only):</strong> T5 ≈ {formatRadPrice(t5.fromTopPath)} around{' '}
          {formatRadDate(t5.dateFromTops)} (peak-to-peak avg{' '}
          {timing.peakToPeakAvg != null ? Math.round(timing.peakToPeakAvg) : '—'} days). Geometric-mean
          blend of both T5 paths: {formatRadPrice(t5.blended)}.
          {projection.crossChecks.b4FromBottoms != null && (
            <>
              <br />
              <strong>Bottom→bottom check:</strong> B4 ≈{' '}
              {formatRadPrice(projection.crossChecks.b4FromBottoms)} (
              {formatRadDate(projection.crossChecks.b4DateFromBottoms)}).
            </>
          )}
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.greenAccent[400], mt: 2 }}>
          4. Margin of error (±1σ / one standard deviation)
        </Typography>
        <Typography variant="body2" sx={{ color: colors.grey[300], mb: 1, lineHeight: 1.55 }}>
          <strong>σ (sigma)</strong> means <strong>standard deviation</strong>: how much values
          typically scatter around an average. “±1σ” is a one-standard-deviation error band around
          each RAD estimate — a practical “most plausible range,” not a promise.
          <br />
          {uncertainty?.note ||
            '±1σ bands combine historical phase-length scatter (dates) with multi-path price alternatives (log space).'}
          <br />
          <strong>Date band:</strong> sample standard deviation of past top→bottom lengths (B4) and
          combined bear+bull length scatter in quadrature (T5). Floors ≥14d bear / ≥21d bull so a
          tight sample never implies false precision.
          <br />
          <strong>Price band:</strong> log-space spread of alternative estimators (hold-last, mean,
          first-order rate, cross-check paths) around the primary RAD point, with minimum relative
          floors (~15% bottom / ~22% top).
          {b4Unc?.price && (
            <>
              <br />
              Current σ_log(B4) ≈ {b4Unc.price.sigmaLog.toFixed(3)} · σ_days(bear) ≈ ±
              {b4Unc.bearDaysSigma}d
            </>
          )}
          {t5Unc?.price && (
            <>
              {' '}
              · σ_log(T5) ≈ {t5Unc.price.sigmaLog.toFixed(3)} · σ_days(T5) ≈ ±
              {t5Unc.combinedDaysSigma}d
            </>
          )}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: 1,
            bgcolor: colors.primary[600],
            color: colors.grey[400],
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: colors.grey[300] }}>Disclaimer:</strong> Recursive Apex Decay is an
          educational, purely historical pattern model. ±1σ (one standard deviation) bands are
          approximate model-error ranges from small samples, not statistical guarantees or classical
          confidence intervals. Not financial advice. Markets can break historical patterns at any
          time.
        </Typography>
      </Box>
    </Box>
  );
};

export default RecursiveApexDecay;
