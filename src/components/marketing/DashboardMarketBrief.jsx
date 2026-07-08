import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { DataContext } from '../../DataContext';
import { fetchPublicDataHealth, fetchPublicMarketPulse } from '../../data/publicMarketPulse';
import {
  BRIEF_NEXT_CHARTS,
  buildBriefMetrics,
  buildBriefNarrative,
} from '../../utils/marketBrief';
import { getCycleBottomDaysLeft, getBtcReferenceDate } from '../../utility/cycleBottomDaysLeft';
import {
  trackBriefChartClick,
  trackBriefView,
} from '../../utils/plausibleEvents';
import { isOpenAccessPromoActive } from '../../config/openAccessPromo';

/**
 * Signed-in daily habit surface on the dashboard.
 * Uses public pulse/health (cached) + optional cycle days from loaded BTC data.
 */
const DashboardMarketBrief = ({ colors }) => {
  const promoActive = isOpenAccessPromoActive();
  const { btcData } = useContext(DataContext);
  const [pulse, setPulse] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPublicMarketPulse().catch(() => null),
      fetchPublicDataHealth().catch(() => null),
    ]).then(([p, h]) => {
      if (cancelled) return;
      setPulse(p);
      setHealth(h);
      setLoading(false);
      if (p) trackBriefView(h?.status || 'unknown');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const daysLeft = useMemo(() => {
    try {
      return getCycleBottomDaysLeft(getBtcReferenceDate(btcData)).daysLeft;
    } catch {
      return null;
    }
  }, [btcData]);

  const narrative = useMemo(
    () => buildBriefNarrative(pulse, { daysLeft }),
    [pulse, daysLeft],
  );
  const metrics = useMemo(() => buildBriefMetrics(pulse), [pulse]);

  const healthStatus = health?.status || 'unknown';
  const healthOk = healthStatus === 'ok';
  const healthChipLabel = healthOk
    ? `Data current${health?.as_of ? ` · ${health.as_of}` : ''}`
    : healthStatus === 'stale'
      ? `Data slightly behind${health?.as_of ? ` · BTC ${health.as_of}` : ''}`
      : healthStatus === 'degraded'
        ? 'Data incomplete, refresh later'
        : 'Checking data freshness…';

  const healthChipColor = healthOk
    ? colors.greenAccent[800]
    : healthStatus === 'degraded'
      ? colors.redAccent?.[800] || colors.primary[700]
      : colors.primary[700];

  return (
    <Card
      sx={{
        mb: 3,
        backgroundColor: colors.primary[500],
        border: `1px solid ${colors.greenAccent[700]}`,
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 1.5,
          }}
        >
          <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: 700 }}>
            Today&apos;s market brief
          </Typography>
          <Chip
            size="small"
            label={healthChipLabel}
            sx={{
              backgroundColor: healthChipColor,
              color: colors.grey[100],
              fontWeight: 600,
            }}
          />
        </Box>

        {promoActive && (
          <Typography sx={{ color: colors.grey[400], fontSize: '0.8rem', mb: 1.5 }}>
            Limited free access is on for free accounts, explore any chart below.
          </Typography>
        )}

        {loading ? (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {[1, 2, 3, 4].map((k) => (
              <Grid item xs={6} sm={3} key={k}>
                <Skeleton variant="rounded" height={72} sx={{ bgcolor: colors.primary[700] }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {metrics.map((m) => (
              <Grid item xs={6} sm={4} md={metrics.length >= 5 ? 2 : 3} key={m.key}>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    backgroundColor: colors.primary[700],
                    border: `1px solid ${colors.primary[600]}`,
                    height: '100%',
                  }}
                >
                  <Typography sx={{ color: colors.grey[400], fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{ color: colors.greenAccent[400], fontWeight: 800, fontSize: '1.1rem' }}>
                    {m.value}
                  </Typography>
                  <Typography sx={{ color: colors.grey[500], fontSize: '0.7rem' }}>{m.sub}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        <Typography sx={{ color: colors.grey[200], lineHeight: 1.65, mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>
          {loading ? 'Loading today’s context…' : narrative}
        </Typography>

        <Typography sx={{ color: colors.grey[400], fontSize: '0.8rem', mb: 1, fontWeight: 600 }}>
          Open next
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {BRIEF_NEXT_CHARTS.map((c) => (
            <Button
              key={c.path}
              component={Link}
              to={c.path}
              size="small"
              variant="outlined"
              onClick={() => trackBriefChartClick(c.path)}
              sx={{
                borderColor: colors.greenAccent[600],
                color: colors.greenAccent[400],
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: colors.greenAccent[400],
                  backgroundColor: `${colors.greenAccent[900]}33`,
                },
              }}
            >
              {c.label}
              <Box component="span" sx={{ ml: 0.75, color: colors.grey[500], fontSize: '0.75rem' }}>
                {c.reason}
              </Box>
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DashboardMarketBrief;
