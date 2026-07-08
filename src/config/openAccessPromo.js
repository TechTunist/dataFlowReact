/**
 * Open-access promotion marketing config (splash + public pages).
 *
 * When active, splash pricing shows strikethrough premium cost and "Currently free".
 * Backend access is controlled separately (subscription_access / promo env on API).
 *
 * Cold-visitor rules this copy must always make clear while promo is on:
 * 1. Full chart access is free only for a limited time (promotional).
 * 2. You must create a free account (email + password) to unlock interactive charts.
 * 3. No card is required during the promo.
 *
 * Toggle: set REACT_APP_OPEN_ACCESS_PROMO=true on Vercel (or in .env), redeploy frontend.
 * Revert: set to false or remove the var, redeploy.
 */

export const OPEN_ACCESS_PROMO = {
  active: process.env.REACT_APP_OPEN_ACCESS_PROMO === 'true',
  priceLabel: 'Currently free',
  premiumPriceUsd: '$13.45 / month',
  premiumPriceShort: '$13.45/mo',
  /** Short banner headline for cold visitors */
  bannerHeadline: 'Limited free access, free account required',
  bannerSubtext:
    'Sign up with email and password to unlock all 80+ charts while the promotion lasts. No card required. Access is free for signed-in users only, and only for a limited time.',
  /** Compact one-liner for sticky bars and chips */
  limitedAccessChip: 'Limited free access · Account required',
  stickerLabel: 'Limited Free Access',
  /** Explicit requirements cold visitors must see */
  requirements: [
    'Free full access is promotional and time-limited',
    'Create a free account with email and password to unlock charts',
    'No payment card required during the promotion',
  ],
};

export const isOpenAccessPromoActive = () => OPEN_ACCESS_PROMO.active;

export const getPricingSectionSubtitle = (promoActive = isOpenAccessPromoActive()) =>
  promoActive
    ? 'Limited free access for free accounts only. Sign up with email and password, no card needed. When the promotion ends, standard free and premium plans apply.'
    : 'Start free or go premium for full access, $13.45/month, cancel anytime.';

export const getHeroPricingHint = (promoActive = isOpenAccessPromoActive()) =>
  promoActive
    ? 'Limited free access · Free account (email + password) required · No card'
    : 'No card required · 15+ free charts · Cancel premium anytime';

export const getStickyCtaHint = (promoActive = isOpenAccessPromoActive()) =>
  promoActive
    ? 'Limited free access. Sign up free with email and password to unlock all charts.'
    : 'Glassnode-depth metrics without Glassnode prices.';

export const getHowItWorksSteps = (promoActive = isOpenAccessPromoActive()) => [
  {
    step: '1',
    title: 'Create a free account',
    text: promoActive
      ? 'Sign up with your email and password. Full access is free only for signed-in accounts during this limited promotion.'
      : 'Create your account in seconds, no card needed.',
  },
  {
    step: '2',
    title: 'Explore live charts',
    text: 'Open interactive charts, pin favourites, and build your dashboard.',
  },
  promoActive
    ? {
        step: '3',
        title: 'Enjoy limited free access',
        text: 'Every chart and tool is unlocked for free accounts for a limited time. No card required. This is promotional, not permanent.',
      }
    : {
        step: '3',
        title: 'Upgrade when ready',
        text: 'Unlock advanced risk metrics and full history for $13.45/mo.',
      },
];

export const getSignupHelperText = (promoActive = isOpenAccessPromoActive(), isPremiumIntent = false) => {
  if (isPremiumIntent) {
    return 'After verifying your email you will go straight to secure Stripe checkout.';
  }
  if (promoActive) {
    return 'Limited free access for free accounts only. Sign up with email and password, no card required.';
  }
  return 'Access 15+ free charts instantly, no card required.';
};

export const getSignupChipLabel = (promoActive = isOpenAccessPromoActive(), isPremiumIntent = false) => {
  if (isPremiumIntent) return 'Premium, payment after signup';
  if (promoActive) return 'Limited free access · Account required';
  return 'Free account';
};

export const getPromoFaqs = (promoActive = isOpenAccessPromoActive()) => {
  const base = [
    {
      q: 'Is Cryptological suitable for beginners?',
      a: 'Yes. Every chart includes a plain-English description, and the free tier covers the essentials without overwhelming you.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Each payment covers one month of access. Cancel and you keep access until the period ends, no further charges.',
    },
    {
      q: 'Do you get real-time data?',
      a: 'Prices are real-time or previous daily close depending on the asset. Macro and on-chain series update when new data is published.',
    },
  ];
  if (!promoActive) return base;
  return [
    {
      q: 'Is full access really free right now?',
      a: 'Yes, but only for a limited time, and only if you create a free account with email and password. No card is required. Visitors without an account can browse previews and the public market pulse, not the full interactive app. When the promotion ends, standard free and premium plans apply.',
    },
    {
      q: 'Do I need to sign up to use the charts?',
      a: 'Yes. Interactive charts require a free account. You can still see the public market pulse and chart previews on this site without signing up.',
    },
    ...base,
  ];
};

export const getBottomCtaCopy = (promoActive = isOpenAccessPromoActive()) =>
  promoActive
    ? {
        title: 'Limited free access for free accounts',
        body: 'Create a free account with email and password to unlock every chart while the promotion lasts. No card required.',
        button: 'Sign up free with email',
      }
    : {
        title: 'Start analysing markets today',
        body: 'Create a free account and explore professional-grade crypto analytics.',
        button: 'Sign up free',
      };

export default OPEN_ACCESS_PROMO;
