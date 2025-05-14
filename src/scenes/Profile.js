import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';
import Header from '../components/Header';

const Profile = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    plan: 'Free',
    billing_interval: 'NONE',
    subscription_status: 'free',
    current_period_end: null,
    last_payment_date: null,
    payment_method: null,
    subscription_start_date: null,
    display_name: 'User',
    features: { basic_charts: true, advanced_charts: false, custom_indicators: false },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://vercel-dataflow.vercel.app';

  const fetchSubscriptionStatus = async () => {
    if (!isSignedIn || !user) {
      setError('Please sign in to view your profile.');
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
        billing_interval: data.billing_interval || 'NONE',
        subscription_status: data.subscription_status || 'free',
        current_period_end: data.current_period_end ? new Date(data.current_period_end) : null,
        last_payment_date: data.last_payment_date ? new Date(data.last_payment_date) : null,
        payment_method: data.payment_method || null,
        subscription_start_date: data.subscription_start_date ? new Date(data.subscription_start_date) : null,
        display_name: data.display_name || 'User',
        features: data.features && typeof data.features === 'object' ? data.features : {
          basic_charts: true,
          advanced_charts: false,
          custom_indicators: false,
        },
      });
    } catch (err) {
      setError(`Failed to fetch subscription status: ${err.message}`);
      setSubscriptionStatus({
        plan: 'Free',
        billing_interval: 'NONE',
        subscription_status: 'free',
        current_period_end: null,
        last_payment_date: null,
        payment_method: null,
        subscription_start_date: null,
        display_name: 'User',
        features: { basic_charts: true, advanced_charts: false, custom_indicators: false },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && user) {
      fetchSubscriptionStatus();
    }
  }, [isSignedIn, user]);

  if (!isSignedIn || !user) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: colors.grey[100] }}>
          Please sign in to view your profile.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.primary[900],
        padding: '20px',
      }}
    >
      <Header title="Profile" subtitle="Your account details" />
      <Box
        sx={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: colors.primary[800],
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {error && (
          <Typography variant="body1" sx={{ color: colors.redAccent[500], mb: 2 }}>
            {error}
          </Typography>
        )}
        {loading && (
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            Loading...
          </Typography>
        )}
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Subscription Details
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Plan:</strong> {subscriptionStatus.plan} ({subscriptionStatus.billing_interval})
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Status:</strong> {subscriptionStatus.subscription_status}
          </Typography>
          {subscriptionStatus.payment_method && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Payment Method:</strong> {subscriptionStatus.payment_method}
            </Typography>
          )}
          {subscriptionStatus.last_payment_date && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Last Payment:</strong> {subscriptionStatus.last_payment_date.toLocaleDateString()}
            </Typography>
          )}
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Display Name:</strong> {subscriptionStatus.display_name}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            <strong>Features:</strong> Basic Charts: {subscriptionStatus.features.basic_charts ? 'Yes' : 'No'},
            Advanced Charts: {subscriptionStatus.features.advanced_charts ? 'Yes' : 'No'},
            Custom Indicators: {subscriptionStatus.features.custom_indicators ? 'Yes' : 'No'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;

// import React from 'react';
// import { useUser } from '@clerk/clerk-react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { Box, Typography, useTheme, Alert } from '@mui/material';
// import { tokens } from '../theme';
// import Header from '../components/Header';

// const Profile = () => {
//   const theme = useTheme();
//   const colors = tokens(theme.palette.mode);
//   const { user, isSignedIn } = useUser();
//   const location = useLocation();
//   const navigate = useNavigate();

//   const [error, setError] = React.useState('');

//   // Extract data from Clerk metadata
//   const plan = user?.publicMetadata?.plan || 'Free';
//   const billingInterval = user?.publicMetadata?.billing_interval || 'NONE';
//   const subscriptionStatus = user?.publicMetadata?.subscription_status || 'ACTIVE';
//   const features = user?.publicMetadata?.features || { basic_charts: true };

//   // Filter features to only show keys where value is true
//   const activeFeatures = Object.keys(features)
//     .filter((key) => features[key] === true)
//     .join(', ');

//   React.useEffect(() => {
//     const query = new URLSearchParams(location.search);
//     if (query.get('success')) {
//       navigate('/profile', { replace: true });
//     }
//   }, [location, navigate]);

//   if (!isSignedIn || !user) {
//     return (
//       <Box
//         sx={{
//           minHeight: '100vh',
//           backgroundColor: colors.primary[900],
//           padding: '20px',
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}
//       >
//         <Typography variant="h5" sx={{ color: colors.grey[100] }}>
//           Please sign in to view your profile.
//         </Typography>
//       </Box>
//     );
//   }

//   return (
//     <Box
//       sx={{
//         minHeight: '100vh',
//         backgroundColor: colors.primary[900],
//         padding: '20px',
//       }}
//     >
//       <Header title="Profile" subtitle="View your account details" />
//       <Box
//         sx={{
//           maxWidth: '800px',
//           margin: '0 auto',
//           backgroundColor: colors.primary[800],
//           borderRadius: '8px',
//           padding: '20px',
//           boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
//         }}
//       >
//         {error && (
//           <Alert severity="error" sx={{ mb: 2 }}>
//             {error}
//           </Alert>
//         )}
//         <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
//           Account Information
//         </Typography>
//         <Box sx={{ mb: 3 }}>
//           <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
//             <strong>Email:</strong> {user.primaryEmailAddress?.emailAddress || 'N/A'}
//           </Typography>
//           {/* <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
//             <strong>Name:</strong> {user.fullName || 'N/A'}
//           </Typography> */}
//         </Box>

//         <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
//           Subscription Details
//         </Typography>
//         <Box sx={{ mb: 3 }}>
//           <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
//             <strong>Plan:</strong> {plan} ({billingInterval})
//           </Typography>
//           <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
//             <strong>Status:</strong> {subscriptionStatus}
//           </Typography>
//           <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
//             <strong>Features:</strong> {activeFeatures || 'None'}
//           </Typography>
//         </Box>
//       </Box>
//     </Box>
//   );
// };

// export default Profile;