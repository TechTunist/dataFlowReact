/**
 * Position a chart tooltip near the cursor, relative to a position:relative chart container.
 */
export const getTooltipPosition = ({
  x,
  y,
  chartWidth,
  tooltipWidth = 200,
  offset = 12,
}) => {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const width = chartWidth > 0 ? chartWidth : tooltipWidth + offset * 2;

  const left =
    safeX < width / 2
      ? `${safeX + offset}px`
      : `${Math.max(offset, safeX - tooltipWidth - offset)}px`;

  const top = `${safeY + offset}px`;

  return { left, top };
};