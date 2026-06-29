import React, { useMemo } from 'react';
import { Box, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export const NEWSLETTER_1_ARCHIVE_SRC = '/newsletters/issue-1.pdf';

const DEFAULT_HEIGHT = { xs: 420, sm: 520 };

/** Scrollable in-frame PDF preview plus link to open full file. */
const NewsletterEmbed = ({
  src = NEWSLETTER_1_ARCHIVE_SRC,
  title = 'Cryptological Newsletter #1, 29 August 2025',
  colors,
  height = DEFAULT_HEIGHT,
  openLabel = 'Open PDF in new tab',
}) => {
  const iframeSrc = useMemo(() => `${src}#view=FitH&toolbar=0&navpanes=0`, [src]);

  return (
    <Box>
      <Box
        sx={{
          height,
          borderRadius: 1.5,
          overflow: 'hidden',
          border: `1px solid ${colors.primary[500]}`,
          backgroundColor: colors.primary[700],
        }}
      >
        <Box
          component="iframe"
          src={iframeSrc}
          title={title}
          sx={{
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
          }}
        />
      </Box>
      <Button
        component="a"
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<OpenInNewIcon />}
        sx={{
          mt: 1.5,
          color: colors.greenAccent[400],
          textTransform: 'none',
          fontWeight: 600,
          p: 0,
          minWidth: 0,
          '&:hover': { color: colors.greenAccent[300], backgroundColor: 'transparent' },
        }}
      >
        {openLabel}
      </Button>
    </Box>
  );
};

export default NewsletterEmbed;