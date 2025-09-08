import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, useTheme, Grid, Container, Card, CardContent, Divider, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { tokens } from "../theme";
import { Link } from "react-router-dom";
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import '../styling/splashPage.css';
import Navbar from "./global/SplashNavBar.jsx";

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
    <Navbar colors={colors} />
      
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
            variant="body1"
            sx={{ color: colors.grey[300], mt: 2 }}
          >
            No card details required • Instant access • Cancel anytime
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
              <Typography>Choose an amount and a frequency to invest under certain risk levels, then set the 'take-profit' when over certain risk levels. Observe every transaction.</Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Trust Bar / Logos Section */}
      <Box sx={{ width: '100%', py: 4, backgroundColor: colors.primary[800], textAlign: 'center' }}>
        <Container maxWidth="lg">
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            Data on the asset class leader Bitcoin, as well as a selection of top altcoins and even fiat currency.
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
          The crypto market is confusing and volatile. Get access to a range of tools to help you navigate the markets, each with a description to help understand what the tool is showing.
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
              <Typography variant="h5" sx={{ color: colors.greenAccent[500], mb: 2 }}>Solution: Levels of Understanding</Typography>
              <Typography>Get a general overview of market conditions, or drill down into specific metrics when you are ready.</Typography>
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
                <Typography sx={{ color: colors.grey[300] }}>You can create your own investment strategy based on our risk metrics, available for all crypto assets on the platform.</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ backgroundColor: colors.primary[900], p: 4, height: '100%' }}>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Market Overview Analysis</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Our Market Heat Index combines several metrics into a single, easy to understand value that expresses how under or over-heated things are.</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ backgroundColor: colors.primary[900], p: 4, height: '100%' }}>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Customizable Dashboards</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Curate your own bespoke indicator dashboard, giving you the charts that matter most to you instantly viewable.</Typography>
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
            How Cryptological Works. A Simple 3-Step Process:
          </Typography>
          <Grid container spacing={6} justifyContent="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ color: colors.greenAccent[500], mb: 2 }}>1</Typography>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Sign Up Free</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Create your account in seconds, no card needed.</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ color: colors.greenAccent[500], mb: 2 }}>2</Typography>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Explore Insights</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Dive into the free charts.</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ color: colors.greenAccent[500], mb: 2 }}>3</Typography>
                <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Subscribe to Premium to Unlock Full Access</Typography>
                <Typography sx={{ color: colors.grey[300] }}>Use data to help you make wiser decisions and grow your portfolio.</Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Social Proof Section */}
      {/* <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 6, fontSize: { xs: '2.5rem', md: '3rem' } }}>
          Hear From Real Users
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
              <Typography sx={{ color: colors.grey[300], mb: 2 }}>"Cryptological provided me with a lot of value for money, compared to other options out there, but the real reason I subscribed was for access to the risk metrics."</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: colors.grey[400] }}>- Peter A. Crypto Enthusiast</Typography>
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
              <Typography sx={{ color: colors.grey[300], mb: 2 }}>"The market overview is like nothing I have seen anywhere else. I like to check each metric's colors every morning and open up the charts if I see purple or red to see what's going on."</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                
                <Typography sx={{ color: colors.grey[400] }}>- Sarah L. Bitcoin Investor</Typography>
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
              <Typography sx={{ color: colors.grey[300], mb: 2 }}>"The other options with the metrics I wanted were out of my price range for a relatively small portfolio such as mine, but Cryptological offered an affordable option."</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                
                <Typography sx={{ color: colors.grey[400] }}>- Mike R., Newbie Investor</Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container> */}

      <Box sx={{ width: '100%', py: 10, backgroundColor: colors.primary[800] }}>
  <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
    <Typography variant="h2" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 2, fontSize: { xs: '2.5rem', md: '3rem' } }}>
      Choose the Plan That Fits Your Journey
    </Typography>
    <Typography variant="body1" sx={{ color: colors.grey[300], mb: 6 }}>
      Start free or go premium for unlimited access. Limited time: Over 50% off for new signups!
    </Typography>

    {/* Mobile Layout: Vertical Cards */}
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} sm={6}>
          <Card sx={{ backgroundColor: colors.primary[800], p: 4, position: 'relative' }}>
            <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1, textAlign: 'center' }}>
              Free Plan
            </Typography>
            <Typography variant="h6" sx={{ color: colors.greenAccent[500], mb: 2, textAlign: 'center' }}>
              $0 / month
            </Typography>
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ color: colors.grey[300], mb: 1 }}><CheckIcon sx={{ color: colors.greenAccent[500], mr: 1 }} />Basic Charts</Typography>
              <Typography sx={{ color: colors.grey[300], mb: 1 }}>-</Typography>
              <Typography sx={{ color: colors.grey[300], mb: 1 }}>-</Typography>
              <Typography sx={{ color: colors.grey[300], mb: 2 }}>-</Typography>
            </Box>
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
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ backgroundColor: colors.primary[900], p: 4, border: `2px solid ${colors.greenAccent[500]}` }}>
            <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1, textAlign: 'center' }}>
              Premium Plan
            </Typography>
            <Typography variant="h6" sx={{ color: colors.greenAccent[500], mb: 2, textAlign: 'center' }}>
              $13.45 / month
            </Typography>
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ color: colors.grey[300], mb: 1 }}><CheckIcon sx={{ color: colors.greenAccent[500], mr: 1 }} />Basic Charts</Typography>
              <Typography sx={{ color: colors.grey[300], mb: 1 }}><CheckIcon sx={{ color: colors.greenAccent[500], mr: 1 }} />Advanced Risk Metrics</Typography>
              <Typography sx={{ color: colors.grey[300], mb: 1 }}><CheckIcon sx={{ color: colors.greenAccent[500], mr: 1 }} />Full Market Insights</Typography>
              <Typography sx={{ color: colors.grey[300], mb: 2 }}><CheckIcon sx={{ color: colors.greenAccent[500], mr: 1 }} />Priority Support</Typography>
            </Box>
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
          </Card>
        </Grid>
      </Grid>
    </Box>

    {/* Desktop Layout: Table */}
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <Card sx={{ backgroundColor: colors.primary[900], p: 2 }}>
        <Grid container alignItems="center">
          <Grid item md={4} sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>Feature</Typography>
          </Grid>
          <Grid item md={4} sx={{ p: 2, backgroundColor: colors.primary[800], textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1, pt: 2 }}>Free Plan</Typography>
            <Typography variant="h6" sx={{ color: colors.greenAccent[500] }}>$0 / month</Typography>
          </Grid>
          <Grid item md={4} sx={{ p: 2, border: `2px solid ${colors.greenAccent[500]}`, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: colors.grey[100], mb: 1, pt: 2 }}>Premium Plan</Typography>
            <Typography variant="h6" sx={{ color: colors.greenAccent[500] }}>$13.45 / month</Typography>
          </Grid>
        </Grid>
        <Divider />
        <Grid container>
          <Grid item md={4} sx={{ p: 2 }}><Typography>Basic Charts</Typography></Grid>
          <Grid item md={4} sx={{ p: 2, backgroundColor: colors.primary[800], textAlign: 'center' }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
          <Grid item md={4} sx={{ p: 2, textAlign: 'center' }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
        </Grid>
        <Divider />
        <Grid container>
          <Grid item md={4} sx={{ p: 2 }}><Typography>Advanced Risk Metrics</Typography></Grid>
          <Grid item md={4} sx={{ p: 2, backgroundColor: colors.primary[800], textAlign: 'center' }}>-</Grid>
          <Grid item md={4} sx={{ p: 2, textAlign: 'center' }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
        </Grid>
        <Divider />
        <Grid container>
          <Grid item md={4} sx={{ p: 2 }}><Typography>Full Market Insights</Typography></Grid>
          <Grid item md={4} sx={{ p: 2, backgroundColor: colors.primary[800], textAlign: 'center' }}>-</Grid>
          <Grid item md={4} sx={{ p: 2, textAlign: 'center' }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
        </Grid>
        <Divider />
        <Grid container>
          <Grid item md={4} sx={{ p: 2 }}><Typography>Priority Support</Typography></Grid>
          <Grid item md={4} sx={{ p: 2, backgroundColor: colors.primary[800], textAlign: 'center' }}>-</Grid>
          <Grid item md={4} sx={{ p: 2, textAlign: 'center' }}><CheckIcon sx={{ color: colors.greenAccent[500] }} /></Grid>
        </Grid>
        <Divider />
        <Grid container>
          <Grid item md={4} sx={{ p: 4 }}></Grid>
          <Grid item md={4} sx={{ p: 4, backgroundColor: colors.primary[800] }}>
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
          <Grid item md={4} sx={{ p: 4 }}>
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
    </Box>
    <Typography sx={{ color: colors.grey[300], mt: 4 }}>Cancel anytime at the click of a button.</Typography>
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
            <Typography variant="h6" sx={{ color: colors.grey[100] }}>Can I cancel anytime?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ color: colors.grey[300] }}>Yes. Each payment you make gives you access for the related period (a month). If you cancel your subscription, you will retain access for the remainder of that period and no more payments will be made.</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ backgroundColor: colors.primary[800], mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.grey[100] }} />}>
            <Typography variant="h6" sx={{ color: colors.grey[100] }}>Do you get real-time data?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ color: colors.grey[300] }}>Assets are either shown at their real-time valuations, or the value at the previous daily close. Some other datasets are updated when new data is availble, depending on the frequency in which the data is published.</Typography>
          </AccordionDetails>
        </Accordion>
      </Container>

      <Box
        sx={{
          width: '100%',
          py: 12,
          textAlign: 'center',
          backgroundColor: colors.greenAccent[700], // Solid green for vibrancy
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h2"
            sx={{
              color: colors.grey[100], // White for high contrast
              fontWeight: 'bold',
              mb: 4,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
            }}
          >
            Ready to Transform Your Crypto Investments?
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: colors.grey[100], // White for readability
              mb: 6,
              fontSize: { xs: '1.2rem', md: '1.5rem' },
            }}
          >
            Join thousands making wiser decisions today. Don’t miss out on the next bull run.
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
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: '#D500F9',
                color: colors.grey[100],
                transform: 'scale(1.05)', // Subtle zoom on hover
              },
            }}
          >
            Start For Free
          </Button>
          <Typography
            sx={{
              color: colors.grey[200], // Slightly lighter white for subtlety
              mt: 2,
              fontSize: '1rem',
            }}
          >
            Become Cryptological Today!
          </Typography>
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
          © {new Date().getFullYear()} Cryptological. All rights reserved.
          {/* © {new Date().getFullYear()} Cryptological. All rights reserved. | <Link to="/privacy" style={{ color: colors.grey[300] }}>Privacy Policy</Link> | <Link to="/terms" style={{ color: colors.grey[300] }}>Terms of Service</Link> */}
        </Typography>
      </Box>
    </Box>
  );
};

export default SplashPage;