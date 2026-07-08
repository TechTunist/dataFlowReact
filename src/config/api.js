/**
 * Centralized API Configuration
 * 
 * This is the single source of truth for backend API communication.
 * 
 * IMPORTANT FOR VERCEL:
 * Make sure REACT_APP_API_BASE_URL is set in your Vercel project settings
 * for both Preview and Production environments.
 * 
 * Recommended values:
 *   Local development:  http://127.0.0.1:8000
 *   Production:         https://vercel-dataflow.vercel.app   (or your custom backend domain)
 */

const DEFAULT_API_BASE_URL = 'https://vercel-dataflow.vercel.app';

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '') || DEFAULT_API_BASE_URL;

/**
 * Helper to build full API endpoint URLs.
 * Always use this instead of string concatenation.
 */
export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

// Convenience exports for common patterns
export const API_ENDPOINTS = {
  // Public data endpoints (used heavily by DataContext)
  btcPrice: () => apiUrl('/api/btc/price/'),
  ethPrice: () => apiUrl('/api/eth/price/'),
  dominance: () => apiUrl('/api/dominance/'),
  mvrv: () => apiUrl('/api/mvrv/'),
  fearAndGreed: () => apiUrl('/api/fear-and-greed-binary-json/'),
  fearAndGreedLatest: () => apiUrl('/api/fear-and-greed-binary-latest/'),
  marketCap: () => apiUrl('/api/total/marketcap/'),
  total2: () => apiUrl('/api/total2/'),
  total3: () => apiUrl('/api/total3/'),
  totalDifference: () => apiUrl('/api/total/difference/'),
  combinedMacro: () => apiUrl('/api/combined-macro-data/'),
  onchainMetrics: (query = '') => apiUrl(`/api/onchain-metrics/${query}`),

  riskMetrics: (query = '') => apiUrl(`/api/risk-metrics/${query}`),
  txMvrv: () => apiUrl('/api/tx-mvrv/'),
  txMvrvRatio: (smoothing = 'sma-7') => apiUrl(`/api/tx-mvrv-ratio/?smoothing=${smoothing}`),
  floorEcho: () => apiUrl('/api/floor-echo/'),
  txMacro: () => apiUrl('/api/tx-macro/'),
  altcoinPrice: (coin) => apiUrl(`/api/${coin.toLowerCase()}/price/`),
  stockLiveQuote: (symbol) => apiUrl(`/api/stock-live-quote/${symbol.toLowerCase()}/`),
  tslaPrice: () => apiUrl('/api/tsla/price/'),
  altcoinSeasonIndex: () => apiUrl('/api/altcoin-season-index/'),
  altcoinSeasonTimeseries: () => apiUrl('/api/altcoin-season-index-timeseries/'),
  fedBalance: () => apiUrl('/api/fed-balance/'),
  usInflation: () => apiUrl('/api/us-inflation/'),
  initialClaims: () => apiUrl('/api/initial-claims/'),
  usInterest: () => apiUrl('/api/us-interest/'),
  unemployment: () => apiUrl('/api/us-unemployment/'),
  btcTxCount: () => apiUrl('/api/btc-tx-count/'),
  fredSeries: (seriesId) => apiUrl(`/api/series/${seriesId}/observations/`),
  sp500DivUnrate: () => apiUrl('/api/sp500-div-unrate-squared/'),

  // Public (no auth) — cold-visitor marketing snapshot only
  publicMarketPulse: () => apiUrl('/api/public/market-pulse/'),

  // Authenticated endpoints
  subscriptionStatus: () => apiUrl('/api/subscription-status/'),
  createCheckout: () => apiUrl('/api/create-checkout-session/'),
  createPortal: () => apiUrl('/api/create-portal-session/'),
  cancelSubscription: () => apiUrl('/api/cancel-subscription/'),
  favoriteCharts: () => apiUrl('/api/favorite-charts/'),
  favoriteAdd: () => apiUrl('/api/favorite-charts/add/'),
  favoriteRemove: () => apiUrl('/api/favorite-charts/remove/'),
  userSettings: () => apiUrl('/api/user-settings/'),
  userSettingsGet: () => apiUrl('/api/user-settings/get/'),
};

// ============================================
// External third-party services (used sparingly)
// These are centralized here so they are easy to proxy through our backend later.
// Currently still called directly from the browser (known limitation).
// ============================================

export const EXTERNAL = {
  // Used by BitcoinTransactionFees widget
  blockchainMempoolFees: () => 'https://api.blockchain.info/mempool/fees',
  coinGeckoBtcPrice: () => 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
};

export default API_BASE_URL;