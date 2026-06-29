import React, { useState, useEffect, useContext, memo, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  useTheme,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { tokens } from '../theme';
import Header from '../components/Header';
import { StripeContext } from '../App';
import { apiUrl } from '../config/api';
import { useSubscription } from '../contexts/SubscriptionContext';
import { trackCheckoutStarted } from '../utils/plausibleEvents';

const Subscription = memo(() => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const stripe = useContext(StripeContext);
  const {
    subscriptionStatus: ctxSubscriptionStatus,
    loading: ctxLoading,
    error: ctxError,
    fetchSubscriptionStatus: ctxFetchSubscriptionStatus,
  } = useSubscription();

  // Local UI state only (for errors/success/dialog/currency during this session's actions)
  // Use context for the actual subscription data (single source of truth, avoids duplication with Profile/Context)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const plans = [
    { id: 11, name: 'Full Access', billing_interval: 'MONTHLY', price_gbp: 10.00, price_usd: 13.45 },
  ];
  const autoCheckoutAttempted = useRef(false);

  // Prefer context values; fall back to sensible defaults if not yet loaded
  const subscriptionStatus = ctxSubscriptionStatus || {
    plan: 'Free',
    billing_interval: 'NONE',
    subscription_status: 'free',
    current_period_end: null,
    last_payment_date: null,
    payment_method: null,
    subscription_start_date: null,
    display_name: 'User',
    access: 'Limited',
    previous_plan: null,
  };

  // Delegate to context fetch for single source of truth (reduces duplication across Subscription/Profile/Context)
  // Local loading/error/success are for action-specific UI feedback only.
  const fetchSubscriptionStatus = async () => {
    if (!isSignedIn || !user) {
      setError('Please sign in to view subscription status.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await ctxFetchSubscriptionStatus();
      // Context will have updated; any ctxError will surface via the hook value below if needed
    } catch (err) {
      setError(`Failed to fetch subscription status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId, currency) => {
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
    setSuccess('');
    trackCheckoutStarted('subscription-page');
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/create-checkout-session/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: planId, currency: currency.toUpperCase() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }
      const responseData = await response.json();
      const { sessionId, url } = responseData;
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        console.error('Stripe redirect error:', error);
        window.location.href = url;
        setError('Automatic redirect failed, opening Checkout manually.');
      }
    } catch (err) {
      setError(`Failed to initiate checkout: ${err.message}`);
      console.error('Checkout catch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!isSignedIn || !user) {
      setError('Please sign in to manage your subscription.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/create-portal-session/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        throw new Error('Invalid response format');
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseData.error || 'Unknown error'}`);
      }
      window.location.href = responseData.url;
    } catch (err) {
      setError(`Failed to access billing portal: ${err.message}`);
      console.error('Portal session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!isSignedIn || !user) {
      setError('Please sign in to cancel your subscription.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/cancel-subscription/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = { error: 'Invalid response format' };
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseData.error || 'Unknown error'}`);
      }
      setSuccess('Your subscription has been cancelled successfully.');
      await fetchSubscriptionStatus();
    } catch (err) {
      setError(`Failed to cancel subscription: ${err.message}`);
      console.error('Cancellation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelDialog = () => {
    setOpenCancelDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
  };

  const handleConfirmCancel = () => {
    setOpenCancelDialog(false);
    handleCancelSubscription();
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('success')) {
      fetchSubscriptionStatus();
      navigate('/subscription', { replace: true });
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

  // Premium signup intent: auto-redirect to Stripe after account creation.
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (!query.get('checkout')) return;
    if (!isSignedIn || !user || !stripe || loading || ctxLoading) return;
    if (autoCheckoutAttempted.current) return;
    if (subscriptionStatus.access === 'Full') return;

    autoCheckoutAttempted.current = true;
    const defaultPlan = plans[0];
    handleCheckout(defaultPlan.id, selectedCurrency);
    navigate('/subscription', { replace: true });
  }, [
    location.search,
    isSignedIn,
    user,
    stripe,
    loading,
    ctxLoading,
    subscriptionStatus.plan,
    subscriptionStatus.access,
    selectedCurrency,
    navigate,
  ]);

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
        <Typography variant="body1" sx={{ color: colors.grey[100] }}>
          Please sign in to view subscription options.
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
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        {subscriptionStatus.subscription_status === 'past_due' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your subscription payment is past due. Please update your payment method to restore access.
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
          <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
            <strong>Plan:</strong>{' '}
            {['canceling', 'canceled'].includes(subscriptionStatus.subscription_status) || (subscriptionStatus.display_status || '').toLowerCase().includes('access ends') ? (
              <>
                {subscriptionStatus.plan} ({subscriptionStatus.billing_interval}) - Retained access until period end
              </>
            ) : (
              <>
                {subscriptionStatus.plan} ({subscriptionStatus.billing_interval})
              </>
            )}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
            <strong>Status:</strong> {subscriptionStatus.display_status || subscriptionStatus.subscription_status}
          </Typography>
          {/* For live subs: show Next Payment Due using raw internal status + date */}
          {subscriptionStatus.current_period_end && ['active', 'past_due'].includes(subscriptionStatus.subscription_status) && (
            <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
              <strong>Next Payment Due:</strong>{' '}
              {new Date(subscriptionStatus.current_period_end).toLocaleDateString()}
            </Typography>
          )}
          {/* For canceling/canceled + future: Access Ends (per ToDo: if cancelled read "access ends") */}
          {['canceling', 'canceled'].includes(subscriptionStatus.subscription_status) && subscriptionStatus.current_period_end && (
            <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
              <strong>Access Ends:</strong> {new Date(subscriptionStatus.current_period_end).toLocaleDateString()}
            </Typography>
          )}
          {subscriptionStatus.payment_method && (
            <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
              <strong>Payment Method:</strong> {subscriptionStatus.payment_method}
            </Typography>
          )}
          {subscriptionStatus.last_payment_date && (
            <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
              <strong>Last Payment:</strong> {new Date(subscriptionStatus.last_payment_date).toLocaleDateString()}
            </Typography>
          )}
          <Typography variant="body1" sx={{ color: colors.grey[100], mb: 2 }}>
            <strong>Access:</strong> {subscriptionStatus.access}
          </Typography>
          {['active', 'past_due', 'canceling'].includes(subscriptionStatus.subscription_status) && (
            <Button
              onClick={handleManageSubscription}
              disabled={loading}
              sx={{
                backgroundColor: colors.blueAccent[500],
                color: colors.grey[100],
                '&:hover': { backgroundColor: colors.blueAccent[600] },
                '&:disabled': { backgroundColor: colors.grey[700], color: colors.grey[400] },
                mr: 2,
                mt: 2,
              }}
            >
              Manage Subscription
            </Button>
          )}
          {subscriptionStatus.subscription_status === 'active' && (
            <Button
              onClick={handleOpenCancelDialog}
              disabled={loading}
              sx={{
                backgroundColor: colors.redAccent[500],
                color: colors.grey[100],
                '&:hover': { backgroundColor: colors.redAccent[600] },
                '&:disabled': { backgroundColor: colors.grey[700], color: colors.grey[400] },
                mt: 2,
              }}
            >
              Cancel Subscription
            </Button>
          )}
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
            Select Currency:
          </Typography>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            style={{
              backgroundColor: colors.primary[900],
              color: colors.grey[100],
              border: `1px solid ${colors.grey[500]}`,
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            <option value="GBP">GBP (£)</option>
            <option value="USD">USD ($)</option>
          </select>
        </Box>
        <Dialog
          open={openCancelDialog}
          onClose={handleCloseCancelDialog}
          aria-labelledby="cancel-subscription-dialog-title"
          aria-describedby="cancel-subscription-dialog-description"
        >
          <DialogTitle id="cancel-subscription-dialog-title">Confirm Subscription Cancellation</DialogTitle>
          <DialogContent>
            <DialogContentText id="cancel-subscription-dialog-description">
              Are you sure you want to cancel your subscription? You will retain access to premium features until{' '}
              {subscriptionStatus.current_period_end
                ? new Date(subscriptionStatus.current_period_end).toLocaleDateString()
                : 'the end of your billing period'}
              . You can also manage your subscription, including updating your payment method, via the billing portal.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCancelDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmCancel} color="error" autoFocus>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Available Plans
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plans.map((plan) => (
            <Box
              key={plan.id}
              sx={{
                backgroundColor: colors.primary[900],
                borderRadius: '4px',
                padding: '15px',
              }}
            >
              <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                {plan.name} ({plan.billing_interval})
              </Typography>
              <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
                Price: {selectedCurrency === 'GBP' ? '£' : '$'}{plan[`price_${selectedCurrency.toLowerCase()}`]}
              </Typography>
              <Typography variant="body1" sx={{ color: colors.grey[100], mb: 1 }}>
                Access: Full
              </Typography>
              <Button
                onClick={() => handleCheckout(plan.id, selectedCurrency)}
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
});

export default Subscription;