import React, { useMemo } from 'react';
import { Box } from '@mui/material';

/**
 * Lightweight SVG sparkline for public marketing (no Plotly / LWC dependency).
 * points: [{ t, v }] — only v is required for rendering.
 */
const MiniSparkline = ({
  points = [],
  width = 160,
  height = 44,
  stroke = '#4cceac',
  fill = 'rgba(76, 206, 172, 0.12)',
  ariaLabel = 'Trend sparkline',
}) => {
  const path = useMemo(() => {
    const vals = (points || [])
      .map((p) => Number(p?.v))
      .filter((v) => Number.isFinite(v));
    if (vals.length < 2) return null;

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const padY = 3;
    const usableH = height - padY * 2;
    const stepX = width / (vals.length - 1);

    const coords = vals.map((v, i) => {
      const x = i * stepX;
      const y = padY + usableH - ((v - min) / span) * usableH;
      return [x, y];
    });

    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area, last: coords[coords.length - 1] };
  }, [points, width, height]);

  if (!path) {
    return (
      <Box
        sx={{ width, height, opacity: 0.35 }}
        aria-hidden
      />
    );
  }

  return (
    <Box
      component="svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      sx={{ display: 'block', mx: 'auto' }}
    >
      <path d={path.area} fill={fill} stroke="none" />
      <path d={path.line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={path.last[0]} cy={path.last[1]} r="2.5" fill={stroke} />
    </Box>
  );
};

export default MiniSparkline;
