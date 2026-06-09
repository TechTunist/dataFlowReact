import React from 'react';
import { Box } from '@mui/material';

/**
 * Centralized under-chart "written sections" primitives.
 *
 * Use these (or the matching CSS classes directly) so that font sizes,
 * spacing, line-heights, and layout for:
 *   - the LastUpdated + side-value row
 *   - current-value callouts (e.g. "Current Heat Index: 73")
 *   - scrollable meta/legend lists (activetrends, indicators, factors)
 *   - the main .chart-info explanatory text
 * can be adjusted in *one* place (this file + bitcoinChart.css).
 *
 * The CSS classes (in bitcoinChart.css) own the text sizing:
 *   .under-chart-row, .under-chart-section, .under-chart-value,
 *   .under-chart-scroll, .chart-info
 *
 * These wrappers just attach the classes + a couple of common props
 * (like responsive maxHeight for the scroll area, and the theme-driven
 * border color via CSS var).
 */

export const UnderChartRow = ({ children, className = '', style = {}, ...rest }) => (
  <div
    className={`under-chart-row ${className}`.trim()}
    style={style}
    {...rest}
  >
    {children}
  </div>
);

/**
 * The bordered container for the whole under-chart written area.
 * Pass borderColor (e.g. colors.primary[500]) to drive the top border.
 * Any additional color or layout can be passed via sx or style.
 */
export const ChartUnderSection = ({ children, borderColor, sx, style = {}, className = '', ...rest }) => (
  <Box
    className={`under-chart-section ${className}`.trim()}
    sx={sx}
    style={{
      ...(borderColor ? { '--under-chart-border': borderColor } : {}),
      ...style,
    }}
    {...rest}
  >
    {children}
  </Box>
);

/**
 * Prominent current-value line (see Market Heat Index for the reference pattern).
 * Example:
 *   <UnderChartValue>
 *     <Typography variant="h6" ...>Current Foo: <b style={{color}}>{val}</b></Typography>
 *   </UnderChartValue>
 */
export const UnderChartValue = ({ children, className = '', ...rest }) => (
  <div className={`under-chart-value ${className}`.trim()} {...rest}>
    {children}
  </div>
);

/**
 * Scrollable area for the smaller "legend / active items / short descriptions" text.
 * The font-size (0.95rem), line-height, etc. live in the CSS class.
 * maxHeight is usually passed per-chart because list length varies.
 */
export const UnderChartScroll = ({ children, maxHeight, sx = {}, className = '', ...rest }) => (
  <Box
    className={`under-chart-scroll ${className}`.trim()}
    sx={{ maxHeight, ...sx }}
    {...rest}
  >
    {children}
  </Box>
);

/**
 * Convenience: the main long description paragraph.
 * It receives the .chart-info class (larger / more prominent than the scroll text).
 */
export const ChartInfo = ({ children, className = '', sx, component = 'p', ...rest }) => (
  <Box
    component={component}
    className={`chart-info ${className}`.trim()}
    sx={sx}
    {...rest}
  >
    {children}
  </Box>
);

export default ChartUnderSection;