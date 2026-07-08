import {
  getBottomCtaCopy,
  getHeroPricingHint,
  getHowItWorksSteps,
  getPricingSectionSubtitle,
  getPromoFaqs,
  getSignupChipLabel,
  getSignupHelperText,
  getStickyCtaHint,
  isOpenAccessPromoActive,
  OPEN_ACCESS_PROMO,
} from './openAccessPromo';

describe('openAccessPromo', () => {
  test('getPricingSectionSubtitle reflects promo state and account requirement', () => {
    expect(getPricingSectionSubtitle(true)).toMatch(/limited free access/i);
    expect(getPricingSectionSubtitle(true)).toMatch(/email and password/i);
    expect(getPricingSectionSubtitle(false)).toMatch(/\$13\.45/);
  });

  test('getHeroPricingHint reflects promo state', () => {
    expect(getHeroPricingHint(true)).toMatch(/limited free access/i);
    expect(getHeroPricingHint(true)).toMatch(/email \+ password/i);
    expect(getHeroPricingHint(false)).toMatch(/15\+ free charts/i);
  });

  test('getHowItWorksSteps stresses free account and limited access during promo', () => {
    const promoSteps = getHowItWorksSteps(true);
    const normalSteps = getHowItWorksSteps(false);
    expect(promoSteps[0].title).toMatch(/free account/i);
    expect(promoSteps[0].text).toMatch(/email and password/i);
    expect(promoSteps[2].title).toMatch(/limited free access/i);
    expect(normalSteps[2].text).toMatch(/\$13\.45/);
  });

  test('getPromoFaqs lead with limited free access + signup requirement', () => {
    const faqs = getPromoFaqs(true);
    expect(faqs[0].q).toMatch(/really free/i);
    expect(faqs[0].a).toMatch(/limited time/i);
    expect(faqs[0].a).toMatch(/email and password/i);
    expect(faqs[1].q).toMatch(/sign up/i);
    expect(getPromoFaqs(false)).toHaveLength(3);
  });

  test('signup helpers for free vs premium intent', () => {
    expect(getSignupChipLabel(true, false)).toMatch(/limited free access/i);
    expect(getSignupHelperText(true, false)).toMatch(/email and password/i);
    expect(getSignupChipLabel(false, true)).toMatch(/premium/i);
  });

  test('sticky and bottom CTA copy during promo', () => {
    expect(getStickyCtaHint(true)).toMatch(/limited free access/i);
    expect(getBottomCtaCopy(true).button).toMatch(/email/i);
  });

  test('isOpenAccessPromoActive follows REACT_APP_OPEN_ACCESS_PROMO', () => {
    expect(typeof isOpenAccessPromoActive()).toBe('boolean');
  });

  test('OPEN_ACCESS_PROMO includes limited-access messaging', () => {
    expect(OPEN_ACCESS_PROMO.stickerLabel).toMatch(/limited free access/i);
    expect(OPEN_ACCESS_PROMO.bannerHeadline).toMatch(/limited free access/i);
    expect(OPEN_ACCESS_PROMO.requirements.length).toBeGreaterThanOrEqual(3);
  });
});
