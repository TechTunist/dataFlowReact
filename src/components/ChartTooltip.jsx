import { getTooltipPosition } from '../utils/chartTooltip';

/**
 * Tooltip anchored to the chart container near the cursor.
 * Pass `render` (not JSX children) so content is not evaluated when tooltipData is null.
 */
const ChartTooltip = ({
  tooltipData,
  chartContainerRef,
  isNarrowScreen = false,
  tooltipWidth: tooltipWidthProp,
  render,
  style = {},
}) => {
  if (!tooltipData) return null;

  const chartWidth = chartContainerRef?.current?.clientWidth ?? 0;
  if (!chartWidth) return null;

  const tooltipWidth = tooltipWidthProp ?? (isNarrowScreen ? 150 : 200);
  const position = getTooltipPosition({
    x: tooltipData.x,
    y: tooltipData.y,
    chartWidth,
    tooltipWidth,
  });

  return (
    <div
      className="tooltip"
      style={{
        position: 'absolute',
        ...position,
        width: tooltipWidth,
        fontSize: isNarrowScreen ? '12px' : '14px',
        pointerEvents: 'none',
        zIndex: 1000,
        ...style,
      }}
    >
      {render(tooltipData)}
    </div>
  );
};

export default ChartTooltip;