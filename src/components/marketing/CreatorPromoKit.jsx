import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  absoluteUrl,
  copyTextToClipboard,
  DEFAULT_SHARE_PATHS,
  formatCreatorScriptOutline,
  getCreatorTalkingPoints,
} from '../../utils/shareHelpers';
import { isOpenAccessPromoActive } from '../../config/openAccessPromo';
import { trackShareAction } from '../../utils/plausibleEvents';
import TrackedSignupLink from './TrackedSignupLink';

/**
 * Promo-video / content toolkit for driving signups.
 * Talk points, copyable script, and deep links (no paid tools).
 */
const CreatorPromoKit = ({ colors }) => {
  const promoActive = isOpenAccessPromoActive();
  const points = getCreatorTalkingPoints(promoActive);
  const [status, setStatus] = useState('');

  const flash = (msg) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(''), 2200);
  };

  const copyScript = async () => {
    const text = formatCreatorScriptOutline(promoActive);
    const result = await copyTextToClipboard(text);
    trackShareAction('copy_creator_script', 'creator-kit');
    flash(result.ok ? 'Script outline copied' : 'Copy failed');
  };

  const copySignupLink = async () => {
    const result = await copyTextToClipboard(absoluteUrl(DEFAULT_SHARE_PATHS.signup));
    trackShareAction('copy_signup_link', 'creator-kit');
    flash(result.ok ? 'Signup link copied' : 'Copy failed');
  };

  return (
    <Box
      id="creator-kit"
      component="section"
      sx={{
        width: '100%',
        py: { xs: 6, md: 8 },
        backgroundColor: colors.primary[800],
        borderTop: `1px solid ${colors.primary[700]}`,
        scrollMarginTop: '96px',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip
            label="Internal · Promo video kit (not for public visitors)"
            sx={{
              mb: 2,
              backgroundColor: colors.greenAccent[900],
              color: colors.greenAccent[300],
              fontWeight: 600,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              mb: 1.5,
              fontSize: { xs: '1.75rem', md: '2.35rem' },
            }}
          >
            Creator kit for your promo
          </Typography>
          <Typography sx={{ color: colors.grey[300], maxWidth: 720, mx: 'auto', lineHeight: 1.6 }}>
            Private toolkit for your videos. Enable with REACT_APP_SHOW_CREATOR_KIT=true.
            Talking points so cold viewers hear limited free access, free-account signup, and what unlocks after sign-up.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {points.map((p, i) => (
            <Grid item xs={12} md={6} key={p.title}>
              <Card
                sx={{
                  height: '100%',
                  backgroundColor: colors.primary[900],
                  border: `1px solid ${colors.primary[600]}`,
                }}
              >
                <CardContent>
                  <Typography sx={{ color: colors.greenAccent[400], fontWeight: 800, mb: 1 }}>
                    {i + 1}. {p.title}
                  </Typography>
                  <Typography sx={{ color: colors.grey[300], lineHeight: 1.65, fontSize: '0.95rem' }}>
                    {p.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="center"
          alignItems="center"
          sx={{ mt: 4 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={copyScript}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              fontWeight: 'bold',
              '&:hover': { backgroundColor: colors.greenAccent[400] },
            }}
          >
            Copy full script outline
          </Button>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={copySignupLink}
            sx={{
              color: colors.grey[100],
              borderColor: colors.primary[600],
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { borderColor: colors.greenAccent[500] },
            }}
          >
            Copy signup link
          </Button>
          <Button
            component={TrackedSignupLink}
            to="/login-signup?mode=signup"
            location="creator-kit-signup"
            variant="text"
            sx={{ color: colors.greenAccent[400], textTransform: 'none' }}
          >
            Open signup page
          </Button>
        </Stack>
        {status && (
          <Typography sx={{ color: colors.greenAccent[400], mt: 1.5, textAlign: 'center', fontSize: '0.85rem' }}>
            {status}
          </Typography>
        )}
        <Typography sx={{ color: colors.grey[500], mt: 2, textAlign: 'center', fontSize: '0.8rem' }}>
          Deep links: {absoluteUrl('/#market-pulse')} · {absoluteUrl('/chart-gallery')} ·{' '}
          {absoluteUrl('/100-day-window')}
        </Typography>
      </Container>
    </Box>
  );
};

export default CreatorPromoKit;
