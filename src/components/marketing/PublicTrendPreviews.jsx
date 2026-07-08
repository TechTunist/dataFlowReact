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
import TrackedSignupLink from './TrackedSignupLink';
import MiniSparkline from './MiniSparkline';
import { fetchPublicMarketPulse } from '../../data/publicMarketPulse';
import { isOpenAccessPromoActive } from '../../config/openAccessPromo';
import { trackPreviewInteraction } from '../../utils/plausibleEvents';

const formatUsd = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatPct = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
};

const TrendCard = ({ title, value, blurb, points, colors, onInteract }) => (
  <Card
    onMouseEnter={onInteract}
    onFocus={onInteract}
    sx={{
      height: '100%',
      backgroundColor: colors.primary[900],
      border: `1px solid ${colors.primary[600]}`,
      transition: 'border-color 0.2s ease',
      '&:hover': { borderColor: colors.greenAccent[600] },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Typography sx={{ color: colors.grey[400], fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </Typography>
      <Typography sx={{ color: colors.greenAccent[400], fontWeight: 800, fontSize: '1.5rem', my: 0.75 }}>
        {value}
      </Typography>
      <Box sx={{ my: 1.5 }}>
        <MiniSparkline
          points={points}
          width={240}
          height={64}
          stroke={colors.greenAccent[400]}
          fill={`${colors.greenAccent[500]}22`}
          ariaLabel={`${title} ~90 day trend`}
        />
      </Box>
      <Typography sx={{ color: colors.grey[400], fontSize: '0.85rem', lineHeight: 1.5 }}>
        {blurb}
      </Typography>
    </CardContent>
  </Card>
);

/**
 * Larger public trend previews for cold visitors (shared pulse cache).
 * Interactive full charts still require free account signup.
 */
const PublicTrendPreviews = ({ colors }) => {
  const promoActive = isOpenAccessPromoActive();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicMarketPulse()
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onInteract = () => {
    if (tracked) return;
    setTracked(true);
    trackPreviewInteraction('public-trend-previews');
  };

  const hasSparklines =
    (data?.sparklines?.btc?.length || 0) >= 2
    || (data?.sparklines?.fear_and_greed?.length || 0) >= 2
    || (data?.sparklines?.btc_dominance?.length || 0) >= 2;

  if (!loading && !hasSparklines) return null;

  const cards = [
    {
      title: 'Bitcoin price',
      value: formatUsd(data?.btc_price?.value),
      blurb: 'Daily close trend. Open the full Bitcoin chart after free signup for indicators and zoom.',
      points: data?.sparklines?.btc || [],
    },
    {
      title: 'Fear & Greed',
      value:
        data?.fear_and_greed?.value != null
          ? `${Math.round(Number(data.fear_and_greed.value))} · ${data.fear_and_greed.classification || ''}`
          : '—',
      blurb: 'Sentiment cycle at a glance. Full history and overlays unlock with a free account.',
      points: data?.sparklines?.fear_and_greed || [],
    },
    {
      title: 'BTC dominance',
      value: formatPct(data?.btc_dominance_pct?.value),
      blurb: 'Bitcoin share of crypto market cap. Useful for altseason vs BTC-season context.',
      points: data?.sparklines?.btc_dominance || [],
    },
  ];

  return (
    <Box
      id="public-trends"
      component="section"
      sx={{
        width: '100%',
        py: { xs: 6, md: 8 },
        backgroundColor: colors.primary[900],
        scrollMarginTop: '96px',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip
            label="Public trend previews · No account required"
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
              fontSize: { xs: '1.75rem', md: '2.35rem' },
            }}
          >
            See the recent path of the market
          </Typography>
          <Typography sx={{ color: colors.grey[300], maxWidth: 680, mx: 'auto', lineHeight: 1.6 }}>
            Roughly the last 90 days from free public data we already store. Zoom, multi-asset tools,
            and full history require a free account
            {promoActive ? ' (limited free access while the promotion lasts).' : '.'}
          </Typography>
        </Box>

        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3].map((k) => (
              <Grid item xs={12} md={4} key={k}>
                <Skeleton variant="rounded" height={220} sx={{ bgcolor: colors.primary[700] }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            {cards.map((c) => (
              <Grid item xs={12} md={4} key={c.title}>
                <TrendCard
                  title={c.title}
                  value={c.value}
                  blurb={c.blurb}
                  points={c.points}
                  colors={colors}
                  onInteract={onInteract}
                />
              </Grid>
            ))}
          </Grid>
        )}

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            component={TrackedSignupLink}
            to="/login-signup?mode=signup"
            location="public-trend-previews"
            variant="contained"
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              fontWeight: 'bold',
              px: 4,
              '&:hover': { backgroundColor: colors.greenAccent[400] },
            }}
          >
            {promoActive ? 'Sign up free to unlock all charts' : 'Sign up free for full charts'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default PublicTrendPreviews;
