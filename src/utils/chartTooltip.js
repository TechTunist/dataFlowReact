/**
 * Position a chart tooltip near the cursor.
 * We compute screen coordinates in the caller (ChartTooltip) using getBoundingClientRect
 * so that the result is independent of any parent DOM structure, cards, sidebars, padding etc.
 *
 * Horizontal: always tries to place the tooltip a small fixed distance to the *right*
 * of the cursor (offset + rightBias). We clamp the left so the tooltip body stays
 * on screen. This guarantees a consistent "to the right of cursor" relative position
 * for all charts (the previous per-chart content-width dependent flip was the main
 * source of "300px too far left" etc. complaints).
 *
 * Vertical: prefers below the cursor; flips above only near the bottom of the viewport.
 *
 * This (plus the measurement in ChartTooltip) is the single source of truth.
 */
export const getTooltipPosition = ({
  x,
  y,
  chartWidth,
  tooltipWidth = 200,
  tooltipHeight = 100,
  offset = 15,
  rightBias = 8,
  xNudge = 0, // extra pixels to shift tooltip right (positive) or left (negative). Used for per-chart tweaks.
}) => {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const width = chartWidth > 0 ? chartWidth : tooltipWidth + offset * 2;
  const height = window.innerHeight || 800;

  // Always try to place the tooltip to the right of the cursor by a consistent
  // small amount (offset + rightBias). This makes the relative position to the
  // cursor the same for *all* charts, regardless of their tooltip content width.
  // We clamp so the tooltip stays on screen; wide tooltips will slide left
  // (potentially overlapping the cursor) only when the cursor is very close to
  // the right edge of the screen.
  const idealLeft = safeX + offset + rightBias + (xNudge || 0);
  let left = Math.min(idealLeft, width - tooltipWidth - 10);
  left = Math.max(offset, left);  // don't go off left edge of viewport/chart

  // Vertical: prefer below cursor. Use fixed assumed max height for the *decision*
  // so that above/below side is consistent regardless of actual tooltip height.
  const assumedMaxHeightForFlip = 200;
  const candidateBottom = safeY + offset;
  let top;
  if (candidateBottom + assumedMaxHeightForFlip <= height) {
    top = `${candidateBottom}px`;
  } else {
    top = `${Math.max(offset, safeY - tooltipHeight - offset)}px`;
  }

  return { left, top };
};