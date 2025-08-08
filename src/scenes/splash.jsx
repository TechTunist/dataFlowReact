import React from 'react';
import { Box, Typography, Button, useTheme, Grid, Container, Card, CardContent, Divider, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { tokens } from "../theme";
import { Link } from "react-router-dom";
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import '../styling/splashPage.css';

const SplashPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: colors.primary[900],
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Hero Section with Video Background */}
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src="/assets/cryptoBackground.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1,
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Typography
            component="span"
            variant="h1"
            sx={{
            color: colors.grey[100],
            fontWeight: 'bold',
            fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
            mb: 2,
            }}
            >

            Crypto
          </Typography>
          <Typography
            component="span"
            variant="h1"
            sx={{
            color: colors.greenAccent[500],
            fontWeight: 'bold',
            fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
            mb: 2,
            }}
            >

            Logical
          </Typography>

          <Typography
            variant="h3"
            sx={{
              color: colors.grey[100],
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2.5rem', md: '3.5rem' },
              marginBottom: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            Decrypt The Confusing
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: colors.grey[100],
              fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' },
              mb: 4,
              maxWidth: '800px',
              mx: 'auto',
            }}
          >
            Unlock powerful analytics, risk metrics, and market insights, whether you're a beginner or experienced investor. 
          </Typography>
          <Button
            component={Link}
            to="/login-signup?mode=signup&plan=premium"
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
            '&:hover': {
            backgroundColor: '#D500F9',
            color: colors.greenAccent[500],
            },
            }}
            >

            Sign up now for free access
          </Button>
          <Typography
            variant="body2"
            sx={{ color: colors.grey[300], mt: 2 }}
          >
            No credit card required • Instant access • Cancel anytime
          </Typography>
        </Container>
      </Box>

      {/* Simulation Section */}
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 4, fontSize: { xs: '2.5rem', md: '3rem' } }}>
        Take the emotion out of investing with our Strategy Simulation
        </Typography>
        <Typography variant="body1" sx={{ color: colors.grey[300], maxWidth: '800px', mx: 'auto', mb: 6, fontSize: '1.2rem' }}>
          Backtest different investment strategies based around risk metrics
        </Typography>
        <Grid container spacing={6} justifyContent="center">
          <Grid item xs={12} md={4}>
            <Card sx={{ backgroundColor: colors.primary[800], p: 3, textAlign: 'centre' }}>
              <Typography variant="h5" sx={{ color: colors.greenAccent[500], mb: 2 }}>HODL Strategy</Typography>
              <Typography>Pick a historical date to invest a lump sum and see what it would be worth at current prices.</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ backgroundColor: colors.primary[800], p: 3, textAlign: 'centre' }}>
              <Typography variant="h5" sx={{ color: colors.greenAccent[500], mb: 2 }}>Dollar Cost Average Strategy</Typography>
              <Typography>Choose an amount and a frequency to invest under certain risk levels, then set the 'take-profit' when over certain risk levels.</Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Trust Bar / Logos Section */}
      <Box sx={{ width: '100%', py: 4, backgroundColor: colors.primary[800], textAlign: 'center' }}>
        <Container maxWidth="lg">
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            Data on tried and tested assets like Bitcoin, as well as more speculative assets
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {/* Placeholder logos */}
            <Grid item><img src="/assets/bitcoin.jpg" alt="Logo 1" height="40" /></Grid>
            <Grid item><img src="/assets/ethereum.jpg" alt="Logo 2" height="40" /></Grid>
            <Grid item><img src="/assets/dollar.jpg" alt="Logo 3" height="40" /></Grid>
          </Grid>
        </Container>
      </Box>

      {/* Problem-Solution Section */}
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 4, fontSize: { xs: '2.5rem', md: '3rem' } }}>
          Knowledge is Power
        </Typography>
        <Typography variant="body1" sx={{ color: colors.grey[300], maxWidth: '800px', mx: 'auto', mb: 6, fontSize: '1.2rem' }}>
          The crypto market is confusing and volatile. Without the right tools, beginners get overwhelmed and intermediates miss opportunities. Cryptological changes that with easy-to-understand analytics and insights.
        </Typography>
        <Grid container spacing={6} justifyContent="center">
          <Grid item xs={12} md={4}>
            <Card sx={{ backgroundColor: colors.primary[800], p: 3, textAlign: 'centre' }}>
              <Typography variant="h5" sx={{ color: colors.greenAccent[500], mb: 2 }}>Problem: Market Overwhelm</Typography>
              <Typography>Too much data, not enough clarity.</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ backgroundColor: colors.primary[800], p: 3, textAlign: 'centre' }}>
              <Typography variant="h5" sx={{ color: colors.greenAccent[500], mb: 2 }}>Solution: Simplified Insights</Typography>
              <Typography>Get curated metrics that matter.</Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, fontSize: { xs: '2.5rem', md: '3rem' } }}>
            Powerful Features to Supercharge Your Understanding
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} md={4}>
              <Card sx={{ backgroundColor: colors.primary[900], p: 4, height: '100%' }}>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Risk Metrics</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Assess market risks instantly to avoid costly mistakes.</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ backgroundColor: colors.primary[900], p: 4, height: '100%' }}>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Market Sentiment Analysis</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Gauge fear and greed to time your trades perfectly.</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ backgroundColor: colors.primary[900], p: 4, height: '100%' }}>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Customizable Dashboards</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Tailor your view for quick, informed decisions.</Typography>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Chart Previews / Demo Section */}
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, fontSize: { xs: '2.5rem', md: '3rem' } }}>
          See the Power in Action
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={3}>
            <img alt="Customizable Dashboard" src="/assets/dashboard.png" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
            <Typography variant="h6" sx={{ color: colors.grey[200], mt: 2 }}>Customizable Dashboard</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <img alt="Fear and Greed Index" src="/assets/fearAndGreed.png" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
            <Typography variant="h6" sx={{ color: colors.grey[200], mt: 2 }}>Fear and Greed Index</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <img alt="Risk Metric" src="/assets/riskMetric.png" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
            <Typography variant="h6" sx={{ color: colors.grey[200], mt: 2 }}>Risk Metric</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <img alt="Price vs Risk" src="/assets/priceVRisk.png" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
            <Typography variant="h6" sx={{ color: colors.grey[200], mt: 2 }}>Price vs Risk</Typography>
          </Grid>
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, fontSize: { xs: '2.5rem', md: '3rem' } }}>
            How Cryptological Works – Simple 3-Step Process
          </Typography>
          <Grid container spacing={6} justifyContent="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ color: colors.greenAccent[500], mb: 2 }}>1</Typography>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Sign Up Free</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Create your account in seconds – no card needed.</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ color: colors.greenAccent[500], mb: 2 }}>2</Typography>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Explore Insights</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Dive into charts, metrics, and dashboards tailored to you.</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ color: colors.greenAccent[500], mb: 2 }}>3</Typography>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Make Wiser Trades</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Use data-driven decisions to grow your portfolio.</Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Social Proof Section */}
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, fontSize: { xs: '2.5rem', md: '3rem' } }}>
          Don't Just Take Our Word – Hear From Real Users
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={4}>
            <Card sx={{ backgroundColor: colors.primary[800], p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
              </Box>
              <Typography sx={{ color: colors.grey[300], mb: 2 }}>"Cryptological turned me from a crypto newbie into a confident investor. The risk metrics saved me thousands!"</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/assets/user1-placeholder.png" alt="John D." style={{ width: 40, height: 40, borderRadius: '50%', mr: 2 }} />
                <Typography sx={{ color: colors.grey[400] }}>- John D., Beginner Investor</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ backgroundColor: colors.primary[800], p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
              </Box>
              <Typography sx={{ color: colors.grey[300], mb: 2 }}>"The insights are spot-on. Helped me spot trends early and avoid bad trades."</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/assets/user2-placeholder.png" alt="Sarah L." style={{ width: 40, height: 40, borderRadius: '50%', mr: 2 }} />
                <Typography sx={{ color: colors.grey[400] }}>- Sarah L., Intermediate Trader</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ backgroundColor: colors.primary[800], p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
                <StarIcon sx={{ color: '#FFD700' }} />
              </Box>
              <Typography sx={{ color: colors.grey[300], mb: 2 }}>"Worth every penny. The premium features give me an edge in the market."</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/assets/user3-placeholder.png" alt="Mike R." style={{ width: 40, height: 40, borderRadius: '50%', mr: 2 }} />
                <Typography sx={{ color: colors.grey[400] }}>- Mike R., Crypto Enthusiast</Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Pricing Section with Table */}
      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 2, fontSize: { xs: '2.5rem', md: '3rem' } }}>
            Choose the Plan That Fits Your Journey
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 6 }}>
            Start free or go premium for unlimited access. Limited time: Over 50% off for new signups!
          </Typography>
          <Card sx={{ backgroundColor: colors.primary[900], overflowX: 'auto' }}>
            <Grid container>
              <Grid item xs={12} md={4} sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Feature</Typography>
              </Grid>
              <Grid item xs={12} md={4} sx={{ p: 4, backgroundColor: colors.primary[800], position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', bgcolor: colors.greenAccent[500], color: colors.grey[900], px: 2, py: 1, borderRadius: 20, fontWeight: 'bold' }}>Free</Box>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Free Plan</Typography>
                <Typography variant="h6" sx={{ color: colors.greenAccent[500] }}>$0 / month</Typography>
              </Grid>
              <Grid item xs={12} md={4} sx={{ p: 4, border: `2px solid ${colors.greenAccent[500]}`, position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', bgcolor: colors.greenAccent[500], color: colors.grey[900], px: 2, py: 1, borderRadius: 20, fontWeight: 'bold' }}>Premium</Box>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Premium Plan</Typography>
                <Typography variant="h6" sx={{ color: colors.greenAccent[500] }}>$13.45 / month</Typography>
              </Grid>
            </Grid>
            <Divider />
            <Grid container>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><Typography>Basic Charts</Typography></Grid>
              <Grid item xs={12} md={4} sx={{ p: 2, backgroundColor: colors.primary[800] }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
            </Grid>
            <Divider />
            <Grid container>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><Typography>Advanced Risk Metrics</Typography></Grid>
              <Grid item xs={12} md={4} sx={{ p: 2, backgroundColor: colors.primary[800] }}>-</Grid>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
            </Grid>
            <Divider />
            <Grid container>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><Typography>Full Market Insights</Typography></Grid>
              <Grid item xs={12} md={4} sx={{ p: 2, backgroundColor: colors.primary[800] }}>-</Grid>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
            </Grid>
            <Divider />
            <Grid container>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><Typography>Priority Support</Typography></Grid>
              <Grid item xs={12} md={4} sx={{ p: 2, backgroundColor: colors.primary[800] }}>-</Grid>
              <Grid item xs={12} md={4} sx={{ p: 2 }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
            </Grid>
            <Divider />
            <Grid container>
              <Grid item xs={12} md={4} sx={{ p: 4 }}></Grid>
              <Grid item xs={12} md={4} sx={{ p: 4, backgroundColor: colors.primary[800] }}>
                <Button
                  component={Link}
                  to="/login-signup?mode=signup"
                  variant="contained"
                  fullWidth
                  sx={{
                    backgroundColor: colors.greenAccent[500],
                    color: colors.grey[900],
                    '&:hover': { backgroundColor: '#D500F9' },
                  }}
                >
                  Get Started Free
                </Button>
              </Grid>
              <Grid item xs={12} md={4} sx={{ p: 4 }}>
                <Button
                  component={Link}
                  to="/login-signup?mode=signup&plan=premium"
                  variant="contained"
                  fullWidth
                  sx={{
                    backgroundColor: colors.greenAccent[500],
                    color: colors.grey[900],
                    '&:hover': { backgroundColor: '#D500F9' },
                  }}
                >
                  Upgrade to Premium
                </Button>
              </Grid>
            </Grid>
          </Card>
          <Typography sx={{ color: colors.grey[300], mt: 4 }}>30-Day Money-Back Guarantee on Premium – Risk-Free!</Typography>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Container maxWidth="lg" sx={{ py: 10, textAlign: 'left' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, textAlign: 'center', fontSize: { xs: '2.5rem', md: '3rem' } }}>
          Frequently Asked Questions
        </Typography>
        <Accordion sx={{ backgroundColor: colors.primary[800], mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.grey[100] }} />}>
            <Typography variant="h6" sx={{ color: colors.grey[100] }}>Is Cryptological suitable for beginners?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ color: colors.grey[300] }}>Absolutely! Our intuitive interface and guided insights make it easy for newcomers to understand crypto markets.</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ backgroundColor: colors.primary[800], mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.grey[100] }} />}>
            <Typography variant="h6" sx={{ color: colors.grey[100] }}>What data sources do you use?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ color: colors.grey[300] }}>We aggregate real-time data from top exchanges, blockchain metrics, and sentiment analysis tools.</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ backgroundColor: colors.primary[800], mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.grey[100] }} />}>
            <Typography variant="h6" sx={{ color: colors.grey[100] }}>Can I cancel anytime?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ color: colors.grey[300] }}>Yes, cancel your subscription at any time with no hidden fees.</Typography>
          </AccordionDetails>
        </Accordion>
      </Container>

      {/* Final CTA Section */}
      <Box
        sx={{
          width: '100%',
          py: 12,
          textAlign: 'center',
          backgroundColor: colors.greenAccent[700],
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ color: colors.primary[900], fontWeight: 'bold', mb: 4, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
            Ready to Transform Your Crypto Investments?
          </Typography>
          <Typography variant="h5" sx={{ color: colors.primary[900], mb: 6 }}>
            Join thousands making wiser decisions today. Don't miss out on the next bull run.
          </Typography>
          <Button
            component={Link}
            to="/login-signup?mode=signup&plan=premium"
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
              '&:hover': {
                backgroundColor: '#D500F9',
                color: colors.grey[100],
              },
            }}
          >
            Start For Free
          </Button>
          <Typography sx={{ color: colors.primary[800], mt: 2 }}>Limited spots – Act now!</Typography>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          width: '100%',
          py: 4,
          textAlign: 'center',
          backgroundColor: colors.primary[800],
          color: colors.grey[400],
        }}
      >
        <Typography>
          © {new Date().getFullYear()} Cryptological. All rights reserved. | <Link to="/privacy" style={{ color: colors.grey[300] }}>Privacy Policy</Link> | <Link to="/terms" style={{ color: colors.grey[300] }}>Terms of Service</Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default SplashPage;