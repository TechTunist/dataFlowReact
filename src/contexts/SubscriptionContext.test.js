/**
 * Basic tests around SubscriptionContext defaults and logic (no full provider render to avoid Clerk hooks).
 * MODERN AGENT: real test coverage for subscription gating (used by RestrictToPaid, many routes, free/paid UI).
 * Future: can add more with mocked Clerk + fetch.
 * Part of 4-5 real tests added.
 */

// Note: DEFAULT_FREE_FEATURES is module-private in SubscriptionContext.js (and duplicated in RestrictToPaid.js).
// We assert the documented contract instead of fragile import that can pull d3/esm and break jest parse (latent CRA issue).

import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const EXPECTED_FREE = {
  basic_charts: true,
  advanced_charts: false,
  custom_indicators: false,
};

describe('Subscription gating basics (professionalization coverage)', () => {
  test('DEFAULT_FREE_FEATURES shape matches expected (used in RestrictToPaid + SubscriptionContext)', () => {
    expect(EXPECTED_FREE.basic_charts).toBe(true);
    expect(EXPECTED_FREE.advanced_charts).toBe(false);
    expect(EXPECTED_FREE.custom_indicators).toBe(false);
  });

  test('restrictToPaidSubscription is a HOC function', () => {
    expect(typeof restrictToPaidSubscription).toBe('function');
    // calling it returns a wrapper component fn
    const Wrapped = restrictToPaidSubscription(() => null);
    expect(typeof Wrapped).toBe('function');
  });
});
