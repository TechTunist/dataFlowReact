/**
 * Stock symbols supported by the platform (Twelve Data daily OHLCV via backend).
 * `value` is used for API paths (/api/{value.toLowerCase()}/price/) and IndexedDB (altcoinData_{value}).
 * BRKB maps to Twelve Data symbol BRK.B on the backend.
 */
export const NASDAQ_TOP_STOCKS = [
  { label: 'NVIDIA (NVDA)', value: 'NVDA' },
  { label: 'Alphabet Class A (GOOGL)', value: 'GOOGL' },
  { label: 'Alphabet Class C (GOOG)', value: 'GOOG' },
  { label: 'Apple (AAPL)', value: 'AAPL' },
  { label: 'Microsoft (MSFT)', value: 'MSFT' },
  { label: 'Amazon (AMZN)', value: 'AMZN' },
  { label: 'Broadcom (AVGO)', value: 'AVGO' },
  { label: 'Meta Platforms (META)', value: 'META' },
  { label: 'Tesla (TSLA)', value: 'TSLA' },
  { label: 'Berkshire Hathaway (BRK.B)', value: 'BRKB' },
  { label: 'AMD (AMD)', value: 'AMD' },
  { label: 'SpaceX (SPCX)', value: 'SPCX' },
];

export const CRYPTO_ADJACENT_STOCKS = [
  { label: 'MicroStrategy (MSTR)', value: 'MSTR' },
  { label: 'Coinbase (COIN)', value: 'COIN' },
  { label: 'Marathon Digital (MARA)', value: 'MARA' },
  { label: 'Riot Platforms (RIOT)', value: 'RIOT' },
  { label: 'CleanSpark (CLSK)', value: 'CLSK' },
  { label: 'iShares Bitcoin ETF (IBIT)', value: 'IBIT' },
  { label: 'Robinhood (HOOD)', value: 'HOOD' },
  { label: 'Block Inc (BLOCK/SQ)', value: 'BLOCK' },
];

export const MARKET_BENCHMARK_STOCKS = [
  { label: 'SPDR S&P 500 (SPY)', value: 'SPY' },
  { label: 'Invesco QQQ (QQQ)', value: 'QQQ' },
  { label: 'SPDR Gold Shares (GLD)', value: 'GLD' },
  { label: 'iShares Russell 2000 (IWM)', value: 'IWM' },
];

export const RETAIL_SENTIMENT_STOCKS = [
  { label: 'GameStop (GME)', value: 'GME' },
  { label: 'Rumble (RUM)', value: 'RUM' },
  { label: 'AMC Entertainment (AMC)', value: 'AMC' },
  { label: 'SoFi Technologies (SOFI)', value: 'SOFI' },
  { label: 'Palantir (PLTR)', value: 'PLTR' },
];

/** @deprecated Use STOCK_GROUPS — kept for any legacy imports */
export const OTHER_STOCKS = [...CRYPTO_ADJACENT_STOCKS, ...RETAIL_SENTIMENT_STOCKS];

export const STOCK_GROUPS = [
  { id: 'mega-cap', label: 'Mega Cap Tech', stocks: NASDAQ_TOP_STOCKS },
  { id: 'crypto-adjacent', label: 'Crypto-Adjacent', stocks: CRYPTO_ADJACENT_STOCKS },
  { id: 'benchmarks', label: 'Market Benchmarks', stocks: MARKET_BENCHMARK_STOCKS },
  { id: 'retail', label: 'Retail Sentiment', stocks: RETAIL_SENTIMENT_STOCKS },
];

export const STOCKS = STOCK_GROUPS.flatMap((g) => g.stocks);

export const STOCK_VALUES = STOCKS.map((s) => s.value);