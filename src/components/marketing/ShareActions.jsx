import React, { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import {
  absoluteUrl,
  buildTwitterIntentUrl,
  copyTextToClipboard,
  formatMarketPulseShareText,
  formatMarketPulseTweetText,
} from '../../utils/shareHelpers';
import { trackShareAction } from '../../utils/plausibleEvents';

/**
 * Copy / share controls for public growth surfaces (pulse, splash, videos).
 */
const ShareActions = ({
  colors,
  pulse = null,
  promoActive = false,
  path = '/#market-pulse',
  location = 'share-actions',
  compact = false,
}) => {
  const [status, setStatus] = useState('');

  const pageUrl = absoluteUrl(path);
  const snapshotText = formatMarketPulseShareText(pulse, { promoActive });
  const tweetText = formatMarketPulseTweetText(pulse, { promoActive });
  const twitterUrl = buildTwitterIntentUrl({ text: tweetText, url: pageUrl });

  const flash = (msg) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(''), 2200);
  };

  const onCopyLink = async () => {
    const result = await copyTextToClipboard(pageUrl);
    trackShareAction('copy_link', location);
    flash(result.ok ? 'Link copied' : 'Copy failed');
  };

  const onCopySnapshot = async () => {
    const result = await copyTextToClipboard(snapshotText);
    trackShareAction('copy_snapshot', location);
    flash(result.ok ? 'Snapshot copied' : 'Copy failed');
  };

  const onShareX = () => {
    trackShareAction('share_x', location);
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const btnSx = {
    color: colors.grey[100],
    borderColor: colors.primary[600],
    textTransform: 'none',
    fontWeight: 600,
    fontSize: compact ? '0.8rem' : '0.875rem',
    '&:hover': {
      borderColor: colors.greenAccent[500],
      backgroundColor: `${colors.greenAccent[900]}44`,
    },
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Button
          size={compact ? 'small' : 'medium'}
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={onCopyLink}
          sx={btnSx}
        >
          Copy link
        </Button>
        <Button
          size={compact ? 'small' : 'medium'}
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={onCopySnapshot}
          sx={btnSx}
        >
          Copy snapshot
        </Button>
        <Button
          size={compact ? 'small' : 'medium'}
          variant="outlined"
          startIcon={<ShareIcon fontSize="small" />}
          onClick={onShareX}
          sx={btnSx}
        >
          Share on X
        </Button>
      </Stack>
      {status && (
        <Typography sx={{ color: colors.greenAccent[400], mt: 1, fontSize: '0.8rem' }}>
          {status}
        </Typography>
      )}
    </Box>
  );
};

export default ShareActions;
