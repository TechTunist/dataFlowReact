import {
  didAccessRevoke,
  getPromoRefetchDelayMs,
  hasPremiumAccess,
  isCancelledButValid,
  normalizeSubscriptionStatus,
  shouldPollSubscriptionStatus,
  subscriptionStatusesEqual,
} from './subscriptionAccess';

describe('subscriptionAccess', () => {
  test('normalizeSubscriptionStatus includes promo fields', () => {
    const status = normalizeSubscriptionStatus({
      plan: 'Free',
      access: 'Full',
      promo_active: true,
      promo_ends_at: '2026-06-30T23:59:59+00:00',
    });

    expect(status.access).toBe('Full');
    expect(status.promo_active).toBe(true);
    expect(status.promo_ends_at).toBeInstanceOf(Date);
  });

  test('hasPremiumAccess honors promo_active without paid plan', () => {
    const promoUser = normalizeSubscriptionStatus({
      plan: 'Free',
      subscription_status: 'free',
      access: 'Full',
      promo_active: true,
    });
    expect(hasPremiumAccess(promoUser)).toBe(true);
  });

  test('hasPremiumAccess grants free signed-in accounts full access', () => {
    const freeUser = normalizeSubscriptionStatus({
      plan: 'Free',
      subscription_status: 'free',
      access: 'Limited',
      promo_active: false,
    });
    expect(hasPremiumAccess(freeUser)).toBe(true);
  });

  test('hasPremiumAccess allows canceled user within grace', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const canceledUser = normalizeSubscriptionStatus({
      plan: 'Full Access',
      subscription_status: 'canceling',
      access: 'Full',
      current_period_end: future.toISOString(),
    });
    expect(isCancelledButValid(canceledUser)).toBe(true);
    expect(hasPremiumAccess(canceledUser)).toBe(true);
  });

  test('hasPremiumAccess is false only when status is missing', () => {
    expect(hasPremiumAccess(null)).toBe(false);
    expect(hasPremiumAccess(undefined)).toBe(false);
  });

  test('didAccessRevoke only fires when signed-in status is cleared', () => {
    const signedIn = normalizeSubscriptionStatus({
      access: 'Full',
      promo_active: false,
      subscription_status: 'free',
    });

    expect(didAccessRevoke(signedIn, null)).toBe(true);
    expect(didAccessRevoke(null, signedIn)).toBe(false);
    expect(didAccessRevoke(signedIn, signedIn)).toBe(false);
  });

  test('didAccessRevoke ignores paid users staying on Full', () => {
    const paid = normalizeSubscriptionStatus({
      access: 'Full',
      promo_active: false,
      subscription_status: 'active',
    });
    const stillPaid = { ...paid };

    expect(didAccessRevoke(paid, stillPaid)).toBe(false);
  });

  test('shouldPollSubscriptionStatus is true during promo', () => {
    const status = normalizeSubscriptionStatus({
      access: 'Full',
      promo_active: true,
      promo_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    expect(shouldPollSubscriptionStatus(status)).toBe(true);
  });

  test('shouldPollSubscriptionStatus is false with no promo metadata', () => {
    const status = normalizeSubscriptionStatus({
      access: 'Limited',
      subscription_status: 'free',
    });
    expect(shouldPollSubscriptionStatus(status)).toBe(false);
  });

  test('getPromoRefetchDelayMs returns ms until promo end', () => {
    const endsAt = new Date(Date.now() + 5000);
    const status = normalizeSubscriptionStatus({
      access: 'Full',
      promo_active: true,
      promo_ends_at: endsAt.toISOString(),
    });
    const delay = getPromoRefetchDelayMs(status);
    expect(delay).toBeGreaterThan(4000);
    expect(delay).toBeLessThanOrEqual(6000);
  });

  test('subscriptionStatusesEqual compares promo fields', () => {
    const a = normalizeSubscriptionStatus({ access: 'Full', promo_active: true });
    const b = normalizeSubscriptionStatus({ access: 'Full', promo_active: false });
    expect(subscriptionStatusesEqual(a, a)).toBe(true);
    expect(subscriptionStatusesEqual(a, b)).toBe(false);
  });
});