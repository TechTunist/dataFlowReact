import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';

const restrictToPaidSubscription = (WrappedComponent, fallbackMessage = "Please upgrade to a paid subscription to view this chart.") => {
  return (props) => {
    const { user, isSignedIn } = useUser();
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    // If user is not signed in, show a message
    if (!isSignedIn || !user) {
      return (
        <Box sx={{ padding: '20px', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ color: colors.grey[100] }}>
            Please sign in to view this chart.
          </Typography>
        </Box>
      );
    }

    // Get the plan from Clerk metadata
    const plan = user?.publicMetadata?.plan || 'Free';
    const isPaidSubscription = plan !== 'Free'; // Paid if plan is not "Free"

    // Render the component if the user has a paid subscription
    if (isPaidSubscription) {
      return <WrappedComponent {...props} />;
    }

    // Otherwise, show a fallback message
    return (
      <Box sx={{ padding: '20px', textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: colors.grey[100] }}>
          {fallbackMessage}
        </Typography>
      </Box>
    );
  };
};

export default restrictToPaidSubscription;