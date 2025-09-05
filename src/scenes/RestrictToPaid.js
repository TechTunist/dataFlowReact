import React, { memo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Box, Typography, useTheme, Button } from '@mui/material';
import { tokens } from '../theme';
import { Link } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';

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
    // Check if user has premium access or a canceled subscription with valid current_period_end
    const hasPremiumAccess = subscriptionStatus.access === 'Full';
    const isCancelledButValid =
      subscriptionStatus.subscription_status === 'canceled' &&
      subscriptionStatus.current_period_end &&
      subscriptionStatus.current_period_end > new Date();
    if (hasPremiumAccess || isCancelledButValid) {
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
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { subscriptionStatus, loading, error } = useSubscription();
    return (
      <RestrictedComponent
        WrappedComponent={WrappedComponent}
        props={props}
        fallbackMessage={fallbackMessage}
        subscriptionStatus={subscriptionStatus || { plan: 'Free', subscription_status: 'free', current_period_end: null, access: 'Limited', features: DEFAULT_FREE_FEATURES }}
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