import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Subscription = () => {
  const { user } = useUser();
  const { getToken } = useClerk();
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

  // Available plans (match SubscriptionPlan IDs from backend)
const plans = [
  { id: 'prod_SGiujn0P6GfQAC', name: 'Premium', billing_interval: 'MONTHLY', price: 10.00 },
  { id: 'prod_SGioq8WtiKlOIc', name: 'Premium', billing_interval: 'YEARLY', price: 100.00 },
  { id: 'prod_SGisX0np5wxY05', name: 'Lifetime', billing_interval: 'ONE_TIME', price: 500.00 },
];

  // Fetch subscription status from backend
  const fetchSubscriptionStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch('https://vercel-dataflow.vercel.app/api/subscription-status/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSubscriptionStatus(data);

      // Update Clerk publicMetadata (optional, for consistency)
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
      setError('Failed to fetch subscription status. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle checkout
  const handleCheckout = async (planId) => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch('https://vercel-dataflow.vercel.app/api/create-checkout-session/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { sessionId } = await response.json();
      const stripe = window.Stripe('pk_test_51RL5v0Q2fPLucCvVIKbZAI9ctbXv9kVN2RlnmLmWQSE0a2cZxZBob1E1KOTpUzgOaVrTvusolX5xVK5q17kqkzE500FxIqJDHY'); // Replace with your Stripe publishable key
      await stripe.redirectToCheckout({ sessionId });
    } catch (err) {
      setError('Failed to initiate checkout. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  // Check for success or canceled redirect
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('success')) {
      fetchSubscriptionStatus(); // Refresh status after successful checkout
      navigate('/subscription', { replace: true }); // Clear query params
    } else if (query.get('canceled')) {
      setError('Checkout was canceled. Please try again.');
      navigate('/subscription', { replace: true });
    }
  }, [location, navigate]);

  // Initial fetch on mount (optional, if you want to sync on load)
  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  if (!user) {
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
              Subscribe
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;