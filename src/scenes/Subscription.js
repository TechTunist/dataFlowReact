import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Subscription = () => {
  const { user, isSignedIn } = useUser();
  const { getToken, session } = useClerk();
  const location = useLocation();
  const navigate = useNavigate();

  const [subscriptionStatus, setSubscriptionStatus] = useState({
    plan: user?.publicMetadata.plan || 'Free',
    billing_interval: user?.publicMetadata.billing_interval || 'NONE',
    subscription_status: 'ACTIVE',
    features: user?.publicMetadata.features || { basic_charts: true },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Available plans (use SubscriptionPlan IDs from backend, not Stripe product IDs)
  const plans = [
    { id: 1, name: 'Premium', billing_interval: 'MONTHLY', price: 30.00 },
    { id: 2, name: 'Premium', billing_interval: 'YEARLY', price: 300.00 },
    { id: 3, name: 'Lifetime', billing_interval: 'ONE_TIME', price: 2500.00 },
  ];

  // Fetch subscription status from backend
  const fetchSubscriptionStatus = async () => {
    if (!isSignedIn || !session) {
      setError('Please sign in to view subscription status.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      console.log('Subscription status token:', token); // Debug

      const response = await fetch('https://vercel-dataflow.vercel.app/api/subscription-status/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      setSubscriptionStatus(data);

      // Update Clerk publicMetadata
      if (user) {
        await user.update({
          publicMetadata: {
            plan: data.plan,
            billing_interval: data.billing_interval,
            features: data.features,
          },
        });
      }
    } catch (err) {
      setError(`Failed to fetch subscription status: ${err.message}`);
      console.error('Subscription status error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle checkout
  const handleCheckout = async (planId) => {
    if (!isSignedIn || !session) {
      setError('Please sign in to subscribe.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      console.log('Checkout token:', token); // Debug

      const response = await fetch('https://vercel-dataflow.vercel.app/api/create-checkout-session/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const { sessionId } = await response.json();
      const stripe = window.Stripe('pk_test_51RL5v0Q2fPLucCvVIKbZAI9ctbXv9kVN2RlnmLmWQSE0a2cZxZBob1E1KOTpUzgOaVrTvusolX5xVK5q17kqkzE500FxIqJDHY');
      await stripe.redirectToCheckout({ sessionId });
    } catch (err) {
      setError(`Failed to initiate checkout: ${err.message}`);
      console.error('Checkout error:', err);
      setLoading(false);
    }
  };

  // Check for success or canceled redirect
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

  // Initial fetch on mount
  useEffect(() => {
    if (isSignedIn && user) {
      fetchSubscriptionStatus();
    }
  }, [user, isSignedIn]);

  if (!isSignedIn || !user) {
    return <div>Please sign in to view subscription options.</div>;
  }

  return (
    <div>
      <h1>Subscription</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <h2>Current Plan: {subscriptionStatus.plan} ({subscriptionStatus.billing_interval})</h2>
      <p>Status: {subscriptionStatus.subscription_status}</p>
      <p>Features: {JSON.stringify(subscriptionStatus.features)}</p>

      <h3>Available Plans</h3>
      <div>
        {plans.map((plan) => (
          <div key={plan.id}>
            <h4>{plan.name} ({plan.billing_interval})</h4>
            <p>Price: ${plan.price}</p>
            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={loading || subscriptionStatus.plan === plan.name}
            >
              {subscriptionStatus.plan === plan.name ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;