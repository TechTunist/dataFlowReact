import React, { useRef, useLayoutEffect, useState } from 'react';
import { getTooltipPosition } from '../utils/chartTooltip';

/**
 * Tooltip anchored to the chart container near the cursor.
 * Pass `render` (not JSX children) so content is not evaluated when tooltipData is null.
 *
 * All positioning is handled centrally here via getTooltipPosition for consistency
 * across lightweight-charts. Components must not override left/top/position via the `style` prop.
 * Use the `xNudge` prop for per-chart manual horizontal adjustments (positive = further right).
 */
const ChartTooltip = ({
  tooltipData,
  chartContainerRef,
  isNarrowScreen = false,
  tooltipWidth: tooltipWidthProp,
  xNudge = 0, // extra rightward nudge (px) for this specific tooltip. Positive moves right.
  render,
  style = {},
}) => {
  const tooltipRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(null);
  const [measuredHeight, setMeasuredHeight] = useState(null);

  // Measure real rendered size on data change for better "will it fit" decisions.
  // This reduces inconsistency caused by assuming a fixed size when actual content differs.
  // Must be called unconditionally (before any early returns).
  useLayoutEffect(() => {
    if (!tooltipData || !tooltipRef.current) return;
    const w = tooltipRef.current.offsetWidth;
    const h = tooltipRef.current.offsetHeight;
    if (w > 0 && w !== measuredWidth) {
      setMeasuredWidth(w);
    }
    if (h > 0 && h !== measuredHeight) {
      setMeasuredHeight(h);
    }
  }, [tooltipData, measuredWidth, measuredHeight]);

  if (!tooltipData) return null;

  const containerEl = chartContainerRef?.current;
  if (!containerEl) return null;

  const rect = containerEl.getBoundingClientRect();
  const screenX = rect.left + (tooltipData.x || 0);
  const screenY = rect.top + (tooltipData.y || 0);

  const defaultTooltipWidth = tooltipWidthProp ?? (isNarrowScreen ? 150 : 200);
  // Prefer measured actual width (more accurate flip logic when content varies)
  const tooltipWidth = measuredWidth || defaultTooltipWidth;

  // Compute position using screen coordinates of the cursor point (via rect + point).
  // This makes the tooltip offset from the actual cursor the same on screen,
  // regardless of any parent layouts, paddings, cards, relative containers, or page structure.
  // Uses the shared getTooltipPosition for the flip + bias logic.
  const position = getTooltipPosition({
    x: screenX,
    y: screenY,
    chartWidth: window.innerWidth || 1200,
    tooltipWidth,
    tooltipHeight: measuredHeight || 120,
    xNudge,
  });

  // Force central positioning using fixed (screen coords); user `style` can only provide visual overrides.
  // This prevents per-component style.left/top from creating inconsistent behavior.
  const forcedStyle = {
    position: 'fixed',
    left: position.left,
    top: position.top,
    width: tooltipWidth,
    fontSize: isNarrowScreen ? '12px' : '14px',
    pointerEvents: 'none',
    zIndex: 1000,
  };

  return (
    <div
      ref={tooltipRef}
      className="tooltip"
      style={{
        ...style,
        ...forcedStyle,
      }}
    >
      {render(tooltipData)}
    </div>
  );
};

export default ChartTooltip;