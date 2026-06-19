// src/contexts/SubscriptionContext.js
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { apiUrl } from '../config/api';
import { setClerkTokenGetter, getClerkToken } from '../utils/clerkAuth';

const readClerkSessionToken = async () => {
  if (window.Clerk?.session) {
    return window.Clerk.session.getToken();
  }
  return null;
};

const DEV_BYPASS_AUTH = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

const SubscriptionContext = createContext();

const DEFAULT_FREE_FEATURES = {
  basic_charts: true,
  advanced_charts: false,
  custom_indicators: false,
};

const normalizeSubscriptionStatus = (data) => ({
  plan: data.plan || 'Free',
  subscription_status: data.subscription_status || 'free',
  current_period_end: data.current_period_end ? new Date(data.current_period_end) : null,
  features: data.features && typeof data.features === 'object' ? data.features : DEFAULT_FREE_FEATURES,
  access: data.access || 'Limited',
});

const subscriptionStatusesEqual = (a, b) => {
  if (!a || !b) return a === b;
  return (
    a.plan === b.plan
    && a.subscription_status === b.subscription_status
    && a.access === b.access
    && (a.current_period_end?.getTime() ?? null) === (b.current_period_end?.getTime() ?? null)
    && JSON.stringify(a.features) === JSON.stringify(b.features)
  );
};

export const SubscriptionProvider = ({ children }) => {
  const { user, isSignedIn } = useUser();
  const { isLoaded } = useAuth();
  const userId = user?.id ?? null;

  // All hooks must be called unconditionally and in the same order on every render.
  // This is required by react-hooks/rules-of-hooks.

  // Register once — always reads the live Clerk session (avoids refetch storms when
  // Clerk "touch" updates hook object identities without changing the signed-in user).
  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    setClerkTokenGetter(readClerkSessionToken);
  }, []);

  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasFetchedRef = useRef(false);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (DEV_BYPASS_AUTH) return;

    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      hasFetchedRef.current = false;
      setSubscriptionStatus(null);
      setError('');
      setLoading(false);
      return;
    }

    const isInitialFetch = !hasFetchedRef.current;
    if (isInitialFetch) {
      setLoading(true);
    }
    setError('');

    try {
      const token = await getClerkToken({ maxRetries: 8, delayMs: 400 });
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      const response = await fetch(apiUrl('/api/subscription-status/'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }
      const data = await response.json();
      const nextStatus = normalizeSubscriptionStatus(data);
      setSubscriptionStatus((prev) => (
        subscriptionStatusesEqual(prev, nextStatus) ? prev : nextStatus
      ));
      hasFetchedRef.current = true;
    } catch (err) {
      // Do not assume Free on transient auth/network failures — that flashes a false upgrade prompt.
      setError(`Failed to verify subscription: ${err.message}`);
      hasFetchedRef.current = true;
    } finally {
      if (isInitialFetch) {
        setLoading(false);
      }
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;

    if (!isLoaded) {
      setLoading(true);
      return;
    }

    if (!isSignedIn || !userId) {
      hasFetchedRef.current = false;
      setSubscriptionStatus(null);
      setLoading(false);
      setError('');
      return;
    }

    fetchSubscriptionStatus();
  }, [isLoaded, isSignedIn, userId, fetchSubscriptionStatus]);

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