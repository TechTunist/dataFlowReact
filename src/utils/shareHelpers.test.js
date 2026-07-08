import {
  absoluteUrl,
  buildTwitterIntentUrl,
  formatCreatorScriptOutline,
  formatMarketPulseShareText,
  formatMarketPulseTweetText,
  getCreatorTalkingPoints,
} from './shareHelpers';

describe('shareHelpers', () => {
  test('absoluteUrl builds site paths', () => {
    expect(absoluteUrl('/#market-pulse')).toMatch(/\/#market-pulse$/);
    expect(absoluteUrl('https://example.com/x')).toBe('https://example.com/x');
  });

  test('formatMarketPulseShareText includes core metrics and promo note', () => {
    const text = formatMarketPulseShareText(
      {
        btc_price: { value: 100000, date: '2026-07-07' },
        fear_and_greed: { value: 42, classification: 'Fear' },
        btc_dominance_pct: { value: 54.2 },
        total_market_cap: { value: 2.5e12 },
        defi_tvl: { value: 1e11 },
      },
      { promoActive: true },
    );
    expect(text).toMatch(/BTC: \$100,000/);
    expect(text).toMatch(/Fear & Greed: 42/);
    expect(text).toMatch(/54\.2%/);
    expect(text).toMatch(/Limited free access/);
    expect(text).toMatch(/market-pulse/);
  });

  test('formatMarketPulseTweetText stays compact', () => {
    const tweet = formatMarketPulseTweetText(
      {
        btc_price: { value: 95000 },
        fear_and_greed: { value: 55 },
        btc_dominance_pct: { value: 50 },
      },
      { promoActive: true },
    );
    expect(tweet.length).toBeLessThan(240);
    expect(tweet).toMatch(/BTC/);
    expect(tweet).toMatch(/Limited free access/i);
  });

  test('buildTwitterIntentUrl encodes params', () => {
    const url = buildTwitterIntentUrl({ text: 'hello world', url: 'https://cryptological.app/' });
    expect(url).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/);
    expect(url).toMatch(/hello/);
  });

  test('creator talking points cover limited free access when promo on', () => {
    const points = getCreatorTalkingPoints(true);
    expect(points.length).toBeGreaterThanOrEqual(4);
    expect(points.some((p) => /limited/i.test(p.text))).toBe(true);
    expect(formatCreatorScriptOutline(true)).toMatch(/promo script outline/i);
  });
});
