import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Box, Typography, useTheme, Alert } from '@mui/material';
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
    subscription_status: 'ACTIVE',
    display_name: '',
    current_period_end: null,
    last_payment_date: null,
    payment_method: null,
    subscription_start_date: null,
    features: { basic_charts: true },
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
      console.log('Profile token:', token);

      const response = await fetch(`${API_BASE_URL}/api/subscription-status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Invalid response format' };
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const data = errorData;
      setSubscriptionStatus(data);
    } catch (err) {
      setError(`Failed to fetch profile: ${err.message}`);
      console.error('Profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && user) {
      fetchSubscriptionStatus();
    }
  }, [user, isSignedIn]);

  if (!isSignedIn || !user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: colors.primary[900],
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
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
      <Header title="Profile" subtitle="View your account details" />
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
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading && (
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            Loading...
          </Typography>
        )}
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Account Details
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Name:</strong> {subscriptionStatus.display_name || user.firstName + ' ' + user.lastName}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Email:</strong> {user.emailAddresses[0]?.emailAddress || 'N/A'}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Plan:</strong> {subscriptionStatus.plan} ({subscriptionStatus.billing_interval})
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Status:</strong> {subscriptionStatus.subscription_status}
          </Typography>
          {subscriptionStatus.subscription_start_date && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Member Since:</strong>{' '}
              {new Date(subscriptionStatus.subscription_start_date).toLocaleDateString()}
            </Typography>
          )}
          {subscriptionStatus.last_payment_date && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Last Payment:</strong>{' '}
              {new Date(subscriptionStatus.last_payment_date).toLocaleDateString()}
            </Typography>
          )}
          {subscriptionStatus.current_period_end && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Next Billing:</strong>{' '}
              {new Date(subscriptionStatus.current_period_end).toLocaleDateString()}
            </Typography>
          )}
          {subscriptionStatus.payment_method && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Payment Method:</strong> {subscriptionStatus.payment_method}
            </Typography>
          )}
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            <strong>Features:</strong> {JSON.stringify(subscriptionStatus.features)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;