import React, { useState, useEffect, useContext } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, useTheme, Button, Alert } from '@mui/material';
import { tokens } from '../theme';
import Header from '../components/Header';
import { StripeContext } from '../App';

const Subscription = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const stripe = useContext(StripeContext);

  const [subscriptionStatus, setSubscriptionStatus] = useState({
    plan: user?.publicMetadata?.plan || 'Free',
    billing_interval: user?.publicMetadata?.billing_interval || 'NONE',
    subscription_status: 'free',
    current_period_end: null,
    last_payment_date: null,
    payment_method: null,
    subscription_start_date: null,
    display_name: '',
    features: user?.publicMetadata.features || { basic_charts: true, advanced_charts: false, custom_indicators: false },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://vercel-dataflow.vercel.app';

  const plans = [
    { id: 7, name: 'Premium', billing_interval: 'MONTHLY', price: 30.00 },
    { id: 9, name: 'Annual', billing_interval: 'YEARLY', price: 300.00 },
    { id: 10, name: 'Lifetime', billing_interval: 'ONE_TIME', price: 2500.00 },
  ];

  const fetchSubscriptionStatus = async () => {
    if (!isSignedIn || !user) {
      setError('Please sign in to view subscription status.');
      return;
    }

    setLoading(true);
    setError('');
    console.log('Fetching subscription status...');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      console.log('Subscription status token:', token);

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
      // Fallback to publicMetadata if database data is incomplete
      if (data.plan === 'Free' && user?.publicMetadata?.plan && user.publicMetadata.plan !== 'Free') {
        console.log('Falling back to publicMetadata due to incomplete database data');
        setSubscriptionStatus({
          plan: user.publicMetadata.plan,
          billing_interval: user.publicMetadata.billing_interval || 'NONE',
          subscription_status: user.publicMetadata.subscription_status || 'ACTIVE',
          features: user.publicMetadata.features || { basic_charts: true, advanced_charts: false, custom_indicators: false },
          current_period_end: data.current_period_end,
          last_payment_date: data.last_payment_date,
          payment_method: data.payment_method,
          subscription_start_date: data.subscription_start_date,
          display_name: data.display_name,
        });
      } else {
        setSubscriptionStatus(data);
      }
      console.log('Subscription status fetched:', data);
    } catch (err) {
      setError(`Failed to fetch subscription status: ${err.message}`);
      console.error('Subscription status error:', err);
      // Fallback to publicMetadata on error
      if (user?.publicMetadata?.plan) {
        setSubscriptionStatus({
          plan: user.publicMetadata.plan || 'Free',
          billing_interval: user.publicMetadata.billing_interval || 'NONE',
          subscription_status: user.publicMetadata.subscription_status || 'free',
          features: user.publicMetadata.features || { basic_charts: true, advanced_charts: false, custom_indicators: false },
          current_period_end: null,
          last_payment_date: null,
          payment_method: null,
          subscription_start_date: null,
          display_name: '',
        });
      }
    } finally {
      setLoading(false);
      console.log('Fetch subscription status complete, loading:', false);
    }
  };

  const handleCheckout = async (planId) => {
    if (!isSignedIn || !user) {
      setError('Please sign in to subscribe.');
      return;
    }

    if (!stripe) {
      setError('Stripe is not initialized. Please wait or refresh the page.');
      return;
    }

    setLoading(true);
    setError('');
    console.log('Initiating checkout for plan ID:', planId);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      console.log('Checkout token:', token);

      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = { error: 'Invalid response format' };
      }

      if (!response.ok) {
        let errorMessage = responseData.error || 'Unknown error';
        if (errorMessage.includes('Cannot create subscription')) {
          errorMessage = 'Currency mismatch: Your existing subscription is in a different currency. Please cancel it or contact support.';
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
      }

      const { sessionId } = responseData;
      console.log('Stripe checkout session ID:', sessionId);
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        console.error('Stripe redirect error:', error);
        throw new Error(`Failed to redirect to checkout: ${error.message}`);
      }
    } catch (err) {
      setError(`Failed to initiate checkout: ${err.message}`);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('success')) {
      fetchSubscriptionStatus();
      navigate('/profile', { replace: true }); // Redirect to /profile
    } else if (query.get('canceled')) {
      setError('Checkout was canceled. Please try again.');
      navigate('/subscription', { replace: true });
    }
  }, [location, navigate]);

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
          Please sign in to view subscription options.
        </Typography>
      </Box>
    );
  }

  // Feature gating logic
  const canAccessAdvancedCharts = subscriptionStatus.features.advanced_charts;
  const canAccessCustomIndicators = subscriptionStatus.features.custom_indicators;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.primary[900],
        padding: '20px',
      }}
    >
      <Header title="Subscription" subtitle="Manage your plan" />
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
          Current Plan
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Plan:</strong> {subscriptionStatus.plan} ({subscriptionStatus.billing_interval})
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Status:</strong> {subscriptionStatus.subscription_status}
          </Typography>
          {subscriptionStatus.current_period_end && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Period End:</strong> {new Date(subscriptionStatus.current_period_end).toLocaleDateString()}
            </Typography>
          )}
          {subscriptionStatus.payment_method && (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
              <strong>Payment Method:</strong> {subscriptionStatus.payment_method}
            </Typography>
          )}
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            <strong>Features:</strong> Basic Charts: {subscriptionStatus.features.basic_charts ? 'Yes' : 'No'},
            Advanced Charts: {subscriptionStatus.features.advanced_charts ? 'Yes' : 'No'},
            Custom Indicators: {subscriptionStatus.features.custom_indicators ? 'Yes' : 'No'}
          </Typography>
        </Box>

        {/* Feature Gating Examples */}
        {/* <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Available Features
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
            Basic Charts
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
            Access to basic charting tools is available to all users.
          </Typography>

          <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
            Advanced Charts
          </Typography>
          {canAccessAdvancedCharts ? (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
              You have access to advanced charts! Explore enhanced charting features.
              <Button
                onClick={() => navigate('/charts/advanced')}
                sx={{
                  ml: 2,
                  backgroundColor: colors.greenAccent[500],
                  color: colors.grey[900],
                  '&:hover': { backgroundColor: colors.greenAccent[600] },
                }}
              >
                Go to Advanced Charts
              </Button>
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
              Upgrade to a Premium, Annual, or Lifetime plan to access advanced charts.
            </Typography>
          )}

          <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
            Custom Indicators
          </Typography>
          {canAccessCustomIndicators ? (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
              You have access to custom indicators! Create and use your own indicators.
              <Button
                onClick={() => navigate('/indicators/custom')}
                sx={{
                  ml: 2,
                  backgroundColor: colors.greenAccent[500],
                  color: colors.grey[900],
                  '&:hover': { backgroundColor: colors.greenAccent[600] },
                }}
              >
                Go to Custom Indicators
              </Button>
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
              Upgrade to an Annual or Lifetime plan to access custom indicators.
            </Typography>
          )}
        </Box> */}

        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Available Plans
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plans.map((plan) => (
            <Box
              key={plan.id}
              sx={{
                backgroundColor: colors.primary[700],
                borderRadius: '4px',
                padding: '15px',
              }}
            >
              <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                {plan.name} ({plan.billing_interval})
              </Typography>
              <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
                Price: ${plan.price}
              </Typography>
              <Button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading || subscriptionStatus.plan === plan.name || !stripe}
                sx={{
                  backgroundColor: colors.greenAccent[500],
                  color: colors.grey[900],
                  '&:hover': { backgroundColor: colors.greenAccent[600] },
                  '&:disabled': { backgroundColor: colors.grey[700], color: colors.grey[400] },
                }}
              >
                {subscriptionStatus.plan === plan.name ? 'Subscribed' : 'Subscribe'}
              </Button>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Subscription;