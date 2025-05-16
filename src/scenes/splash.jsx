// src/scenes/splash.jsx
import React from 'react';
import { Box, Typography, Button, useTheme } from "@mui/material";
import { tokens } from "../theme";
import { Link } from "react-router-dom";
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
        padding: { xs: '0 10px', sm: '0 20px' },
        boxSizing: 'border-box',
      }}
    >
      {/* Main Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          px: { xs: 2, sm: 3, md: 0 },
          position: 'relative', // For absolute positioning of background
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundImage: 'url(/assets/riskMetric.png)', // Background image
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
            radial-gradient(
              circle at center,
              transparent 20%,
              rgba(0, 0, 0, 0.7) 90%
            ),
            rgba(0, 0, 0, 0.5)
          `, // Dark overlay for readability
            zIndex: 1,
          },
          // Comment out the above backgroundImage and uncomment below for video
          /*
          overflow: 'hidden', // Ensure video doesn't overflow
          */
        }}
      >
        {/* Video Background (Uncomment to use instead of image) */}
        {/*
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
        */}
        <Box
          sx={{
            maxWidth: '800px',
            width: '100%',
            textAlign: 'center',
            padding: { xs: '20px', sm: '30px', md: '40px' },
            backgroundColor: `${colors.primary[800]}cc`, // Semi-transparent
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(141, 53, 53, 0.1)',
            position: 'relative',
            zIndex: 2, // Above background and overlay
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: colors.grey[100],
              marginBottom: '20px',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
            }}
          >
            Welcome to Cryptological
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: colors.grey[100], // Changed to brighter color for contrast
              marginBottom: '30px',
              fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' },
              lineHeight: 1.5,
            }}
          >
            Unlock comprehensive cryptocurrency analytics, market trends, and risk metrics.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <Button
              component={Link}
              to="/login-signup?mode=signup"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                padding: { xs: '10px 20px', sm: '12px 24px' },
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: colors.greenAccent[600],
                },
              }}
            >
              Sign Up
            </Button>
            <Button
              component={Link}
              to="/login-signup?mode=signin"
              sx={{
                backgroundColor: colors.greenAccent[800],
                color: colors.grey[100],
                padding: { xs: '10px 20px', sm: '12px 24px' },
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: colors.grey[600],
                },
              }}
            >
              Sign In
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Rest of the page remains unchanged */}
      {/* Features Section */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          py: '60px',
          px: { xs: 2, sm: 3, md: '20px' },
          textAlign: 'center',
          backgroundColor: colors.primary[800],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '1.8rem', sm: '2rem', md: '3rem' },
          }}
        >
          Why Choose Cryptological?
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: '30px',
            justifyContent: 'center',
            alignItems: { xs: 'center', md: 'flex-start' },
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ maxWidth: '300px', width: '100%', textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Comprehensive Charts
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Access daily Bitcoin, Ethereum, and altcoin price charts, plus advanced risk metrics and market cycle analysis.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', width: '100%', textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Market Insights
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Stay informed with macro-economic data, market sentiment, and altcoin performance indicators.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', width: '100%', textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              User-Friendly
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Intuitive design and easy-to-use tools for both beginners and advanced crypto enthusiasts.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Chart Previews Section */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          py: '60px',
          px: { xs: 2, sm: 3, md: '20px' },
          textAlign: 'center',
          backgroundColor: colors.primary[900],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '1.8rem', sm: '2rem', md: '3rem' },
          }}
        >
          Chart Previews
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: '30px',
            justifyContent: 'center',
            alignItems: { xs: 'center', md: 'flex-start' },
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ maxWidth: '300px', width: '100%' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Customisable user dashboard
            </Typography>
            <Box
              sx={{
                height: '150px',
                backgroundColor: colors.primary[800],
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                alt="dashboard"
                width="100%"
                height="100%"
                src="/assets/dashboard.png"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Box>
          <Box sx={{ maxWidth: '300px', width: '100%' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Fear and Greed Chart
            </Typography>
            <Box
              sx={{
                height: '150px',
                backgroundColor: colors.primary[800],
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                alt="fear and greed chart"
                width="100%"
                height="100%"
                src="/assets/fearAndGreed.png"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Box>
          <Box sx={{ maxWidth: '300px', width: '100%' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Risk Metric
            </Typography>
            <Box
              sx={{
                height: '150px',
                backgroundColor: colors.primary[800],
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                alt="bitcoin risk metric"
                width="100%"
                height="100%"
                src="/assets/riskMetric.png"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Box>
          <Box sx={{ maxWidth: '300px', width: '100%' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Bitcoin Price versus Risk
            </Typography>
            <Box
              sx={{
                height: '150px',
                backgroundColor: colors.primary[800],
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                alt="bitcoin price v risk"
                width="100%"
                height="100%"
                src="/assets/priceVRisk.png"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* How to Use Section */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          py: '60px',
          px: { xs: 2, sm: '20px' },
          textAlign: 'center',
          backgroundColor: colors.primary[800],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '1.8rem', sm: '2rem', md: '3rem' },
          }}
        >
          How to Use Cryptological
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: '30px',
            justifyContent: 'center',
            alignItems: { xs: 'center', md: 'flex-start' },
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ maxWidth: '300px', width: '100%', textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Step 1: Sign Up
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Create an account to access all features and customize your dashboard.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', width: '100%', textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Step 2: Explore Charts
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Navigate through various charts and indicators to analyze the market.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', width: '100%', textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Step 3: Upgrade
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Upgrade to a premium plan for advanced features and deeper insights.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Subscription Options Section */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          py: '60px',
          px: { xs: 2, sm: '20px' },
          textAlign: 'center',
          backgroundColor: colors.primary[900],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '1.8rem', sm: '2rem', md: '3rem' },
          }}
        >
          Subscription Options
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: '30px',
            justifyContent: 'center',
            alignItems: { xs: 'center', md: 'flex-start' },
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              maxWidth: '300px',
              width: '100%',
              padding: '20px',
              backgroundColor: colors.primary[800],
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(141, 53, 53, 0.1)',
            }}
          >
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Free Plan
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300], marginBottom: '20px' }}>
              • Access to basic charts<br />
              • Limited indicators<br />
              • Community support
            </Typography>
            <Button
              component={Link}
              to="/login-signup?mode=signup"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                padding: '10px 20px',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: colors.greenAccent[600],
                },
              }}
            >
              Get Started
            </Button>
          </Box>
          <Box
            sx={{
              maxWidth: '300px',
              width: '100%',
              padding: '20px',
              backgroundColor: colors.primary[800],
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(141, 53, 53, 0.1)',
              border: `2px solid ${colors.greenAccent[500]}`,
            }}
          >
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Premium Plan
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300], marginBottom: '20px' }}>
              • Full access to all charts<br />
              • Advanced indicators & metrics<br />
              • Priority support
            </Typography>
            <Button
              component={Link}
              to="/login-signup?mode=signup&plan=premium"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                padding: '10px 20px',
                fontWeight: 'bold',
                animation: 'pulse 2s infinite',
                '&:hover': {
                  backgroundColor: colors.greenAccent[600],
                },
              }}
            >
              Upgrade Now
            </Button>
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: colors.grey[400], marginTop: '20px' }}
        >
          Limited Offer: Unlock Premium features starting at £30/month!
        </Typography>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          width: '100%',
          py: '20px',
          textAlign: 'center',
          backgroundColor: colors.primary[800],
          color: colors.grey[400],
          fontSize: '0.9rem',
        }}
      >
        <Typography>
          © {new Date().getFullYear()} Cryptological. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default SplashPage;