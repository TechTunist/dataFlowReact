import { getCurrentPrice } from './currentPrice';

describe('getCurrentPrice caching', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  it('returns cached price within 1 hour without refetching', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 95000 } }),
    });

    const first = await getCurrentPrice('BTC');
    const second = await getCurrentPrice('BTC');

    expect(first).toBe(95000);
    expect(second).toBe(95000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('reads from localStorage when in-memory cache is cold', async () => {
    const now = Date.now();
    localStorage.setItem('livePrice_SOL', JSON.stringify(180));
    localStorage.setItem('livePrice_SOL_ts', now.toString());

    const price = await getCurrentPrice('SOL');
    expect(price).toBe(180);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});