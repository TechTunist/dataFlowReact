import { getCurrentStockPrice } from './currentStockPrice';

const mockGetAuthHeaders = jest.fn().mockResolvedValue({ Authorization: 'Bearer test' });
jest.mock('./clerkAuth', () => ({
  getAuthHeaders: (...args) => mockGetAuthHeaders(...args),
}));

jest.mock('../config/api', () => ({
  apiUrl: (path) => `https://api.test${path}`,
}));

describe('getCurrentStockPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  it('returns null on API failure without throwing', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(getCurrentStockPrice('TSLA')).resolves.toBeNull();
  });

  it('parses a valid quote response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        price: 250.5,
        as_of_date: '2026-06-25',
        fetched_at: '2026-06-25T16:05:00Z',
      }),
    });

    const quote = await getCurrentStockPrice('TSLA');
    expect(quote).toEqual({
      price: 250.5,
      as_of_date: '2026-06-25',
      fetched_at: '2026-06-25T16:05:00Z',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('uses in-memory cache on second call within TTL', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ price: 100, as_of_date: '2026-06-25' }),
    });

    await getCurrentStockPrice('NVDA');
    await getCurrentStockPrice('NVDA');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});