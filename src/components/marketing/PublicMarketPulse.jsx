import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Skeleton,
  Typography,
  Chip,
} from '@mui/material';
import { API_ENDPOINTS } from '../../config/api';
import TrackedSignupLink from './TrackedSignupLink';
import MiniSparkline from './MiniSparkline';
import {
  getHeroPricingHint,
  isOpenAccessPromoActive,
  OPEN_ACCESS_PROMO,
} from '../../config/openAccessPromo';
import { trackMarketPulseView } from '../../utils/plausibleEvents';

const formatUsd = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatPct = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
};

const formatRisk = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
};

const MetricCard = ({ label, value, sub, colors, sparkline, sparkLabel }) => (
  <Card
    sx={{
      height: '100%',
      backgroundColor: colors.primary[900],
      border: `1px solid ${colors.primary[600]}`,
    }}
  >
    <CardContent sx={{ textAlign: 'center', py: 2.5, px: 1.5 }}>
      <Typography
        sx={{
          color: colors.grey[400],
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 1,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color: colors.greenAccent[400],
          fontWeight: 800,
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      {sparkline?.length >= 2 && (
        <Box sx={{ mt: 1.25, mb: 0.5 }}>
          <MiniSparkline
            points={sparkline}
            width={140}
            height={40}
            stroke={colors.greenAccent[400]}
            fill={`${colors.greenAccent[500]}22`}
            ariaLabel={sparkLabel || `${label} recent trend`}
          />
        </Box>
      )}
      {sub && (
        <Typography sx={{ color: colors.grey[500], fontSize: '0.75rem', mt: 0.5 }}>
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
);

/**
 * Public market snapshot for cold visitors (no sign-in).
 * Uses /api/public/market-pulse/ — small cached payload from free stored data.
 */
const PublicMarketPulse = ({ colors }) => {
  const promoActive = isOpenAccessPromoActive();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(API_ENDPOINTS.publicMarketPulse(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`pulse ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          trackMarketPulseView(Boolean(json?.sparklines?.btc?.length));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sparklines = data?.sparklines || {};
  const freshnessAsOf = data?.freshness?.as_of;

  const cards = [
    {
      label: 'Bitcoin',
      value: formatUsd(data?.btc_price?.value),
      sub: data?.btc_price?.date ? `Daily close · ${data.btc_price.date}` : 'Daily close',
      sparkline: sparklines.btc,
      sparkLabel: 'Bitcoin price, last ~90 days',
    },
    {
      label: 'Fear & Greed',
      value:
        data?.fear_and_greed?.value != null
          ? `${Math.round(Number(data.fear_and_greed.value))}`
          : '—',
      sub: data?.fear_and_greed?.classification || 'Market sentiment',
      sparkline: sparklines.fear_and_greed,
      sparkLabel: 'Fear and Greed index, recent history',
    },
    {
      label: 'BTC Dominance',
      value: formatPct(data?.btc_dominance_pct?.value),
      sub: data?.btc_dominance_pct?.date || 'Share of crypto market',
      sparkline: sparklines.btc_dominance,
      sparkLabel: 'Bitcoin dominance, last ~90 days',
    },
    {
      label: 'Total Market Cap',
      value: formatUsd(data?.total_market_cap?.value),
      sub: data?.total_market_cap?.date || 'Crypto market size',
    },
  ];

  if (data?.btc_risk?.value != null) {
    cards.push({
      label: 'BTC Risk signal',
      value: formatRisk(data.btc_risk.value),
      sub: data.btc_risk.metric ? `${data.btc_risk.metric} · ${data.btc_risk.date || ''}` : 'Precomputed metric',
    });
  }

  return (
    <Box
      id="market-pulse"
      component="section"
      sx={{
        width: '100%',
        py: { xs: 6, md: 8 },
        backgroundColor: colors.primary[800],
        borderTop: `1px solid ${colors.primary[700]}`,
        borderBottom: `1px solid ${colors.primary[700]}`,
        scrollMarginTop: '96px',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip
            label="Live public snapshot · No account required"
            sx={{
              mb: 2,
              backgroundColor: colors.greenAccent[900],
              color: colors.greenAccent[300],
              fontWeight: 600,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              mb: 1.5,
              fontSize: { xs: '1.75rem', md: '2.5rem' },
            }}
          >
            Market pulse
          </Typography>
          <Typography
            sx={{
              color: colors.grey[300],
              maxWidth: 720,
              mx: 'auto',
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.6,
            }}
          >
            A free daily snapshot anyone can view, with recent trends. Interactive charts, the workbench,
            and full history unlock when you create a free account
            {promoActive ? ' (limited free access while the promotion lasts).' : '.'}
          </Typography>
          {freshnessAsOf && !loading && !error && (
            <Typography sx={{ color: colors.grey[500], mt: 1.5, fontSize: '0.85rem' }}>
              Data as of {freshnessAsOf} · Updated daily from free public sources
            </Typography>
          )}
        </Box>

        {loading && (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((k) => (
              <Grid item xs={6} md={3} key={k}>
                <Skeleton
                  variant="rounded"
                  height={160}
                  sx={{ bgcolor: colors.primary[700] }}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && error && (
          <Typography sx={{ color: colors.grey[400], textAlign: 'center', mb: 3 }}>
            Live snapshot is briefly unavailable. Browse chart previews below, or sign up to open the full app.
          </Typography>
        )}

        {!loading && !error && (
          <Grid container spacing={2} justifyContent="center">
            {cards.map((c) => (
              <Grid item xs={6} sm={4} md={cards.length >= 5 ? 2 : 3} key={c.label}>
                <MetricCard
                  label={c.label}
                  value={c.value}
                  sub={c.sub}
                  colors={colors}
                  sparkline={c.sparkline}
                  sparkLabel={c.sparkLabel}
                />
              </Grid>
            ))}
          </Grid>
        )}

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography sx={{ color: colors.grey[400], fontSize: '0.9rem', mb: 2 }}>
            {promoActive
              ? OPEN_ACCESS_PROMO.bannerSubtext
              : 'Sign up free to open interactive charts. No card required for the free tier.'}
          </Typography>
          <Typography sx={{ color: colors.grey[500], fontSize: '0.8rem', mb: 2 }}>
            {getHeroPricingHint(promoActive)}
          </Typography>
          <Button
            component={TrackedSignupLink}
            to="/login-signup?mode=signup"
            location="market-pulse-cta"
            variant="contained"
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              fontWeight: 'bold',
              px: 4,
              '&:hover': { backgroundColor: colors.greenAccent[400] },
            }}
          >
            {promoActive ? 'Sign up free to unlock all charts' : 'Sign up free'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default PublicMarketPulse;
