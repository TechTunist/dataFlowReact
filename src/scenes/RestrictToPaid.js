import React, { memo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Box, Typography, useTheme, CircularProgress } from '@mui/material';
import { tokens } from '../theme';



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
    isLoaded,
    isSignedIn,
    user,
    colors,
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

    return <WrappedComponent {...props} />;
  }
);

const restrictToPaidSubscription = (WrappedComponent) => {
  return (props) => {
    // Hooks must be called unconditionally (rules-of-hooks compliance).
    const { user, isSignedIn } = useUser();
    const { isLoaded } = useAuth();
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    if (DEV_BYPASS_AUTH) {
      return <WrappedComponent {...props} />;
    }

    return (
      <RestrictedComponent
        WrappedComponent={WrappedComponent}
        props={props}
        isLoaded={isLoaded}
        isSignedIn={isSignedIn}
        user={user}
        colors={colors}
      />
    );
  };
};

export default restrictToPaidSubscription;