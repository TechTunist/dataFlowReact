import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EducationalDisclaimer from './EducationalDisclaimer';
import NewsletterEmbed from './NewsletterEmbed';

export const HUNDRED_DAY_WINDOW_YOUTUBE_ID = 'HecEFCo5opg';
export const HUNDRED_DAY_WINDOW_YOUTUBE_START_SEC = 33;
export const HUNDRED_DAY_WINDOW_YOUTUBE_WATCH_URL = `https://www.youtube.com/watch?v=${HUNDRED_DAY_WINDOW_YOUTUBE_ID}&t=${HUNDRED_DAY_WINDOW_YOUTUBE_START_SEC}s`;

const embedSrc = `https://www.youtube-nocookie.com/embed/${HUNDRED_DAY_WINDOW_YOUTUBE_ID}?start=${HUNDRED_DAY_WINDOW_YOUTUBE_START_SEC}&rel=0`;

const HundredDayWindowOriginStory = ({ colors }) => (
  <Box
    component="section"
    sx={{
      width: '100%',
      py: { xs: 6, md: 8 },
      backgroundColor: colors.primary[800],
      borderTop: `1px solid ${colors.primary[600]}`,
      borderBottom: `1px solid ${colors.primary[600]}`,
    }}
  >
    <Container maxWidth="lg">
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
        <MailOutlineIcon sx={{ color: colors.greenAccent[500] }} />
        <Chip
          label="Cryptological Newsletter #1 · 29 August 2025"
          sx={{
            backgroundColor: colors.greenAccent[900],
            color: colors.greenAccent[300],
            fontWeight: 600,
          }}
        />
      </Stack>

      <Typography
        component="h2"
        variant="h2"
        sx={{
          color: colors.grey[100],
          fontWeight: 'bold',
          fontSize: { xs: '1.6rem', md: '2.1rem' },
          textAlign: 'center',
          mb: 2,
          lineHeight: 1.25,
        }}
      >
        Where the 100-Day Window story started
      </Typography>

      <Typography
        sx={{
          color: colors.grey[300],
          fontSize: { xs: '1.05rem', md: '1.12rem' },
          lineHeight: 1.8,
          maxWidth: 760,
          mx: 'auto',
          textAlign: 'center',
          mb: 5,
        }}
      >
        The very first Cryptological newsletter already showed Market Overview cycle-length indicators
        clustering around October 2025, weeks before the 6 October bull-market top. That public snapshot
        is part of why we are running a free weekend to help people explore the same historical toolkit
        during another post-peak phase many prior cycles shared.
      </Typography>

      <Grid container spacing={4} alignItems="stretch" sx={{ mb: 5 }}>
        <Grid item xs={12} md={6}>
          <NewsletterEmbed colors={colors} />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              backgroundColor: colors.primary[900],
              border: `1px solid ${colors.primary[600]}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <PlayCircleOutlineIcon sx={{ color: colors.greenAccent[500] }} />
                <Typography variant="h6" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                  9 October 2025: indicator hit zero
                </Typography>
              </Stack>
              <Typography sx={{ color: colors.grey[300], lineHeight: 1.75, mb: 2 }}>
                On <strong style={{ color: colors.grey[100] }}>9 October 2025</strong>, only two to three
                days after the 6 October cycle top, one Market Overview cycle-length indicator (days left from halving)
                showed <strong style={{ color: colors.grey[100] }}>0 days left til cycle bottom</strong>.
                Matthew recorded a short video explaining the significance of this event, and how risk was not
                expected to reach previous highs, as well as the condition of other indicators at the time.
              </Typography>
              <Typography sx={{ color: colors.grey[400], fontSize: '0.9rem', lineHeight: 1.7, mb: 2 }}>
                The clip below starts at 0:33, where the on-screen indicator reads zero and the context
                is explained. It is a walkthrough of methodology, not a trading signal.
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: `1px solid ${colors.primary[500]}`,
                  backgroundColor: colors.primary[700],
                }}
              >
                <Box
                  component="iframe"
                  title="Cryptological: cycle-length indicator at zero days (9 October 2025 context)"
                  src={embedSrc}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                  }}
                />
              </Box>
              <Button
                component="a"
                href={HUNDRED_DAY_WINDOW_YOUTUBE_WATCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
                sx={{
                  mt: 2,
                  color: colors.greenAccent[400],
                  textTransform: 'none',
                  fontWeight: 600,
                  p: 0,
                  minWidth: 0,
                  '&:hover': { color: colors.greenAccent[300], backgroundColor: 'transparent' },
                }}
              >
                Watch on YouTube (starts at 0:33)
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box
        sx={{
          maxWidth: 760,
          mx: 'auto',
          textAlign: 'center',
          p: { xs: 3, md: 4 },
          borderRadius: 2,
          backgroundColor: colors.primary[900],
          border: `1px solid ${colors.greenAccent[800]}`,
        }}
      >
        <Typography variant="h6" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 1.5 }}>
          Why we are opening a free weekend
        </Typography>
        <Typography sx={{ color: colors.grey[300], lineHeight: 1.8, mb: 2 }}>
          Post-peak stretches have historically been when cycle analysts do their quiet work: reviewing
          on-chain data, comparing prior bears, and tracking how long drawdowns lasted. The 100-Day Window
          page exists to explain that context in public. Ahead of our{' '}
          <strong style={{ color: colors.grey[100] }}>free weekend</strong> (full chart access, sign-in
          required, no payment), we want newcomers to explore the same indicators, Market Overview widgets,
          and methodology for themselves, with no obligation to subscribe afterward.
        </Typography>
        <Typography sx={{ color: colors.grey[500], fontSize: '0.9rem', lineHeight: 1.7 }}>
          Past cycles varied in length and depth. Studying them is educational; it is not a promise of
          future returns.
        </Typography>
      </Box>

      <EducationalDisclaimer colors={colors} />
    </Container>
  </Box>
);

export default HundredDayWindowOriginStory;