// src/contexts/SubscriptionContext.js
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { apiUrl } from '../config/api';
import { setClerkTokenGetter, getClerkToken } from '../utils/clerkAuth';
import {
  didAccessRevoke,
  getPromoRefetchDelayMs,
  hasPremiumAccess,
  normalizeSubscriptionStatus,
  PROMO_POLL_INTERVAL_MS,
  shouldPollSubscriptionStatus,
  subscriptionStatusesEqual,
} from '../utils/subscriptionAccess';
import { purgePremiumCache } from '../utils/premiumCache';
import {
  setPremiumAccessSnapshot,
  setSubscriptionRequiredHandler,
} from '../utils/subscriptionRevocation';

const readClerkSessionToken = async () => {
  if (window.Clerk?.session) {
    return window.Clerk.session.getToken();
  }
  return null;
};

const DEV_BYPASS_AUTH = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const { user, isSignedIn } = useUser();
  const { isLoaded } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    setClerkTokenGetter(readClerkSessionToken);
  }, []);

  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasFetchedRef = useRef(false);
  const subscriptionStatusRef = useRef(null);

  const applySubscriptionStatus = useCallback((nextStatus) => {
    const previousStatus = subscriptionStatusRef.current;
    if (didAccessRevoke(previousStatus, nextStatus)) {
      void purgePremiumCache();
    }
    subscriptionStatusRef.current = nextStatus;
    setPremiumAccessSnapshot(hasPremiumAccess(nextStatus));
    setSubscriptionStatus((prev) => (
      subscriptionStatusesEqual(prev, nextStatus) ? prev : nextStatus
    ));
  }, []);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (DEV_BYPASS_AUTH) return;

    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      hasFetchedRef.current = false;
      subscriptionStatusRef.current = null;
      setPremiumAccessSnapshot(false);
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
      applySubscriptionStatus(normalizeSubscriptionStatus(data));
      hasFetchedRef.current = true;
    } catch (err) {
      setError(`Failed to verify subscription: ${err.message}`);
      hasFetchedRef.current = true;
    } finally {
      if (isInitialFetch) {
        setLoading(false);
      }
    }
  }, [applySubscriptionStatus, isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;

    if (!isLoaded) {
      setLoading(true);
      return;
    }

    if (!isSignedIn || !userId) {
      hasFetchedRef.current = false;
      subscriptionStatusRef.current = null;
      setPremiumAccessSnapshot(false);
      setSubscriptionStatus(null);
      setLoading(false);
      setError('');
      return;
    }

    fetchSubscriptionStatus();
  }, [isLoaded, isSignedIn, userId, fetchSubscriptionStatus]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    setSubscriptionRequiredHandler(fetchSubscriptionStatus);
    return () => setSubscriptionRequiredHandler(null);
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH || !isSignedIn) return undefined;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSubscriptionStatus();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchSubscriptionStatus, isSignedIn]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH || !shouldPollSubscriptionStatus(subscriptionStatus)) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      fetchSubscriptionStatus();
    }, PROMO_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchSubscriptionStatus, subscriptionStatus]);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return undefined;

    const delayMs = getPromoRefetchDelayMs(subscriptionStatus);
    if (delayMs == null) return undefined;

    const timeoutId = window.setTimeout(() => {
      fetchSubscriptionStatus();
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSubscriptionStatus, subscriptionStatus?.promo_ends_at]);

  const contextValue = useMemo(
    () => ({
      subscriptionStatus,
      loading,
      error,
      fetchSubscriptionStatus,
    }),
    [subscriptionStatus, loading, error, fetchSubscriptionStatus]
  );

  if (DEV_BYPASS_AUTH) {
    const devFullAccess = normalizeSubscriptionStatus({
      plan: 'Premium',
      subscription_status: 'active',
      current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      features: { basic_charts: true, advanced_charts: true, custom_indicators: true },
      access: 'Full',
    });

    return (
      <SubscriptionContext.Provider
        value={{
          subscriptionStatus: devFullAccess,
          loading: false,
          error: '',
          fetchSubscriptionStatus: () => {},
        }}
      >
        {children}
      </SubscriptionContext.Provider>
    );
  }

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