import React, { useEffect, useState } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { fetchPublicMarketPulse } from '../../data/publicMarketPulse';
import { isOpenAccessPromoActive } from '../../config/openAccessPromo';

const formatUsd = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatPct = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
};

/**
 * Compact live market strip above the login/signup form.
 * Reminds cold visitors of product value while they create an account.
 */
const LoginSignupPulse = ({ colors }) => {
  const promoActive = isOpenAccessPromoActive();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPublicMarketPulse()
      .then((data) => {
        if (cancelled || !data) return;
        const next = [
          { label: 'BTC', value: formatUsd(data.btc_price?.value) },
          {
            label: 'F&G',
            value:
              data.fear_and_greed?.value != null
                ? String(Math.round(Number(data.fear_and_greed.value)))
                : '—',
          },
          { label: 'Dom', value: formatPct(data.btc_dominance_pct?.value) },
        ];
        if (data.defi_tvl?.value != null) {
          next.push({ label: 'DeFi TVL', value: formatUsd(data.defi_tvl.value) });
        }
        setItems(next);
      })
      .catch(() => {
        if (!cancelled) setItems(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && !items) return null;

  return (
    <Box
      sx={{
        width: '100%',
        mb: 2.5,
        p: 1.5,
        borderRadius: 2,
        backgroundColor: colors.primary[900],
        border: `1px solid ${colors.primary[600]}`,
      }}
    >
      <Typography
        sx={{
          color: colors.grey[400],
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 1,
          textAlign: 'center',
        }}
      >
        {promoActive
          ? 'Live snapshot · Free account unlocks all charts'
          : 'Live market snapshot · Free account unlocks full charts'}
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={36} sx={{ bgcolor: colors.primary[700] }} />
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          {items.map((item) => (
            <Box key={item.label} sx={{ textAlign: 'center', minWidth: 64 }}>
              <Typography sx={{ color: colors.grey[500], fontSize: '0.7rem' }}>{item.label}</Typography>
              <Typography sx={{ color: colors.greenAccent[400], fontWeight: 700, fontSize: '0.95rem' }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LoginSignupPulse;
