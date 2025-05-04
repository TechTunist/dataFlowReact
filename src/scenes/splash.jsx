// src/scenes/splash.js
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
        padding: '0 20px',
      }}
    >
      {/* Main Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px',
        }}
      >
        <Box
          sx={{
            maxWidth: '800px',
            textAlign: 'center',
            padding: '40px',
            backgroundColor: colors.primary[800],
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(141, 53, 53, 0.1)',
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: colors.grey[100],
              marginBottom: '20px',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
            }}
          >
            Welcome to Cryptological
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: colors.grey[300],
              marginBottom: '30px',
              fontSize: { xs: '1.2rem', md: '1.5rem' },
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
              to="/login-signup"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                padding: '12px 24px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: colors.greenAccent[600],
                },
              }}
            >
              Sign In / Sign Up
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Features Section */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          py: '60px',
          px: '20px',
          textAlign: 'center',
          backgroundColor: colors.primary[800],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '2rem', md: '3rem' },
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
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ maxWidth: '300px', textAlign: 'left' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Comprehensive Charts
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Access daily Bitcoin, Ethereum, and altcoin price charts, plus advanced risk metrics and market cycle analysis.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', textAlign: 'left' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Market Insights
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Stay informed with macro-economic data, market sentiment, and altcoin performance indicators.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', textAlign: 'left' }}>
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
          py: '60px',
          px: '20px',
          textAlign: 'center',
          backgroundColor: colors.primary[900],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '2rem', md: '3rem' },
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
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ maxWidth: '300px' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Bitcoin Price Chart
            </Typography>
            <Box
              sx={{
                height: '150px',
                backgroundColor: colors.primary[800],
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.grey[400],
              }}
            >
              [Placeholder for Bitcoin Chart]
            </Box>
          </Box>
          <Box sx={{ maxWidth: '300px' }}>
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
                color: colors.grey[400],
              }}
            >
              [Placeholder for Risk Metric]
            </Box>
          </Box>
        </Box>
      </Box>

      {/* How to Use Section */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          py: '60px',
          px: '20px',
          textAlign: 'center',
          backgroundColor: colors.primary[800],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '2rem', md: '3rem' },
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
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ maxWidth: '300px', textAlign: 'left' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Step 1: Sign Up
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Create an account to access all features and customize your dashboard.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', textAlign: 'left' }}>
            <Typography variant="h5" sx={{ color: colors.grey[200], marginBottom: '10px' }}>
              Step 2: Explore Charts
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300] }}>
              Navigate through various charts and indicators to analyze the market.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: '300px', textAlign: 'left' }}>
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
          py: '60px',
          px: '20px',
          textAlign: 'center',
          backgroundColor: colors.primary[900],
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            marginBottom: '40px',
            fontSize: { xs: '2rem', md: '3rem' },
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
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              maxWidth: '300px',
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
              to="/login-signup"
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
              padding: '20px',
              backgroundColor: colors.primary[800],
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(141, 53, 53, 0.1)',
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
              to="/login-signup"
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
              Upgrade Now
            </Button>
          </Box>
        </Box>
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