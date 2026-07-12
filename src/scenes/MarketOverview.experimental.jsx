/**
 * Experimental Market Overview presentation.
 * Same metrics as classic (via marketOverviewMetrics); different layout focused on readability.
 * Revert: set marketOverviewStyle=classic or flip USE_EXPERIMENTAL in MarketOverview.jsx.
 */
import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  useTheme,
  CircularProgress,
  Tooltip,
  IconButton,
  Chip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../theme';
import useIsMobile from '../hooks/useIsMobile';
import { useChartData, useChartDataActions } from '../hooks/useChartData';
import {
  buildMarketOverviewSnapshot,
  getHeatColor,
  getHeatLabel,
  GAUGE_COLORS,
} from './marketOverviewMetrics';

const GROUP_META = {
  sentiment: {
    title: 'Sentiment',
    subtitle: 'How the crowd feels right now',
  },
  positioning: {
    title: 'Cycle positioning',
    subtitle: 'Where we sit vs historical stretch and value',
  },
  momentum: {
    title: 'Momentum',
    subtitle: 'Short- and higher-timeframe strength',
  },
  timing: {
    title: 'Cycle timing',
    subtitle: 'Progress through the post-top window',
  },
};

function HeatTrack({ value, color }) {
  const v = value == null || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(100, value));
  return (
    <Box
      sx={{
        position: 'relative',
        height: 8,
        borderRadius: 99,
        background: `linear-gradient(90deg, ${GAUGE_COLORS.join(', ')})`,
        opacity: 0.9,
        overflow: 'visible',
      }}
      aria-hidden
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: `${v}%`,
          transform: 'translate(-50%, -50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          bgcolor: color || getHeatColor(v),
          border: '2px solid #fff',
          boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
        }}
      />
    </Box>
  );
}

/** Upper semicircle dial: 0 = left (cold), 100 = right (hot). */
function TemperatureDial({ value, label, colors }) {
  const v = value == null || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(100, value));
  const color = getHeatColor(v);
  const r = 72;
  const cx = 90;
  const cy = 92;
  // θ = π at left → 0 at right
  const toXY = (t01) => {
    const theta = Math.PI * (1 - t01);
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
  };
  const left = toXY(0);
  const right = toXY(1);
  const needle = toXY(v / 100);
  const trackD = `M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`;
  const fillD = `M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${needle.x} ${needle.y}`;

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      <svg width="180" height="112" viewBox="0 0 180 112" role="img" aria-label={`Heat ${Math.round(v)}`}>
        <defs>
          <linearGradient id="moHeatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {GAUGE_COLORS.map((c, i) => (
              <stop key={c} offset={`${(i / (GAUGE_COLORS.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <path d={trackD} fill="none" stroke={colors.primary[500]} strokeWidth="14" strokeLinecap="round" />
        <path d={trackD} fill="none" stroke="url(#moHeatGrad)" strokeWidth="14" strokeLinecap="round" opacity={0.4} />
        {value != null && (
          <path d={fillD} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
        )}
        <circle cx={needle.x} cy={needle.y} r="7" fill={color} stroke="#fff" strokeWidth="2" />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill={colors.grey[100]}
          fontSize="28"
          fontWeight="800"
          fontFamily="inherit"
        >
          {value != null ? Math.round(v) : '—'}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill={colors.grey[300]}
          fontSize="12"
          fontWeight="600"
          fontFamily="inherit"
        >
          {label || 'Heat'}
        </text>
      </svg>
    </Box>
  );
}

const MetricRow = memo(function MetricRow({ metric, colors, isMobile }) {
  const navigate = useNavigate();
  const heat = metric.heat;
  const accent = heat != null ? getHeatColor(heat) : colors.grey[500];
  const heatLabel = heat != null ? getHeatLabel(heat) : '—';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.1fr) minmax(0, 1.4fr) auto',
        gap: isMobile ? 1.25 : 2,
        alignItems: 'center',
        px: { xs: 1.5, md: 2 },
        py: { xs: 1.5, md: 1.75 },
        borderRadius: 2,
        bgcolor: colors.primary[600],
        border: `1px solid ${colors.primary[400]}`,
        borderLeft: `4px solid ${accent}`,
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
        '&:hover': {
          borderColor: colors.primary[300],
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.35 }}>
          <Typography
            sx={{
              color: colors.grey[100],
              fontWeight: 700,
              fontSize: isMobile ? '0.95rem' : '1rem',
              letterSpacing: 0.2,
            }}
          >
            {metric.title}
          </Typography>
          <Tooltip title={metric.explanation} arrow enterTouchDelay={0}>
            <IconButton size="small" sx={{ color: colors.grey[400], p: 0.25 }} aria-label="About">
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={() => navigate(metric.chartPath)}
            sx={{ color: colors.greenAccent[400], p: 0.25 }}
            aria-label="Open chart"
          >
            <ShowChartIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Typography sx={{ color: colors.grey[300], fontSize: '0.8rem', lineHeight: 1.35 }}>
          {metric.reading}
        </Typography>
        {metric.extra && (
          <Typography sx={{ color: colors.grey[400], fontSize: '0.72rem', mt: 0.35 }}>
            {metric.extra}
          </Typography>
        )}
      </Box>

      <Box sx={{ minWidth: 0, px: isMobile ? 0 : 1 }}>
        <HeatTrack value={heat} color={accent} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ color: colors.grey[500], fontSize: 10 }}>Cold</Typography>
          <Typography sx={{ color: accent, fontSize: 11, fontWeight: 700 }}>{heatLabel}</Typography>
          <Typography sx={{ color: colors.grey[500], fontSize: 10 }}>Hot</Typography>
        </Box>
      </Box>

      <Box
        sx={{
          textAlign: isMobile ? 'left' : 'right',
          minWidth: isMobile ? 0 : 110,
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          alignItems: isMobile ? 'baseline' : 'flex-end',
          gap: isMobile ? 1 : 0.25,
        }}
      >
        <Typography
          sx={{
            color: colors.grey[100],
            fontWeight: 800,
            fontSize: isMobile ? '1.35rem' : '1.5rem',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {metric.primary}
          {metric.unit && heat != null && (
            <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 600, color: colors.grey[400], ml: 0.25 }}>
              {metric.unit}
            </Box>
          )}
        </Typography>
        <Typography sx={{ color: colors.grey[300], fontSize: '0.78rem', fontWeight: 500 }}>
          {metric.secondary}
        </Typography>
      </Box>
    </Box>
  );
});

const MarketOverviewExperimental = memo(() => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const {
    btcData,
    fearAndGreedData,
    latestFearAndGreed,
    mvrvData,
    altcoinSeasonData,
  } = useChartData();
  const {
    fetchBtcData,
    fetchEthData,
    fetchFearAndGreedData,
    fetchLatestFearAndGreed,
    fetchInflationData,
    fetchMarketCapData,
    fetchMvrvData,
    fetchAltcoinSeasonData,
  } = useChartDataActions();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      await Promise.allSettled([
        fetchBtcData(),
        fetchEthData(),
        fetchFearAndGreedData(),
        fetchLatestFearAndGreed?.(),
        fetchInflationData(),
        fetchMarketCapData(),
        fetchMvrvData(),
        fetchAltcoinSeasonData(),
      ]);
      if (mounted) setIsLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [
    fetchBtcData,
    fetchEthData,
    fetchFearAndGreedData,
    fetchLatestFearAndGreed,
    fetchInflationData,
    fetchMarketCapData,
    fetchMvrvData,
    fetchAltcoinSeasonData,
  ]);

  const snapshot = useMemo(
    () =>
      buildMarketOverviewSnapshot({
        btcData,
        fearAndGreedData,
        latestFearAndGreed,
        mvrvData,
        altcoinSeasonData,
      }),
    [btcData, fearAndGreedData, latestFearAndGreed, mvrvData, altcoinSeasonData]
  );

  if (isLoading && !btcData?.length) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          bgcolor: colors.primary[500],
        }}
      >
        <CircularProgress size={52} sx={{ color: colors.greenAccent[400] }} />
        <Typography sx={{ mt: 2, color: colors.grey[100] }}>Loading market conditions…</Typography>
      </Box>
    );
  }

  const compositeColor = getHeatColor(snapshot.composite || 0);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: colors.primary[500],
        color: colors.grey[100],
        pb: 6,
      }}
    >
      {/* Hero */}
      <Box
        sx={{
          maxWidth: 1100,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          pt: { xs: 2.5, md: 3.5 },
          pb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            gap: { xs: 2, md: 4 },
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 55%, rgba(76,206,172,0.08) 100%)`,
            border: `1px solid ${colors.primary[400]}`,
            boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at 90% 20%, ${compositeColor}22 0%, transparent 50%)`,
              pointerEvents: 'none',
            }}
          />
          <Box sx={{ flex: '0 0 auto', position: 'relative' }}>
            <TemperatureDial
              value={snapshot.composite}
              label={snapshot.compositeLabel}
              colors={colors}
            />
          </Box>
          <Box sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: colors.greenAccent[400],
                mb: 0.75,
              }}
            >
              Market conditions
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                lineHeight: 1.2,
                mb: 1,
                color: colors.grey[100],
              }}
            >
              {snapshot.composite != null
                ? `${snapshot.compositeLabel} market`
                : 'Reading the tape…'}
            </Typography>
            <Typography
              sx={{
                color: colors.grey[300],
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.5,
                maxWidth: 520,
                mb: 1.5,
              }}
            >
              {snapshot.compositeReading}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                size="small"
                label={`Composite heat ${snapshot.composite != null ? Math.round(snapshot.composite) : '—'}`}
                sx={{
                  bgcolor: `${compositeColor}33`,
                  color: colors.grey[100],
                  border: `1px solid ${compositeColor}`,
                  fontWeight: 700,
                }}
              />
              <Chip
                size="small"
                label="Same data as classic overview"
                sx={{
                  bgcolor: colors.primary[500],
                  color: colors.grey[300],
                  border: `1px solid ${colors.primary[400]}`,
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Heat legend */}
        <Box sx={{ mt: 2, px: 0.5 }}>
          <Box
            sx={{
              height: 10,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${GAUGE_COLORS.join(', ')})`,
              border: `1px solid ${colors.primary[400]}`,
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: colors.grey[400] }}>Cold · opportunity zone</Typography>
            <Typography sx={{ fontSize: 11, color: colors.grey[400] }}>Hot · elevated risk</Typography>
          </Box>
        </Box>
      </Box>

      {/* Sections */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        {['sentiment', 'positioning', 'momentum', 'timing'].map((groupKey) => {
          const rows = snapshot.groups[groupKey] || [];
          if (!rows.length) return null;
          const meta = GROUP_META[groupKey];
          return (
            <Box key={groupKey}>
              <Box sx={{ mb: 1.25, px: 0.25 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                    color: colors.grey[100],
                  }}
                >
                  {meta.title}
                </Typography>
                <Typography sx={{ color: colors.grey[400], fontSize: '0.85rem' }}>
                  {meta.subtitle}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {rows.map((m) => (
                  <MetricRow key={m.id} metric={m} colors={colors} isMobile={isMobile} />
                ))}
              </Box>
            </Box>
          );
        })}

        <Typography
          sx={{
            color: colors.grey[500],
            fontSize: '0.75rem',
            textAlign: 'center',
            mt: 1,
            lineHeight: 1.5,
          }}
        >
          Values match the classic Market Overview heat math. Presentation is experimental — use the
          layout toggle to switch back anytime.
        </Typography>
      </Box>
    </Box>
  );
});

export default MarketOverviewExperimental;
