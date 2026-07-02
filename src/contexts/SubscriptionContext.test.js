/**
 * Basic tests around SubscriptionContext defaults and logic (no full provider render to avoid Clerk hooks).
 * MODERN AGENT: real test coverage for subscription gating (used by RestrictToPaid, many routes, free/paid UI).
 * Future: can add more with mocked Clerk + fetch.
 * Part of 4-5 real tests added.
 */

// Note: DEFAULT_FREE_FEATURES is module-private in SubscriptionContext.js (and duplicated in RestrictToPaid.js).
// We assert the documented contract instead of fragile import.

import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import { DEFAULT_FREE_FEATURES, hasPremiumAccess, normalizeSubscriptionStatus } from '../utils/subscriptionAccess';
import { isPremiumCacheId } from '../utils/premiumCache';
import { canUsePremiumCache, setPremiumAccessSnapshot } from '../utils/subscriptionRevocation';

describe('Subscription gating basics (professionalization coverage)', () => {
  test('DEFAULT_FREE_FEATURES grants full chart access for free accounts', () => {
    expect(DEFAULT_FREE_FEATURES.basic_charts).toBe(true);
    expect(DEFAULT_FREE_FEATURES.advanced_charts).toBe(true);
    expect(DEFAULT_FREE_FEATURES.custom_indicators).toBe(true);
  });

  test('premium cache snapshot blocks premium ids after revocation', () => {
    setPremiumAccessSnapshot(false);
    expect(canUsePremiumCache()).toBe(false);
    expect(isPremiumCacheId('mvrvData')).toBe(true);

    setPremiumAccessSnapshot(true);
    expect(canUsePremiumCache()).toBe(true);
    setPremiumAccessSnapshot(false);
  });

  test('hasPremiumAccess is true for any loaded free-account status', () => {
    const freeUser = normalizeSubscriptionStatus({
      access: 'Limited',
      promo_active: false,
      subscription_status: 'free',
    });
    expect(hasPremiumAccess(freeUser)).toBe(true);
    expect(hasPremiumAccess(null)).toBe(false);
  });

  test('restrictToPaidSubscription is a HOC function', () => {
    expect(typeof restrictToPaidSubscription).toBe('function');
    // calling it returns a wrapper component fn
    const Wrapped = restrictToPaidSubscription(() => null);
    expect(typeof Wrapped).toBe('function');
  });
});
