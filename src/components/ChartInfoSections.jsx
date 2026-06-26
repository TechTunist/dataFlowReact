import React from 'react';
import { ChartInfo } from './ChartUnderSection';

/**
 * FEI-style chart description: bold section headings with paragraph breaks.
 * Pass only the sections that fit each chart (e.g. What it is, How to interpret).
 */
export const ChartInfoSections = ({
  sections,
  sx,
  className = '',
  component = 'p',
}) => (
  <ChartInfo sx={sx} className={className} component={component}>
    {sections.map((section, i) => (
      <React.Fragment key={section.title || i}>
        {i > 0 && (
          <>
            <br />
            <br />
          </>
        )}
        {section.title && (
          <>
            <strong>{section.title}:</strong>
            {' '}
          </>
        )}
        {section.content}
      </React.Fragment>
    ))}
  </ChartInfo>
);

export default ChartInfoSections;