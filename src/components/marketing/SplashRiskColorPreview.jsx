import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Box, Button, Chip, Container, Typography } from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../../theme';
import { splashPreviewRiskData, SPLASH_PREVIEW_END_LABEL } from '../../data/splashPreviewRiskData';
import TrackedSignupLink from './TrackedSignupLink';
import { trackPreviewInteraction } from '../../utils/plausibleEvents';

const RISK_BANDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

/** Trim single low/high outliers so zoomed y-axis fills the pane without hugging extremes. */
function yRangeForVisiblePrices(yValues) {
  if (yValues.length === 0) return null;
  const sorted = [...yValues].sort((a, b) => a - b);
  const yMin = sorted.length > 2 ? sorted[1] : sorted[0];
  const yMax = sorted.length > 2 ? sorted[sorted.length - 2] : sorted[sorted.length - 1];
  const factor = 1.04;
  return {
    min: Math.max(yMin / factor, 1e-10),
    max: yMax * factor,
  };
}

const SplashRiskColorPreview = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [hasInteracted, setHasInteracted] = useState(false);

  const chartData = splashPreviewRiskData;
  const currentRisk = chartData.length > 0 ? chartData[chartData.length - 1].Risk : null;

  const plotTraces = useMemo(() => {
    const bandTraces = RISK_BANDS.map((upperLimit, index) => {
      const lowerLimit = index === 0 ? 0.0 : RISK_BANDS[index - 1];
      const filtered = chartData.filter((d) => d.Risk > lowerLimit && d.Risk <= upperLimit);
      return {
        x: filtered.map((d) => d.time),
        y: filtered.map((d) => d.value),
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: filtered.map((d) => d.Risk),
          colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
          cmin: 0,
          cmax: 1,
          size: 8,
        },
        name: `${lowerLimit.toFixed(1)} – ${upperLimit.toFixed(1)}`,
        hovertemplate:
          `<b>Risk:</b> %{marker.color:.2f}<br>` +
          `<b>Price:</b> $%{y:,.0f}<br>` +
          `<b>Date:</b> %{x|%b %Y}<extra></extra>`,
      };
    });

    bandTraces.push({
      x: chartData.map((d) => d.time),
      y: chartData.map((d) => d.value),
      type: 'scatter',
      mode: 'lines',
      line: { color: 'grey', width: 1.5 },
      name: 'Bitcoin Price',
    });

    return bandTraces;
  }, [chartData, theme.palette.mode]);

  const baseLayout = useMemo(
    () => ({
      autosize: true,
      margin: { l: 56, r: 24, b: 40, t: 24, pad: 4 },
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[800],
      font: { color: colors.grey[200], size: 12 },
      xaxis: { title: '', autorange: true },
      yaxis: {
        title: { text: 'Price ($)', font: { size: 12 } },
        type: 'log',
        autorange: true,
        fixedrange: false,
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.22,
        font: { size: 10 },
      },
      dragmode: 'zoom',
    }),
    [colors]
  );

  const [layout, setLayout] = useState(baseLayout);

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[800],
      font: { ...prev.font, color: colors.grey[200] },
    }));
  }, [colors]);

  const markInteracted = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      trackPreviewInteraction('risk-color');
    }
  }, [hasInteracted]);

  const handleRelayout = useCallback(
    (event) => {
      markInteracted();

      if (event['xaxis.autorange'] === true || event['yaxis.autorange'] === true) {
        setLayout((prev) => ({
          ...prev,
          xaxis: { ...prev.xaxis, autorange: true, range: undefined },
          yaxis: { ...prev.yaxis, autorange: true, range: undefined },
        }));
        return;
      }

      if (!event['xaxis.range[0]'] || !event['xaxis.range[1]']) return;

      const newXMin = new Date(event['xaxis.range[0]']);
      const newXMax = new Date(event['xaxis.range[1]']);
      const visibleData = chartData.filter((d) => {
        const date = new Date(d.time);
        return date >= newXMin && date <= newXMax;
      });

      if (visibleData.length === 0) return;

      const yRange = yRangeForVisiblePrices(visibleData.map((d) => d.value));
      if (!yRange) return;

      setLayout((prev) => ({
        ...prev,
        xaxis: {
          ...prev.xaxis,
          range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
          autorange: false,
        },
        yaxis: {
          ...prev.yaxis,
          range: [Math.log10(yRange.min), Math.log10(yRange.max)],
          autorange: false,
        },
      }));
    },
    [chartData, markInteracted]
  );

  return (
    <Box
      sx={{
        width: '100%',
        py: { xs: 8, md: 10 },
        backgroundColor: colors.primary[800],
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip
            label="Premium preview · Real data through Oct 2024"
            sx={{
              mb: 2,
              backgroundColor: colors.redAccent[800],
              color: colors.redAccent[300],
              fontWeight: 600,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              fontSize: { xs: '2rem', md: '2.75rem' },
              mb: 2,
            }}
          >
            Try the Risk Colour chart, live in your browser
          </Typography>
          <Typography sx={{ color: colors.grey[300], maxWidth: 720, mx: 'auto', lineHeight: 1.7 }}>
            This is a <strong>Premium</strong> chart (not on the free plan). Pan, zoom, and toggle risk
            bands with <strong>real Bitcoin price data</strong> frozen through {SPLASH_PREVIEW_END_LABEL}.
            Sign up free for basic charts, or upgrade for live data and 80+ indicators.
          </Typography>
        </Box>

        <Box
          onMouseDown={markInteracted}
          onTouchStart={markInteracted}
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${colors.primary[600]}`,
            backgroundColor: colors.primary[800],
            p: { xs: 1, md: 2 },
          }}
        >
          <Plot
            data={plotTraces}
            layout={layout}
            config={{
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToRemove: ['lasso2d', 'select2d'],
              displaylogo: false,
            }}
            onRelayout={handleRelayout}
            onLegendClick={markInteracted}
            style={{ width: '100%', height: '420px' }}
            useResizeHandler
          />
          {currentRisk != null && (
            <Typography
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: colors.grey[200],
                fontSize: '0.9rem',
                backgroundColor: `${colors.primary[900]}cc`,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              Sample risk: {currentRisk.toFixed(2)}
            </Typography>
          )}
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            component={TrackedSignupLink}
            to="/login-signup?mode=signup"
            location="risk-preview"
            variant="contained"
            size="large"
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              fontWeight: 'bold',
              px: 4,
              mr: 2,
              mb: { xs: 2, sm: 0 },
              '&:hover': { backgroundColor: colors.greenAccent[400] },
            }}
          >
            Create free account, 30 seconds
          </Button>
          <Button
            component={TrackedSignupLink}
            to="/login-signup?mode=signup&plan=premium"
            location="risk-preview-premium"
            plan="premium"
            variant="outlined"
            size="large"
            sx={{
              color: colors.greenAccent[400],
              borderColor: colors.greenAccent[500],
              fontWeight: 'bold',
              px: 4,
              '&:hover': {
                borderColor: colors.greenAccent[300],
                backgroundColor: `${colors.greenAccent[900]}44`,
              },
            }}
          >
            Unlock full chart history
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default SplashRiskColorPreview;