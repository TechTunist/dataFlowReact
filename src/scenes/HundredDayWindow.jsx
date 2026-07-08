import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimelineIcon from '@mui/icons-material/Timeline';
import InsightsIcon from '@mui/icons-material/Insights';
import HistoryIcon from '@mui/icons-material/History';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import Navbar from './global/SplashNavBar.jsx';
import SeoHead from '../components/SeoHead';
import SeoPublicFooter from './seo/SeoPublicFooter';
import { SEO_PAGES } from '../seo/staticPageContent';
import TrackedSignupLink from '../components/marketing/TrackedSignupLink';
import StickySignupCta from '../components/marketing/StickySignupCta';
import HundredDayWindowBanner, { HUNDRED_DAY_WINDOW_BANNER_HEIGHT } from '../components/marketing/HundredDayWindowBanner';
import HundredDayWindowOriginStory from '../components/marketing/HundredDayWindowOriginStory';
import EducationalDisclaimer from '../components/marketing/EducationalDisclaimer';
import FreePremiumAccessSticker from '../components/marketing/FreePremiumAccessSticker';
import {
  getHeroPricingHint,
  isOpenAccessPromoActive,
  OPEN_ACCESS_PROMO,
} from '../config/openAccessPromo';
import { useData } from '../DataContext';
import {
  ALTERNATIVE_PROJECTIONS,
  AVG_DAYS_TOP_TO_BOTTOM,
  BOTTOM_TO_BOTTOM_AVG_DAYS,
  HISTORICAL_BOTTOM_TO_BOTTOM,
  HISTORICAL_TOP_TO_BOTTOM,
  PROJECTED_BOTTOM_DATE,
  THREE_CYCLE_AVG_TOP_TO_BOTTOM,
  formatCycleDate,
  getCycleBottomDaysLeft,
  getBtcReferenceDate,
} from '../utility/cycleBottomDaysLeft';
import '../styling/splashPage.css';

const FREE_SIGNUP = '/login-signup?mode=signup';
const NAVBAR_HEIGHT = { xs: 64, sm: 80 };

const pageSeo = SEO_PAGES['100-day-window'];

const PROJECTION_METHODS = [
  {
    label: '3-cycle top → bottom',
    avg: `${THREE_CYCLE_AVG_TOP_TO_BOTTOM} days`,
    projected: formatCycleDate(ALTERNATIVE_PROJECTIONS.threeCycleTopToBottom),
    note: '407 + 363 + 376, divided by 3',
  },
  {
    label: 'Bottom → bottom',
    avg: `${BOTTOM_TO_BOTTOM_AVG_DAYS} days`,
    projected: formatCycleDate(ALTERNATIVE_PROJECTIONS.bottomToBottom),
    note: 'From the Nov 2022 low, using avg spacing between lows',
  },
  {
    label: '2-cycle top → bottom (ours)',
    avg: `${AVG_DAYS_TOP_TO_BOTTOM} days`,
    projected: formatCycleDate(PROJECTED_BOTTOM_DATE),
    note: 'Last two bears only, the working countdown',
    highlight: true,
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is this a price prediction?',
    a: 'No. These are historical averages, a compass, not a crystal ball. The three methods above cluster around late October 2026, but the actual bottom could arrive earlier or later. Use it as context for preparation, not as trading advice.',
  },
  {
    q: 'Why measure from the October 2025 peak?',
    a: 'After a major bull-market top, the relevant question is how far through the typical post-peak drawdown we are. We use 6 October 2025 as the Cycle 4 top, the same anchor in our Market Cycles chart and Market Overview widget.',
  },
  {
    q: 'Why use 370 days instead of 382?',
    a: 'All three completed top→bottom phases average 382 days (~23 Oct 2026). We deliberately use only the last two (363 + 376 → 370 days → ~11 Oct 2026) because that average errs on the side of caution: better to be looking early than to miss the bottom. That reflects a personal study habit, not a recommendation to buy or sell.',
  },
  {
    q: 'Where do I see the live countdown?',
    a: 'The banner at the top of this site updates daily. After a free signup, the same counter appears on Market Cycles (with this full methodology). Market Overview shows the same 370-day countdown in its cycle widget.',
  },
];

const HundredDayWindow = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const promoActive = isOpenAccessPromoActive();
  const { btcData } = useData();

  const cycleStats = useMemo(() => {
    return getCycleBottomDaysLeft(getBtcReferenceDate(btcData));
  }, [btcData]);

  const sectionCardSx = {
    backgroundColor: colors.primary[800],
    border: `1px solid ${colors.primary[600]}`,
    height: '100%',
  };

  return (
    <Box
      className="splash-page"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: colors.primary[900],
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        pt: {
          xs: `${HUNDRED_DAY_WINDOW_BANNER_HEIGHT.xs + NAVBAR_HEIGHT.xs}px`,
          sm: `${HUNDRED_DAY_WINDOW_BANNER_HEIGHT.sm + NAVBAR_HEIGHT.sm}px`,
        },
      }}
    >
      <SeoHead
        title={pageSeo.title}
        description={pageSeo.description}
        path="/100-day-window"
        keywords={pageSeo.keywords}
      />
      <HundredDayWindowBanner colors={colors} linkTo={null} />
      <Navbar colors={colors} topOffset={HUNDRED_DAY_WINDOW_BANNER_HEIGHT} />
      <StickySignupCta
        colors={colors}
        signupPath={FREE_SIGNUP}
        label={promoActive ? 'Sign up free (limited access)' : 'Sign up free, see the countdown live'}
      />

      {/* Hero */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          width: '100%',
          py: { xs: 6, md: 8 },
          background: `linear-gradient(180deg, ${colors.primary[900]} 0%, ${colors.primary[800]} 100%)`,
        }}
      >
        <FreePremiumAccessSticker corner="top-right" />
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Chip
            label={
              promoActive
                ? OPEN_ACCESS_PROMO.limitedAccessChip
                : 'Public guide · No account required'
            }
            sx={{
              mb: 2,
              backgroundColor: colors.greenAccent[800],
              color: colors.greenAccent[300],
              fontWeight: 600,
            }}
          />
          <Typography
            component="h1"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' },
              lineHeight: 1.2,
              mb: 2,
            }}
          >
            {pageSeo.h1}
          </Typography>
          {promoActive && (
            <Typography sx={{ color: colors.grey[400], mb: 2, fontSize: '0.95rem', lineHeight: 1.6 }}>
              {OPEN_ACCESS_PROMO.bannerSubtext} {getHeroPricingHint(true)}
            </Typography>
          )}
          <Typography
            sx={{
              color: colors.grey[300],
              fontSize: { xs: '1.05rem', md: '1.2rem' },
              lineHeight: 1.7,
              maxWidth: 640,
              mx: 'auto',
              mb: 4,
            }}
          >
            History shows the biggest opportunities in Bitcoin often arrive in the quietest stretches,
            the months after a bull-market top, while most of the crowd has moved on. This page explains
            the countdown you see on Cryptological and how we calculate it.
          </Typography>

          <Box
            sx={{
              display: 'inline-block',
              px: { xs: 3, sm: 5 },
              py: { xs: 3, sm: 4 },
              borderRadius: 2,
              backgroundColor: colors.primary[700],
              border: `1px solid ${colors.primary[500]}`,
              mb: 3,
            }}
          >
            <Typography sx={{ color: colors.grey[400], fontSize: '0.95rem', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Days left til cycle bottom
            </Typography>
            <Typography
              sx={{
                color: colors.greenAccent[500],
                fontWeight: 'bold',
                fontSize: { xs: '3.5rem', sm: '4.5rem' },
                lineHeight: 1,
              }}
            >
              {cycleStats.daysLeft}
            </Typography>
            <Typography sx={{ color: colors.grey[400], fontSize: '0.9rem', mt: 1 }}>
              {cycleStats.daysElapsed} days since peak · {AVG_DAYS_TOP_TO_BOTTOM}-day avg · projected ~{formatCycleDate(PROJECTED_BOTTOM_DATE)}
            </Typography>
          </Box>

          <Typography sx={{ color: colors.grey[500], fontSize: '0.9rem', fontStyle: 'italic' }}>
            Not financial advice. Backtests are historical. Averages are not guarantees.
          </Typography>
        </Container>
      </Box>

      <HundredDayWindowOriginStory colors={colors} />

      {/* Core idea */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            fontWeight: 'bold',
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            mb: 2,
            textAlign: 'center',
          }}
        >
          What the 100-day window means
        </Typography>
        <Typography
          sx={{
            color: colors.grey[300],
            fontSize: '1.1rem',
            lineHeight: 1.8,
            maxWidth: 720,
            mx: 'auto',
            textAlign: 'center',
            mb: 5,
          }}
        >
          After each major bull-market top, Bitcoin has historically spent roughly a year in drawdown
          before the next cycle low. The countdown tracks days remaining on our working estimate,
          measured from the October 2025 peak, targeting ~11 October 2026.
        </Typography>

        <Grid container spacing={3}>
          {[
            {
              icon: <TimelineIcon sx={{ fontSize: 40, color: colors.greenAccent[500] }} />,
              title: 'A preparation window',
              text: 'When the counter reads ~100 days, you are entering the final third of the typical post-peak phase, historically a period when patient holders could study the market without the noise of a raging bull run.',
            },
            {
              icon: <HistoryIcon sx={{ fontSize: 40, color: colors.greenAccent[500] }} />,
              title: 'Grounded in past cycles',
              text: 'Three methods point to late October 2026. We use the shortest credible top→bottom average (370 days from the last two bears) as our working line, transparent, auditable, and intentionally forward-leaning.',
            },
            {
              icon: <InsightsIcon sx={{ fontSize: 40, color: colors.greenAccent[500] }} />,
              title: 'Tools for the quiet phase',
              text: 'Cryptological bundles cycle charts, on-chain metrics, risk indicators, and macro overlays so you can watch structure form, the same toolkit serious analysts use, without Glassnode prices.',
            },
          ].map((item) => (
            <Grid item xs={12} md={4} key={item.title}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>{item.icon}</Box>
                  <Typography variant="h6" sx={{ color: colors.greenAccent[400], mb: 1.5, fontWeight: 'bold' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: colors.grey[300], lineHeight: 1.7 }}>{item.text}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* The math */}
      <Box sx={{ width: '100%', backgroundColor: colors.primary[800], py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Typography
            variant="h2"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', md: '2rem' },
              mb: 3,
            }}
          >
            How we calculate it
          </Typography>
          <Typography sx={{ color: colors.grey[300], lineHeight: 1.8, mb: 3 }}>
            <strong style={{ color: colors.grey[100] }}>Anchor:</strong> 6 October 2025, the Cycle 4 bull-market top.
          </Typography>

          <Typography sx={{ color: colors.grey[200], fontWeight: 600, mb: 1.5 }}>
            Top → bottom (all three completed phases)
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {HISTORICAL_TOP_TO_BOTTOM.map((bear) => (
              <Box
                key={bear.bottom}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  alignItems: 'center',
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  backgroundColor: colors.primary[700],
                  border: `1px solid ${colors.primary[600]}`,
                }}
              >
                <Typography sx={{ color: colors.grey[200], fontWeight: 600 }}>{bear.top}</Typography>
                <Typography sx={{ color: colors.grey[500] }}>→</Typography>
                <Typography sx={{ color: colors.grey[200], fontWeight: 600 }}>{bear.bottom}</Typography>
                <Chip
                  label={`${bear.days} days`}
                  size="small"
                  sx={{ backgroundColor: colors.greenAccent[900], color: colors.greenAccent[300], fontWeight: 600 }}
                />
              </Box>
            ))}
          </Stack>
          <Typography sx={{ color: colors.grey[300], lineHeight: 1.8, mb: 4 }}>
            Average of all three: <strong style={{ color: colors.grey[100] }}>{THREE_CYCLE_AVG_TOP_TO_BOTTOM} days</strong> → projected bottom ~{formatCycleDate(ALTERNATIVE_PROJECTIONS.threeCycleTopToBottom)}.
          </Typography>

          <Typography sx={{ color: colors.grey[200], fontWeight: 600, mb: 1.5 }}>
            Bottom → bottom
          </Typography>
          <Typography sx={{ color: colors.grey[300], lineHeight: 1.8, mb: 2 }}>
            Cycle lows clustered on 15 Jan 2015, 15 Dec 2018, and 21 Nov 2022. The average spacing between successive bottoms is{' '}
            <strong style={{ color: colors.grey[100] }}>{BOTTOM_TO_BOTTOM_AVG_DAYS} days</strong>, projecting ~{formatCycleDate(ALTERNATIVE_PROJECTIONS.bottomToBottom)} from the 2022 low.
          </Typography>
          <Stack spacing={1} sx={{ mb: 4 }}>
            {HISTORICAL_BOTTOM_TO_BOTTOM.map((span) => (
              <Typography key={span.from} sx={{ color: colors.grey[400], fontSize: '0.95rem' }}>
                {span.from} → {span.to}
              </Typography>
            ))}
          </Stack>

          <Typography sx={{ color: colors.grey[200], fontWeight: 600, mb: 2 }}>
            Three estimates, one countdown
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 4 }}>
            {PROJECTION_METHODS.map((method) => (
              <Box
                key={method.label}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  backgroundColor: method.highlight ? colors.greenAccent[900] : colors.primary[700],
                  border: `1px solid ${method.highlight ? colors.greenAccent[700] : colors.primary[600]}`,
                }}
              >
                <Typography sx={{ color: colors.grey[100], fontWeight: 700 }}>{method.label}</Typography>
                <Typography sx={{ color: colors.grey[300], fontSize: '0.95rem' }}>
                  {method.avg} → ~{method.projected} · {method.note}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Typography sx={{ color: colors.grey[300], lineHeight: 1.8 }}>
            <strong style={{ color: colors.grey[100] }}>Live formula:</strong> days left = {AVG_DAYS_TOP_TO_BOTTOM} − days elapsed since the peak. The counter updates daily. It reaches zero once that window passes, whether or not the market has actually bottomed.
          </Typography>
        </Container>
      </Box>

      {/* Why 11 October */}
      <Box
        component="section"
        sx={{
          width: '100%',
          py: { xs: 6, md: 8 },
          backgroundColor: colors.primary[900],
          borderTop: `1px solid ${colors.primary[600]}`,
          borderBottom: `1px solid ${colors.primary[600]}`,
        }}
      >
        <Container maxWidth="md">
          <Typography
            component="h2"
            variant="h2"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              mb: 3,
              textAlign: 'center',
              lineHeight: 1.25,
            }}
          >
            Why 11 October?
          </Typography>
          <Typography
            sx={{
              color: colors.grey[300],
              fontSize: { xs: '1.05rem', md: '1.12rem' },
              lineHeight: 1.85,
              mb: 2.5,
            }}
          >
            The three projection methods cluster within two weeks in late October 2026. We use the{' '}
            <strong style={{ color: colors.grey[100] }}>{AVG_DAYS_TOP_TO_BOTTOM}-day line (~11 Oct)</strong>{' '}
            as our working countdown because that figure is the average top-to-bottom length across the{' '}
            <strong style={{ color: colors.grey[100] }}>last two completed cycles</strong> (363 days from
            the 2017 top and 376 days from the 2021 top). It deliberately errs on the side of caution: it
            is better to be looking early, studying structure and on-chain context ahead of the window,
            than to hold out for a later historical average and risk missing the bottom entirely.
          </Typography>
          <Typography sx={{ color: colors.grey[400], fontSize: '0.95rem', lineHeight: 1.75 }}>
            That is the creator&apos;s personal framing for educational context only, not financial advice.
            Past cycles varied in length; no method guarantees when the next low arrives.
          </Typography>
        </Container>
      </Box>

      {/* FAQ */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', md: '2rem' },
            mb: 3,
            textAlign: 'center',
          }}
        >
          Common questions
        </Typography>
        {FAQ_ITEMS.map((item) => (
          <Accordion
            key={item.q}
            sx={{
              backgroundColor: colors.primary[800],
              border: `1px solid ${colors.primary[600]}`,
              mb: 1.5,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.grey[300] }} />}>
              <Typography sx={{ color: colors.grey[100], fontWeight: 600 }}>{item.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: colors.grey[300], lineHeight: 1.7 }}>{item.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>

      {/* CTA */}
      <Box
        sx={{
          width: '100%',
          py: { xs: 8, md: 10 },
          textAlign: 'center',
          background: `linear-gradient(135deg, ${colors.greenAccent[900]} 0%, ${colors.primary[800]} 100%)`,
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 2 }}>
            Track the window on your dashboard
          </Typography>
          <Typography sx={{ color: colors.grey[300], mb: 4, lineHeight: 1.7 }}>
            {promoActive
              ? 'Limited free access for free accounts (email + password). See the countdown inside Market Cycles and Market Overview, with risk metrics, MVRV, and macro overlays, no card required during the promo.'
              : 'Sign up free, no card required, and see the same countdown inside Market Cycles and Market Overview, alongside risk metrics, MVRV, and macro overlays.'}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              component={TrackedSignupLink}
              to={FREE_SIGNUP}
              location="100-day-window-bottom"
              variant="contained"
              size="large"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                fontWeight: 'bold',
                px: 4,
                '&:hover': { backgroundColor: colors.greenAccent[400] },
              }}
            >
              {promoActive ? 'Sign up free with email' : 'Create free account'}
            </Button>
            <Button
              component={Link}
              to="/#market-pulse"
              variant="outlined"
              size="large"
              sx={{
                color: colors.grey[100],
                borderColor: colors.grey[500],
                '&:hover': { borderColor: colors.grey[300] },
              }}
            >
              Public market pulse
            </Button>
            <Button
              component={Link}
              to="/"
              variant="outlined"
              size="large"
              sx={{
                color: colors.grey[100],
                borderColor: colors.grey[500],
                '&:hover': { borderColor: colors.grey[300] },
              }}
            >
              Back to home
            </Button>
          </Stack>
          <EducationalDisclaimer colors={colors} sx={{ mt: 3, textAlign: 'left' }} />
        </Container>
      </Box>

      <SeoPublicFooter />
    </Box>
  );
};

export default HundredDayWindow;