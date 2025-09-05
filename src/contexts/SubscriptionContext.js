// src/contexts/SubscriptionContext.js
import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

const SubscriptionContext = createContext();

const DEFAULT_FREE_FEATURES = {
  basic_charts: true,
  advanced_charts: false,
  custom_indicators: false,
};

export const SubscriptionProvider = ({ children }) => {
  const { user, isSignedIn } = useUser();  // Use hook inside, no props needed
  const { getToken } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://vercel-dataflow.vercel.app';

  const fetchSubscriptionStatus = useCallback(async () => {
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
      const response = await fetch(`${API_BASE_URL}/api/subscription-status/?t=${Date.now()}`, {  // Cache-bust for fresh data
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
  }, [isSignedIn, user, getToken]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);  // Run on mount and when dependencies change

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

  console.log('SubscriptionProvider rendered');  // Uncomment for debugging rerenders

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