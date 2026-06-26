import { FREE_TIER_CACHE_IDS, isPremiumCacheId } from './premiumCache';

describe('premiumCache', () => {
  test('free-tier cache ids are not premium', () => {
    for (const id of FREE_TIER_CACHE_IDS) {
      expect(isPremiumCacheId(id)).toBe(false);
    }
  });

  test('premium cache ids are detected by exact id and prefix', () => {
    expect(isPremiumCacheId('mvrvData')).toBe(true);
    expect(isPremiumCacheId('txMvrvData_v2')).toBe(true);
    expect(isPremiumCacheId('fredSeriesData_SP500')).toBe(true);
    expect(isPremiumCacheId('altcoinData_SOL')).toBe(true);
    expect(isPremiumCacheId('floorEchoData')).toBe(true);
  });

  test('unknown ids default to non-premium', () => {
    expect(isPremiumCacheId('someFutureCache')).toBe(false);
    expect(isPremiumCacheId('')).toBe(false);
    expect(isPremiumCacheId(null)).toBe(false);
  });
});