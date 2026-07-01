export const DEFAULT_FREE_FEATURES = {
  basic_charts: true,
  advanced_charts: false,
  custom_indicators: false,
};

export const GRACE_MS = 24 * 60 * 60 * 1000;

/** Poll while promo is active or scheduled to end soon. */
export const PROMO_POLL_INTERVAL_MS = 5 * 60 * 1000;

export const normalizeSubscriptionStatus = (data) => ({
  plan: data.plan || 'Free',
  subscription_status: data.subscription_status || 'free',
  current_period_end: data.current_period_end ? new Date(data.current_period_end) : null,
  features: data.features && typeof data.features === 'object' ? data.features : DEFAULT_FREE_FEATURES,
  access: data.access || 'Limited',
  promo_active: Boolean(data.promo_active),
  promo_starts_at: data.promo_starts_at ? new Date(data.promo_starts_at) : null,
  promo_ends_at: data.promo_ends_at ? new Date(data.promo_ends_at) : null,
});

export const subscriptionStatusesEqual = (a, b) => {
  if (!a || !b) return a === b;
  return (
    a.plan === b.plan
    && a.subscription_status === b.subscription_status
    && a.access === b.access
    && a.promo_active === b.promo_active
    && (a.current_period_end?.getTime() ?? null) === (b.current_period_end?.getTime() ?? null)
    && (a.promo_ends_at?.getTime() ?? null) === (b.promo_ends_at?.getTime() ?? null)
    && JSON.stringify(a.features) === JSON.stringify(b.features)
  );
};

export const isCancelledButValid = (subscriptionStatus) => {
  if (!subscriptionStatus) return false;
  const rawStatus = (subscriptionStatus.subscription_status || '').toLowerCase();
  if (rawStatus !== 'canceled' && rawStatus !== 'canceling') return false;
  if (!subscriptionStatus.current_period_end) return false;
  return subscriptionStatus.current_period_end > new Date(Date.now() - GRACE_MS);
};

/** Authoritative premium check used by RestrictToPaid and cache gating. */
export const hasPremiumAccess = (subscriptionStatus) => {
  if (!subscriptionStatus) return false;
  if (subscriptionStatus.promo_active) return true;
  const rawStatus = (subscriptionStatus.subscription_status || '').toLowerCase();
  if (rawStatus === 'canceling' || rawStatus === 'canceled') {
    return isCancelledButValid(subscriptionStatus);
  }
  if (subscriptionStatus.access === 'Full') return true;
  return false;
};

/** True when access dropped from premium to limited (promo ended, cancel expired, etc.). */
export const didAccessRevoke = (previousStatus, nextStatus) => {
  if (!previousStatus || !nextStatus) return false;
  return hasPremiumAccess(previousStatus) && !hasPremiumAccess(nextStatus);
};

/** Keep polling subscription status while promo is live or ending within 24h. */
export const shouldPollSubscriptionStatus = (subscriptionStatus) => {
  if (!subscriptionStatus) return false;
  if (subscriptionStatus.promo_active) return true;
  if (!subscriptionStatus.promo_ends_at) return false;
  const msUntilEnd = subscriptionStatus.promo_ends_at.getTime() - Date.now();
  return msUntilEnd > 0 && msUntilEnd <= 24 * 60 * 60 * 1000;
};

export const getPromoRefetchDelayMs = (subscriptionStatus) => {
  if (!subscriptionStatus?.promo_ends_at) return null;
  const delay = subscriptionStatus.promo_ends_at.getTime() - Date.now() + 1000;
  return delay > 0 ? delay : null;
};