import React from 'react';
import {
  Box,
  Button,
  useTheme,
  Grid,
  Container,
  Card,
  CardContent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import { tokens } from "../theme";
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import '../styling/splashPage.css';
import Navbar from "./global/SplashNavBar.jsx";
import SeoHead, { organizationJsonLd, webSiteJsonLd, softwareApplicationJsonLd } from '../components/SeoHead';
import SeoPublicFooter from './seo/SeoPublicFooter';
import { SEO_PAGES } from '../seo/staticPageContent';
import { Link } from 'react-router-dom';
import TrackedSignupLink from '../components/marketing/TrackedSignupLink';
import ScrollHint from '../components/marketing/ScrollHint';
import StickySignupCta from '../components/marketing/StickySignupCta';
import HundredDayWindowBanner, { HUNDRED_DAY_WINDOW_BANNER_HEIGHT } from '../components/marketing/HundredDayWindowBanner';
import InspirationLogos from '../components/marketing/InspirationLogos';
import ChartPreviewLink from '../components/marketing/ChartPreviewLink';
import SplashRiskColorPreview from '../components/marketing/SplashRiskColorPreview';
import OpenAccessPromoBanner from '../components/marketing/OpenAccessPromoBanner';
import PromoPriceDisplay from '../components/marketing/PromoPriceDisplay';
import PublicMarketPulse from '../components/marketing/PublicMarketPulse';
import {
  getBottomCtaCopy,
  getHeroPricingHint,
  getHowItWorksSteps,
  getPricingSectionSubtitle,
  getPromoFaqs,
  isOpenAccessPromoActive,
  OPEN_ACCESS_PROMO,
} from '../config/openAccessPromo';
import { gallerySectionHref } from '../config/gallerySectionUtils';

const splashSeo = SEO_PAGES.splash;

const FREE_SIGNUP = '/login-signup?mode=signup';
const PREMIUM_SIGNUP = '/login-signup?mode=signup&plan=premium';

const CHART_ROW_ONE = [
  { image: '/assets/dashboard.png', alt: 'Customizable Dashboard', title: 'Customizable Dashboard', gallerySection: 'Free Charts' },
  { image: '/assets/fearAndGreed.png', alt: 'Fear and Greed Index', title: 'Fear and Greed Index', gallerySection: 'Indicators' },
  { image: '/assets/riskMetric.png', alt: 'Risk Metric', title: 'Risk Metric', gallerySection: 'Risk' },
  { image: '/assets/workbench.png', alt: 'Workbench', title: 'Workbench', gallerySection: 'Tools' },
];

const CHART_ROW_TWO = [
  { image: '/assets/dca-simulator.png', alt: 'Dynamic DCA Simulator', title: 'Dynamic DCA Simulator', gallerySection: 'Tools' },
  { image: '/assets/market-heat-index.png', alt: 'Market Heat Index', title: 'Market Heat Index', gallerySection: 'Advanced Models' },
  { image: '/assets/tail-curvature.png', alt: 'Tail Curvature', title: 'Tail Curvature', gallerySection: 'Advanced Models' },
  { image: '/assets/sahm-rule.png', alt: 'Sahm Rule', title: 'Sahm Rule', gallerySection: 'Advanced Models' },
];

const DCA_METRICS = ['Risk Metric', 'Tx Tension', 'Market Heat Index'];

const FREE_PLAN_FEATURES = [
  'Fear & Greed, log regression & dominance',
  'Total market cap & US macro overlays',
  'Customizable dashboard (1 favourite)',
];

const PROMO_FREE_PLAN_FEATURES = [
  'Limited free access to all 80+ charts (account required)',
  'Sign up with email and password, no card needed',
  'Dashboard, workbench, DCA simulator, risk tools',
];

const ctaHoverSx = (colors) => ({
  '&:hover': { backgroundColor: colors.greenAccent[400] },
});

const NAVBAR_HEIGHT = { xs: 64, sm: 80 };

const SplashPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const promoActive = isOpenAccessPromoActive();
  const howItWorksSteps = getHowItWorksSteps(promoActive);
  const promoFaqs = getPromoFaqs(promoActive);

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
        title={splashSeo.title}
        description={splashSeo.description}
        path="/"
        keywords={splashSeo.keywords}
        jsonLd={[organizationJsonLd, webSiteJsonLd, softwareApplicationJsonLd]}
      />
      <HundredDayWindowBanner colors={colors} />
      <Navbar colors={colors} topOffset={HUNDRED_DAY_WINDOW_BANNER_HEIGHT} />
      <StickySignupCta
        colors={colors}
        signupPath={FREE_SIGNUP}
        label={promoActive ? 'Sign up free (limited access)' : 'Sign up free'}
      />

      {/* Hero */}
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.primary[900],
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography
            component="h1"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
              mb: 2,
              lineHeight: 1.1,
            }}
          >
            <Box component="span" sx={{ color: colors.grey[100] }}>Crypto</Box>
            <Box component="span" sx={{ color: colors.greenAccent[500] }}>logical</Box>
          </Typography>

          <Typography
            component="p"
            sx={{
              color: colors.grey[100],
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.6rem', md: '2rem' },
              mb: 1,
              lineHeight: 1.3,
            }}
          >
            Bitcoin &amp; crypto analytics
          </Typography>
          <Typography
            component="p"
            sx={{
              color: colors.grey[300],
              fontWeight: 400,
              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.4rem' },
              mb: 4,
              maxWidth: '640px',
              mx: 'auto',
              lineHeight: 1.5,
            }}
          >
            Glassnode-depth metrics without Glassnode prices.
            <br />
            {promoActive
              ? 'See where the market is in the cycle. Limited free access for free accounts only.'
              : 'See where the market is in the cycle, free to start.'}
          </Typography>
          {promoActive && (
            <Box sx={{ mb: 3, maxWidth: 640, mx: 'auto' }}>
              <OpenAccessPromoBanner colors={colors} compact />
            </Box>
          )}
          <Button
            component={TrackedSignupLink}
            to={FREE_SIGNUP}
            location="splash-hero"
            variant="contained"
            size="large"
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              fontSize: '1.2rem',
              fontWeight: 'bold',
              px: 6,
              py: 2,
              borderRadius: '50px',
              ...ctaHoverSx(colors),
            }}
          >
            {promoActive ? 'Sign up free with email' : 'Sign up free, 30 seconds'}
          </Button>
          <Typography variant="body1" sx={{ color: colors.grey[300], mt: 2 }}>
            {getHeroPricingHint(promoActive)}
          </Typography>
          {promoActive && (
            <Typography variant="body2" sx={{ color: colors.grey[400], mt: 1, maxWidth: 520, mx: 'auto' }}>
              Interactive charts require a free account (email and password). The promotion is time-limited and does not apply to anonymous visitors.
            </Typography>
          )}
          <Button
            component={Link}
            to="/bitcoin-whitepaper"
            sx={{
              mt: 3,
              color: colors.greenAccent[400],
              fontSize: '1rem',
              textTransform: 'none',
              '&:hover': { color: colors.greenAccent[300], backgroundColor: 'transparent' },
            }}
          >
            New to Bitcoin? Read the whitepaper explained →
          </Button>
        </Container>
        <ScrollHint color={colors.grey[500]} />
      </Box>

      {/* Public market pulse — value before signup */}
      <PublicMarketPulse colors={colors} />

      {/* Dynamic DCA Simulator, flagship feature */}
      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Chip
              label={promoActive ? 'Included free · Flagship tool' : 'Premium · Flagship tool'}
              sx={{
                mb: 2,
                backgroundColor: colors.greenAccent[800],
                color: colors.greenAccent[300],
                fontWeight: 600,
              }}
            />
            <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 2, fontSize: { xs: '2rem', md: '2.75rem' } }}>
              Take the emotion out of investing
            </Typography>
            <Typography sx={{ color: colors.grey[300], maxWidth: 720, mx: 'auto', fontSize: '1.15rem', lineHeight: 1.7 }}>
              The <strong>Dynamic DCA Simulator</strong> backtests real buy and sell rules against history,
              then pits your strategy against plain HODL.
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box
                component={Link}
                to={gallerySectionHref('Tools')}
                sx={{
                  display: 'block',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${colors.primary[600]}`,
                  transition: 'transform 0.2s ease',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
              >
                <img
                  src="/assets/dca-simulator.png"
                  alt="Dynamic DCA Simulator screenshot"
                  style={{ width: '100%', display: 'block' }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" sx={{ color: colors.greenAccent[400], fontWeight: 'bold', mb: 2 }}>
                Three signals. Your rules. Side-by-side results.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                {DCA_METRICS.map((metric) => (
                  <Chip
                    key={metric}
                    label={metric}
                    sx={{
                      backgroundColor: colors.primary[900],
                      color: colors.grey[200],
                      border: `1px solid ${colors.primary[600]}`,
                    }}
                  />
                ))}
              </Stack>
              <Typography sx={{ color: colors.grey[300], mb: 2, lineHeight: 1.7 }}>
                Set adjustable buy and sell zones on each metric, then compare periodic investing vs
                trigger-only entries, with optional dynamic selling when conditions flip.
              </Typography>
              <Typography sx={{ color: colors.grey[400], mb: 3, lineHeight: 1.7, fontSize: '0.95rem' }}>
                Every simulated trade is logged. Benchmark against HODL from the same start date to see
                whether your rules would have helped, or hurt.
              </Typography>
              <Button
                component={Link}
                to={gallerySectionHref('Tools')}
                variant="outlined"
                sx={{
                  color: colors.greenAccent[400],
                  borderColor: colors.greenAccent[500],
                  fontWeight: 'bold',
                  '&:hover': { borderColor: colors.greenAccent[300], backgroundColor: `${colors.greenAccent[900]}33` },
                }}
              >
                See Dynamic DCA in the gallery →
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Interactive premium draw, real frozen BTC risk data */}
      <SplashRiskColorPreview />

      {/* Features */}
      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, fontSize: { xs: '2.5rem', md: '3rem' } }}>
            Turning Complex Data Into Simple Decisions
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {[
              { title: 'Risk Metrics', text: 'Build investment rules around proprietary risk scores for every major crypto asset.' },
              { title: 'Market Heat Index', text: 'One composite score for how under- or over-heated the market is right now.' },
              { title: 'Customizable Dashboards', text: 'Curate the charts that matter most, favourites sync across devices.' },
            ].map((f) => (
              <Grid item xs={12} md={4} key={f.title}>
                <Card sx={{ backgroundColor: colors.primary[900], p: 4, height: '100%' }}>
                  <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>{f.title}</Typography>
                  <Typography sx={{ color: colors.grey[300] }}>{f.text}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Chart previews */}
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 2, fontSize: { xs: '2.5rem', md: '3rem' } }}>
          Examples from the app
        </Typography>
        <Typography sx={{ color: colors.grey[400], mb: 6 }}>
          Click any chart to browse the full gallery
        </Typography>
        <Grid container spacing={4} justifyContent="center" sx={{ mb: 4 }}>
          {CHART_ROW_ONE.map((chart) => (
            <Grid item xs={12} sm={6} md={3} key={chart.title}>
              <ChartPreviewLink {...chart} colors={colors} gallerySection={chart.gallerySection} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={4} justifyContent="center">
          {CHART_ROW_TWO.map((chart) => (
            <Grid item xs={12} sm={6} md={3} key={chart.title}>
              <ChartPreviewLink {...chart} colors={colors} gallerySection={chart.gallerySection} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How it works */}
      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, fontSize: { xs: '2.5rem', md: '3rem' } }}>
            How Cryptological works
          </Typography>
          <Grid container spacing={6} justifyContent="center">
            {howItWorksSteps.map((item) => (
              <Grid item xs={12} md={4} key={item.step}>
                <Typography variant="h3" sx={{ color: colors.greenAccent[500], mb: 2 }}>{item.step}</Typography>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>{item.title}</Typography>
                <Typography sx={{ color: colors.grey[300] }}>{item.text}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <InspirationLogos colors={colors} />

      {/* Pricing */}
      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 2, fontSize: { xs: '2.5rem', md: '3rem' } }}>
            Choose the plan that fits your journey
          </Typography>
          {promoActive && (
            <Box sx={{ mb: 4, maxWidth: 720, mx: 'auto' }}>
              <OpenAccessPromoBanner colors={colors} />
            </Box>
          )}
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 6 }}>
            {getPricingSectionSubtitle(promoActive)}
          </Typography>

          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Grid container spacing={4} justifyContent="center">
              <Grid item xs={12} sm={6}>
                <Card sx={{ backgroundColor: colors.primary[800], p: 4 }}>
                  <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1 }}>
                    {promoActive ? 'Free account' : 'Free Plan'}
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.greenAccent[500], mb: 2 }}>
                    {promoActive ? 'Limited free access' : '$0 / month'}
                  </Typography>
                  {(promoActive ? PROMO_FREE_PLAN_FEATURES : FREE_PLAN_FEATURES).map((f) => (
                    <Typography key={f} sx={{ color: colors.grey[300], mb: 1, textAlign: 'left' }}>
                      <CheckIcon sx={{ color: colors.greenAccent[500], mr: 1, fontSize: 18 }} />{f}
                    </Typography>
                  ))}
                  <Button
                    component={TrackedSignupLink}
                    to={FREE_SIGNUP}
                    location="pricing-free-mobile"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2, backgroundColor: colors.greenAccent[500], color: colors.grey[900], ...ctaHoverSx(colors) }}
                  >
                    {promoActive ? 'Sign up with email' : 'Get started free'}
                  </Button>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card sx={{ backgroundColor: colors.primary[900], p: 4, border: `2px solid ${colors.greenAccent[500]}` }}>
                  <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1 }}>Premium Plan</Typography>
                  {promoActive ? (
                    <PromoPriceDisplay colors={colors} sx={{ mb: 2 }} />
                  ) : (
                    <Typography variant="h6" sx={{ color: colors.greenAccent[500], mb: 2 }}>{OPEN_ACCESS_PROMO.premiumPriceUsd}</Typography>
                  )}
                  {(promoActive
                    ? ['All charts unlocked with free account', 'Requires email + password signup', 'Promotional, time-limited', 'No card required now']
                    : ['Everything in Free', 'Advanced risk metrics', 'Full market insights', 'Priority support']
                  ).map((f) => (
                    <Typography key={f} sx={{ color: colors.grey[300], mb: 1, textAlign: 'left' }}>
                      <CheckIcon sx={{ color: colors.greenAccent[500], mr: 1, fontSize: 18 }} />{f}
                    </Typography>
                  ))}
                  <Button
                    component={TrackedSignupLink}
                    to={promoActive ? FREE_SIGNUP : PREMIUM_SIGNUP}
                    location="pricing-premium-mobile"
                    plan={promoActive ? undefined : 'premium'}
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2, backgroundColor: colors.greenAccent[500], color: colors.grey[900], ...ctaHoverSx(colors) }}
                  >
                    {promoActive ? 'Sign up free (limited access)' : 'Upgrade to Premium'}
                  </Button>
                </Card>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Card sx={{ backgroundColor: colors.primary[900], p: 2 }}>
              <Grid container alignItems="center">
                <Grid item md={4} sx={{ p: 2 }}><Typography>Feature</Typography></Grid>
                <Grid item md={4} sx={{ p: 2, backgroundColor: colors.primary[800], textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1 }}>
                    {promoActive ? 'Free account' : 'Free Plan'}
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.greenAccent[500] }}>
                    {promoActive ? 'Limited free access' : '$0 / month'}
                  </Typography>
                </Grid>
                <Grid item md={4} sx={{ p: 2, border: `2px solid ${colors.greenAccent[500]}`, textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1 }}>Premium Plan</Typography>
                  {promoActive ? (
                    <PromoPriceDisplay colors={colors} sx={{ mb: 0 }} />
                  ) : (
                    <Typography variant="h6" sx={{ color: colors.greenAccent[500] }}>{OPEN_ACCESS_PROMO.premiumPriceUsd}</Typography>
                  )}
                </Grid>
              </Grid>
              <Divider />
              {(promoActive
                ? [
                    ['All interactive charts (account required)', true, true],
                    ['Email + password free signup', true, true],
                    ['Promotional / time-limited free access', true, true],
                    ['No card required during promo', true, true],
                  ]
                : [
                    ['Basic charts', true, true],
                    ['Advanced risk metrics', false, true],
                    ['Full market insights', false, true],
                    ['Priority support', false, true],
                  ]
              ).map(([label, free, premium]) => (
                <React.Fragment key={label}>
                  <Grid container>
                    <Grid item md={4} sx={{ p: 2 }}><Typography>{label}</Typography></Grid>
                    <Grid item md={4} sx={{ p: 2, backgroundColor: colors.primary[800], textAlign: 'center' }}>
                      {free ? <CheckIcon sx={{ color: colors.greenAccent[500] }} /> : '-'}
                    </Grid>
                    <Grid item md={4} sx={{ p: 2, textAlign: 'center' }}>
                      {premium ? <CheckIcon sx={{ color: colors.greenAccent[500] }} /> : '-'}
                    </Grid>
                  </Grid>
                  <Divider />
                </React.Fragment>
              ))}
              <Grid container>
                <Grid item md={4} sx={{ p: 4 }} />
                <Grid item md={4} sx={{ p: 4, backgroundColor: colors.primary[800] }}>
                  <Button
                    component={TrackedSignupLink}
                    to={FREE_SIGNUP}
                    location="pricing-free-desktop"
                    variant="contained"
                    fullWidth
                    sx={{ backgroundColor: colors.greenAccent[500], color: colors.grey[900], ...ctaHoverSx(colors) }}
                  >
                    {promoActive ? 'Sign up with email' : 'Get started free'}
                  </Button>
                </Grid>
                <Grid item md={4} sx={{ p: 4 }}>
                  <Button
                    component={TrackedSignupLink}
                    to={promoActive ? FREE_SIGNUP : PREMIUM_SIGNUP}
                    location="pricing-premium-desktop"
                    plan={promoActive ? undefined : 'premium'}
                    variant="contained"
                    fullWidth
                    sx={{ backgroundColor: colors.greenAccent[500], color: colors.grey[900], ...ctaHoverSx(colors) }}
                  >
                    {promoActive ? 'Sign up free (limited access)' : 'Upgrade to Premium'}
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </Box>
          <Typography sx={{ color: colors.grey[300], mt: 4 }}>
            {promoActive
              ? 'Limited free access for free accounts only (email + password). No card during the promotion. Anonymous visitors see previews and the public market pulse only.'
              : 'Cancel anytime from your account settings.'}
          </Typography>
        </Container>
      </Box>

      {/* FAQ */}
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'left' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, textAlign: 'center', fontSize: { xs: '2.5rem', md: '3rem' } }}>
          Frequently asked questions
        </Typography>
        {promoFaqs.map((faq) => (
          <Accordion key={faq.q} sx={{ backgroundColor: colors.primary[800], mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.grey[100] }} />}>
              <Typography variant="h6" sx={{ color: colors.grey[100] }}>{faq.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: colors.grey[300] }}>{faq.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>

      {/* Final CTA */}
      <Box sx={{ width: '100%', py: 12, textAlign: 'center', backgroundColor: colors.greenAccent[800] }}>
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 4, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
            {getBottomCtaCopy(promoActive).title}
          </Typography>
          <Typography variant="h5" sx={{ color: colors.grey[100], mb: 6, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
            {getBottomCtaCopy(promoActive).body}
          </Typography>
          <Button
            component={TrackedSignupLink}
            to={FREE_SIGNUP}
            location="splash-bottom-cta"
            variant="contained"
            size="large"
            sx={{
              backgroundColor: colors.primary[900],
              color: colors.greenAccent[500],
              fontSize: '1.2rem',
              fontWeight: 'bold',
              px: 6,
              py: 2,
              borderRadius: '50px',
              '&:hover': { backgroundColor: colors.primary[800], color: colors.greenAccent[400], transform: 'scale(1.03)' },
            }}
          >
            {getBottomCtaCopy(promoActive).button}
          </Button>
        </Container>
      </Box>

      <SeoPublicFooter />
    </Box>
  );
};

export default SplashPage;