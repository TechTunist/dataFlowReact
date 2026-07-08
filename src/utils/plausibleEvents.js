/** Plausible custom events for conversion funnel measurement. */

export function trackPlausible(eventName, props = {}) {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof window.plausible !== 'function') return;
  if (Object.keys(props).length > 0) {
    window.plausible(eventName, { props });
  } else {
    window.plausible(eventName);
  }
}

export const FUNNEL_EVENTS = {
  CTA_CLICK: 'CTA Click',
  SIGNUP_STARTED: 'Signup Started',
  SIGNUP_COMPLETED: 'Signup Completed',
  CHECKOUT_STARTED: 'Checkout Started',
  PREVIEW_INTERACTION: 'Preview Interaction',
  MARKET_PULSE_VIEW: 'Market Pulse View',
  ONBOARDING_SHOWN: 'Onboarding Shown',
  ONBOARDING_DISMISSED: 'Onboarding Dismissed',
  ONBOARDING_STEP: 'Onboarding Step Click',
};

export function trackCtaClick(location, plan = 'free') {
  trackPlausible(FUNNEL_EVENTS.CTA_CLICK, { location, plan });
}

export function trackSignupStarted(method, plan = 'free') {
  trackPlausible(FUNNEL_EVENTS.SIGNUP_STARTED, { method, plan });
}

export function trackSignupCompleted(plan = 'free') {
  trackPlausible(FUNNEL_EVENTS.SIGNUP_COMPLETED, { plan });
}

export function trackCheckoutStarted(source = 'subscription-page') {
  trackPlausible(FUNNEL_EVENTS.CHECKOUT_STARTED, { source });
}

export function trackPreviewInteraction(chart = 'risk-color') {
  trackPlausible(FUNNEL_EVENTS.PREVIEW_INTERACTION, { chart });
}

export function trackMarketPulseView(hasSparklines = false) {
  trackPlausible(FUNNEL_EVENTS.MARKET_PULSE_VIEW, {
    sparklines: hasSparklines ? 'yes' : 'no',
  });
}

export function trackOnboardingShown() {
  trackPlausible(FUNNEL_EVENTS.ONBOARDING_SHOWN);
}

export function trackOnboardingDismissed(reason = 'dismiss') {
  trackPlausible(FUNNEL_EVENTS.ONBOARDING_DISMISSED, { reason });
}

export function trackOnboardingStep(path) {
  trackPlausible(FUNNEL_EVENTS.ONBOARDING_STEP, { path });
}