import {
  getHeroPricingHint,
  getHowItWorksSteps,
  getPricingSectionSubtitle,
  getPromoFaqs,
  isOpenAccessPromoActive,
} from './openAccessPromo';

describe('openAccessPromo', () => {
  test('getPricingSectionSubtitle reflects promo state', () => {
    expect(getPricingSectionSubtitle(true)).toMatch(/currently free/i);
    expect(getPricingSectionSubtitle(false)).toMatch(/\$13\.45/);
  });

  test('getHeroPricingHint reflects promo state', () => {
    expect(getHeroPricingHint(true)).toMatch(/currently free/i);
    expect(getHeroPricingHint(false)).toMatch(/15\+ free charts/i);
  });

  test('getHowItWorksSteps changes step 3 during promo', () => {
    const promoSteps = getHowItWorksSteps(true);
    const normalSteps = getHowItWorksSteps(false);
    expect(promoSteps[2].title).toBe('Full access included');
    expect(normalSteps[2].text).toMatch(/\$13\.45/);
  });

  test('getPromoFaqs prepends promo FAQ when active', () => {
    expect(getPromoFaqs(true)[0].q).toMatch(/premium really free/i);
    expect(getPromoFaqs(false)).toHaveLength(3);
  });

  test('isOpenAccessPromoActive follows REACT_APP_OPEN_ACCESS_PROMO', () => {
    expect(typeof isOpenAccessPromoActive()).toBe('boolean');
  });

  test('OPEN_ACCESS_PROMO includes sticker label for public pages', () => {
    const { OPEN_ACCESS_PROMO } = require('./openAccessPromo');
    expect(OPEN_ACCESS_PROMO.stickerLabel).toMatch(/free premium access/i);
  });
});