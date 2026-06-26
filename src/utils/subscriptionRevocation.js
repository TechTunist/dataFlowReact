/**
 * Bridge between DataContext (non-React) and SubscriptionContext for access changes.
 */
let onSubscriptionRequired = null;
let premiumAccessSnapshot = false;

export function setSubscriptionRequiredHandler(handler) {
  onSubscriptionRequired = typeof handler === 'function' ? handler : null;
}

export function setPremiumAccessSnapshot(hasAccess) {
  premiumAccessSnapshot = Boolean(hasAccess);
}

export function canUsePremiumCache() {
  return premiumAccessSnapshot;
}

export function notifySubscriptionRequired() {
  if (typeof onSubscriptionRequired === 'function') {
    onSubscriptionRequired();
  }
}