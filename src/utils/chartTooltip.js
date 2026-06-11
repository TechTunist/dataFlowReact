/**
 * Position a chart tooltip near the cursor, relative to a position:relative chart container.
 * Prefers placing the tooltip to the right of the cursor when it fits (more natural for reading).
 * Only flips to the left when it would overflow the right edge.
 * Includes a small rightward bias for breathing room from the crosshair line.
 * This logic is the single source of truth for all lightweight chart tooltips.
 */
export const getTooltipPosition = ({
  x,
  y,
  chartWidth,
  tooltipWidth = 200,
  offset = 15,
  rightBias = 8,
}) => {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const width = chartWidth > 0 ? chartWidth : tooltipWidth + offset * 2;

  // Prefer right of cursor
  const candidateRight = safeX + offset + rightBias;
  let left;
  if (candidateRight + tooltipWidth <= width) {
    left = `${candidateRight}px`;
  } else {
    // Flip to left, but still apply small right bias (moves it closer to cursor)
    left = `${Math.max(offset, safeX - tooltipWidth - offset + rightBias)}px`;
  }

  const top = `${safeY + offset}px`;

  return { left, top };
};