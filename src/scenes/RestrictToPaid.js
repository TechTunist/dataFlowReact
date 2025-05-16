// src/components/restrictToPaidSubscription.js
import React, { useState, useEffect, useCallback, memo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Box, Typography, useTheme, Button } from '@mui/material';
import { tokens } from '../theme';
import { Link } from 'react-router-dom'; // Import Link for navigation

const DEFAULT_FREE_FEATURES = {
  basic_charts: true,
  advanced_charts: false,
  custom_indicators: false,
};

// Memoize the RestrictedComponent to prevent unnecessary re-renders
const RestrictedComponent = memo(
  ({ WrappedComponent, props, fallbackMessage, subscriptionStatus, loading, error, isSignedIn, user, colors }) => {
    if (!isSignedIn || !user) {
      return (
        <Box sx={{ padding: '20px', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ color: colors.grey[100] }}>
            Please sign in to view this chart.
          </Typography>
        </Box>
      );
    }

    if (loading) {
      return (
        <Box sx={{ padding: '20px', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ color: colors.grey[100] }}>
            Loading subscription status...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ padding: '20px', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ color: colors.grey[100] }}>
            {error}
          </Typography>
        </Box>
      );
    }

    // Check if user has a paid subscription or a cancelled subscription with valid current_period_end
    const isPaidSubscription =
      subscriptionStatus.plan !== 'Free' && subscriptionStatus.subscription_status === 'premium';
    const isCancelledButValid =
      subscriptionStatus.subscription_status === 'canceled' &&
      subscriptionStatus.current_period_end &&
      subscriptionStatus.current_period_end > new Date();

    if (isPaidSubscription || isCancelledButValid) {
      return <WrappedComponent {...props} />;
    }

    return (
      <Box sx={{ padding: '20px', textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: colors.grey[100], mb: 2 }}>
          {fallbackMessage}
        </Typography>
        <Button
          component={Link}
          to="/subscription"
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
    );
  }
);

const restrictToPaidSubscription = (
  WrappedComponent,
  fallbackMessage = 'Please upgrade to a paid subscription to view this chart.'
) => {
  return (props) => {
    const { user, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://vercel-dataflow.vercel.app';

    // Memoize fetchSubscriptionStatus to prevent recreation on every render
    const fetchSubscriptionStatus = useCallback(async () => {
      if (!isSignedIn || !user) {
        setError('Please sign in to view this chart.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Failed to obtain authentication token');
        }

        const response = await fetch(`${API_BASE_URL}/api/subscription-status/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        setSubscriptionStatus({
          plan: data.plan || 'Free',
          subscription_status: data.subscription_status || 'free',
          current_period_end: data.current_period_end ? new Date(data.current_period_end) : null,
          features: data.features && typeof data.features === 'object' ? data.features : DEFAULT_FREE_FEATURES,
        });
      } catch (err) {
        setError(`Failed to fetch subscription status: ${err.message}`);
        setSubscriptionStatus({
          plan: 'Free',
          subscription_status: 'free',
          current_period_end: null,
          features: DEFAULT_FREE_FEATURES,
        });
      } finally {
        setLoading(false);
      }
    }, [isSignedIn, user, getToken]); // Dependencies for useCallback

    useEffect(() => {
      if (isSignedIn && user) {
        fetchSubscriptionStatus();
      }
    }, [isSignedIn, user, fetchSubscriptionStatus]); // Dependencies for useEffect

    return (
      <RestrictedComponent
        WrappedComponent={WrappedComponent}
        props={props}
        fallbackMessage={fallbackMessage}
        subscriptionStatus={subscriptionStatus || { plan: 'Free', subscription_status: 'free', current_period_end: null, features: DEFAULT_FREE_FEATURES }}
        loading={loading}
        error={error}
        isSignedIn={isSignedIn}
        user={user}
        colors={colors}
      />
    );
  };
};

export default restrictToPaidSubscription;