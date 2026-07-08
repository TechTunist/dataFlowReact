/**
 * Open-access promotion marketing config (splash + public pages).
 *
 * When active, splash pricing shows strikethrough premium cost and "Currently free".
 * Backend access is controlled separately (subscription_access / promo env on API).
 *
 * Toggle: set REACT_APP_OPEN_ACCESS_PROMO=true on Vercel (or in .env), redeploy frontend.
 * Revert: set to false or remove the var, redeploy.
 */
export const OPEN_ACCESS_PROMO = {
  active: process.env.REACT_APP_OPEN_ACCESS_PROMO === 'true',
  priceLabel: 'Currently free',
  premiumPriceUsd: '$13.45 / month',
  premiumPriceShort: '$13.45/mo',
  bannerHeadline: 'Full premium access with a free account',
  bannerSubtext: 'All 80+ charts unlocked. No card required.',
  stickerLabel: 'Free Premium Access',
};

export const isOpenAccessPromoActive = () => OPEN_ACCESS_PROMO.active;

export const getPricingSectionSubtitle = (promoActive = isOpenAccessPromoActive()) =>
  promoActive
    ? 'Sign up free for full access to every chart. Premium is currently free, no card required.'
    : 'Start free or go premium for full access, $13.45/month, cancel anytime.';

export const getHeroPricingHint = (promoActive = isOpenAccessPromoActive()) =>
  promoActive
    ? 'No card required · All charts unlocked · Premium currently free'
    : 'No card required · 15+ free charts · Cancel premium anytime';

export const getHowItWorksSteps = (promoActive = isOpenAccessPromoActive()) => [
  { step: '1', title: 'Sign up free', text: 'Create your account in seconds, no card needed.' },
  { step: '2', title: 'Explore insights', text: 'Open charts and build your dashboard.' },
  promoActive
    ? { step: '3', title: 'Full access included', text: 'Every premium chart and tool is currently free with your account.' }
    : { step: '3', title: 'Upgrade when ready', text: 'Unlock advanced risk metrics and full history for $13.45/mo.' },
];

export const getPromoFaqs = (promoActive = isOpenAccessPromoActive()) => {
  const base = [
    { q: 'Is Cryptological suitable for beginners?', a: 'Yes. Every chart includes a plain-English description, and the free tier covers the essentials without overwhelming you.' },
    { q: 'Can I cancel anytime?', a: 'Yes. Each payment covers one month of access. Cancel and you keep access until the period ends, no further charges.' },
    { q: 'Do you get real-time data?', a: 'Prices are real-time or previous daily close depending on the asset. Macro and on-chain series update when new data is published.' },
  ];
  if (!promoActive) return base;
  return [
    {
      q: 'Is premium really free right now?',
      a: 'Yes. For a limited time, a free account unlocks every chart and tool on Cryptological. No card required. When the promotion ends, standard free and premium plans apply.',
    },
    ...base,
  ];
};