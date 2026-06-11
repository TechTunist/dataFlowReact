import React, { useRef, useLayoutEffect, useState } from 'react';
import { getTooltipPosition } from '../utils/chartTooltip';

/**
 * Tooltip anchored to the chart container near the cursor.
 * Pass `render` (not JSX children) so content is not evaluated when tooltipData is null.
 *
 * All positioning is handled centrally here via getTooltipPosition for consistency
 * across lightweight-charts. Components must not override left/top/position via the `style` prop.
 */
const ChartTooltip = ({
  tooltipData,
  chartContainerRef,
  isNarrowScreen = false,
  tooltipWidth: tooltipWidthProp,
  render,
  style = {},
}) => {
  const tooltipRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(null);

  // Measure real rendered width on data change for better "will it fit" decisions.
  // This reduces inconsistency caused by assuming a fixed width when actual content differs.
  // Must be called unconditionally (before any early returns).
  useLayoutEffect(() => {
    if (!tooltipData || !tooltipRef.current) return;
    const w = tooltipRef.current.offsetWidth;
    if (w > 0 && w !== measuredWidth) {
      setMeasuredWidth(w);
    }
  }, [tooltipData, measuredWidth]);

  if (!tooltipData) return null;

  const chartWidth = chartContainerRef?.current?.clientWidth ?? 0;
  if (!chartWidth) return null;

  const defaultTooltipWidth = tooltipWidthProp ?? (isNarrowScreen ? 150 : 200);
  // Prefer measured actual width (more accurate flip logic when content varies)
  const tooltipWidth = measuredWidth || defaultTooltipWidth;

  const position = getTooltipPosition({
    x: tooltipData.x,
    y: tooltipData.y,
    chartWidth,
    tooltipWidth,
  });

  // Force central positioning; user `style` can only provide visual overrides.
  // This prevents per-component style.left/top from creating inconsistent behavior.
  const forcedStyle = {
    position: 'absolute',
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