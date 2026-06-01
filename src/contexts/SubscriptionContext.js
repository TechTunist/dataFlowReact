// src/contexts/SubscriptionContext.js
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { apiUrl } from '../config/api';
import { setClerkTokenGetter } from '../utils/clerkAuth';

const DEV_BYPASS_AUTH = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

const SubscriptionContext = createContext();

const DEFAULT_FREE_FEATURES = {
  basic_charts: true,
  advanced_charts: false,
  custom_indicators: false,
};

export const SubscriptionProvider = ({ children }) => {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const clerk = useClerk();

  // All hooks must be called unconditionally and in the same order on every render.
  // This is required by react-hooks/rules-of-hooks.

  // Register a robust token getter as soon as Clerk is available.
  // We prefer using the Clerk instance directly for better reliability
  // in non-component code (DataContext, etc.).
  useEffect(() => {
    if (DEV_BYPASS_AUTH) return; // dev bypass: do nothing

    if (clerk?.session) {
      // Register a getter that uses the Clerk instance (most reliable)
      setClerkTokenGetter(() => clerk.session.getToken());
    } else if (getToken) {
      // Fallback to useAuth's getToken if Clerk instance isn't ready yet
      setClerkTokenGetter(getToken);
    }
  }, [clerk, getToken]);

  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSubscriptionStatus = useCallback(async () => {
    if (DEV_BYPASS_AUTH) return; // dev bypass: no-op

    if (!isSignedIn || !user) {
      setError('Please sign in to view this chart.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/subscription-status/'), {  // Cache-bust removed in favor of proper headers later
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
        subscription_status: data.subscription_status || 'free',
        current_period_end: data.current_period_end ? new Date(data.current_period_end) : null,
        features: data.features && typeof data.features === 'object' ? data.features : DEFAULT_FREE_FEATURES,
        access: data.access || 'Limited',  // Explicitly include access
      });
    } catch (err) {
      setError(`Failed to fetch subscription status: ${err.message}`);
      setSubscriptionStatus({
        plan: 'Free',
        subscription_status: 'free',
        current_period_end: null,
        features: DEFAULT_FREE_FEATURES,
        access: 'Limited',  // Ensure default includes access
      });
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken, DEV_BYPASS_AUTH]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return; // dev bypass: do nothing
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  // Memoize the context value to prevent unnecessary rerenders
  const contextValue = useMemo(
    () => ({
      subscriptionStatus,
      loading,
      error,
      fetchSubscriptionStatus,
    }),
    [subscriptionStatus, loading, error, fetchSubscriptionStatus]
  );

  // === Render decision (after ALL hooks have been called) ===
  if (DEV_BYPASS_AUTH) {
    // Provide a fake full-access subscription so every premium chart and
    // component that uses useSubscription() sees "Full" access.
    const devFullAccess = {
      plan: 'Premium',
      subscription_status: 'active',
      current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      features: { basic_charts: true, advanced_charts: true, custom_indicators: true },
      access: 'Full',
    };

    return (
      <SubscriptionContext.Provider
        value={{
          subscriptionStatus: devFullAccess,
          loading: false,
          error: '',
          fetchSubscriptionStatus: () => {}, // no-op
        }}
      >
        {children}
      </SubscriptionContext.Provider>
    );
  }

  // Normal (production / real auth) path
  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};