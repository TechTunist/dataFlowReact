import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { tokens } from '../../theme';
import { fetchPublicDataHealth } from '../../data/publicMarketPulse';
import { trackPlausible } from '../../utils/plausibleEvents';

const DISMISS_KEY = 'cryptological_data_health_dismiss_v1';
const POLL_MS = 10 * 60 * 1000;

/**
 * Subtle in-app banner for signed-in users when daily free data is stale/degraded.
 * Uses public health endpoint (no JWT). Dismissible per status+as_of for the session day.
 */
const DataFreshnessBanner = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [health, setHealth] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const load = async () => {
      try {
        const data = await fetchPublicDataHealth();
        if (cancelled || !data) return;
        setHealth(data);
        if (data.status === 'stale' || data.status === 'degraded') {
          trackPlausible('Data Health Notice', { status: data.status });
        }
      } catch {
        /* non-blocking */
      }
    };

    load();
    timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!health) return;
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      if (!raw) {
        setHidden(false);
        return;
      }
      const parsed = JSON.parse(raw);
      const key = `${health.status}:${health.as_of || ''}`;
      setHidden(parsed.key === key);
    } catch {
      setHidden(false);
    }
  }, [health]);

  if (!health || hidden) return null;
  if (health.status !== 'stale' && health.status !== 'degraded') return null;

  const isDegraded = health.status === 'degraded';
  const bg = isDegraded ? colors.redAccent?.[800] || '#5c1a1a' : colors.primary[700];
  const border = isDegraded ? colors.redAccent?.[500] || '#ef5350' : colors.greenAccent[700];
  const fg = colors.grey[100];

  const dismiss = () => {
    try {
      sessionStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ key: `${health.status}:${health.as_of || ''}` }),
      );
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <Box
      role="status"
      sx={{
        width: '100%',
        py: 0.75,
        px: 1.5,
        backgroundColor: bg,
        borderBottom: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        position: 'relative',
        zIndex: 1200,
      }}
    >
      <Typography
        sx={{
          color: fg,
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          textAlign: 'center',
          pr: 4,
          lineHeight: 1.4,
        }}
      >
        {isDegraded ? 'Data notice: ' : 'Heads up: '}
        {health.user_message}
      </Typography>
      <IconButton
        aria-label="Dismiss data notice"
        size="small"
        onClick={dismiss}
        sx={{ position: 'absolute', right: 4, color: colors.grey[300] }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default DataFreshnessBanner;
