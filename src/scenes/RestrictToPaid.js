import React, { memo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Box, Typography, useTheme, Button, CircularProgress } from '@mui/material';
import { tokens } from '../theme';
import { Link } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';

// Dev bypass: when REACT_APP_DEV_BYPASS_AUTH=true, premium charts render fully
// without any Clerk sign-in or subscription checks. Useful for local development.
const DEV_BYPASS_AUTH = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

const StatusMessage = memo(({ children }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh',
      padding: '20px',
      textAlign: 'center',
      gap: 2,
    }}
  >
    {children}
  </Box>
));

const LoadingStatus = memo(({ colors }) => (
  <StatusMessage>
    <CircularProgress size={40} sx={{ color: colors.greenAccent[500] }} />
    <Typography variant="body1" sx={{ color: colors.grey[300] }}>
      Verifying access...
    </Typography>
  </StatusMessage>
));

// Memoize the RestrictedComponent to prevent unnecessary re-renders
const RestrictedComponent = memo(
  ({
    WrappedComponent,
    props,
    fallbackMessage,
    subscriptionStatus,
    loading,
    error,
    isLoaded,
    isSignedIn,
    user,
    colors,
    onRetry,
  }) => {
    if (!isLoaded) {
      return <LoadingStatus colors={colors} />;
    }

    if (!isSignedIn || !user) {
      return (
        <StatusMessage>
          <Typography variant="h5" sx={{ color: colors.grey[100] }}>
            Please sign in to view this chart.
          </Typography>
        </StatusMessage>
      );
    }

    // Wait for a confirmed subscription status before showing upgrade messaging.
    if (loading || !subscriptionStatus) {
      return <LoadingStatus colors={colors} />;
    }

    if (error) {
      return (
        <StatusMessage>
          <Typography variant="h6" sx={{ color: colors.grey[100] }}>
            {error}
          </Typography>
          <Button
            onClick={onRetry}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              fontWeight: 'bold',
              '&:hover': { backgroundColor: colors.greenAccent[600] },
            }}
          >
            Try again
          </Button>
        </StatusMessage>
      );
    }

    // Check if user has premium access (authoritative from backend, which includes grace period logic)
    // or fallback canceled/canceling with valid current_period_end + grace (1 day buffer to match backend GRACE_PERIOD).
    // This prevents clock skew / race conditions from prematurely revoking access.
    const hasPremiumAccess = subscriptionStatus.access === 'Full';
    const rawStatus = (subscriptionStatus.subscription_status || '').toLowerCase();
    const GRACE_MS = 24 * 60 * 60 * 1000; // 1 day, matching backend
    const isCancelledButValid =
      (rawStatus === 'canceled' || rawStatus === 'canceling') &&
      subscriptionStatus.current_period_end &&
      subscriptionStatus.current_period_end > new Date(Date.now() - GRACE_MS);

    if (hasPremiumAccess || isCancelledButValid) {
      return <WrappedComponent {...props} />;
    }

    return (
      <StatusMessage>
        <Typography variant="h5" sx={{ color: colors.grey[100] }}>
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
      </StatusMessage>
    );
  }
);

const restrictToPaidSubscription = (
  WrappedComponent,
  fallbackMessage = 'Please upgrade to a paid subscription to view this chart.'
) => {
  return (props) => {
    // Hooks must be called unconditionally (rules-of-hooks compliance).
    const { user, isSignedIn } = useUser();
    const { isLoaded } = useAuth();
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { subscriptionStatus, loading, error, fetchSubscriptionStatus } = useSubscription();

    if (DEV_BYPASS_AUTH) {
      // In local dev bypass mode, render the real premium component directly.
      return <WrappedComponent {...props} />;
    }

    return (
      <RestrictedComponent
        WrappedComponent={WrappedComponent}
        props={props}
        fallbackMessage={fallbackMessage}
        subscriptionStatus={subscriptionStatus}
        loading={loading}
        error={error}
        isLoaded={isLoaded}
        isSignedIn={isSignedIn}
        user={user}
        colors={colors}
        onRetry={fetchSubscriptionStatus}
      />
    );
  };
};

export default restrictToPaidSubscription;