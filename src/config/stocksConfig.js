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
  { label: 'SpaceX (SPCX)', value: 'SPCX' },
];

export const OTHER_STOCKS = [
  { label: 'MicroStrategy (MSTR)', value: 'MSTR' },
  { label: 'GameStop (GME)', value: 'GME' },
];

export const STOCKS = [...NASDAQ_TOP_STOCKS, ...OTHER_STOCKS];

export const STOCK_VALUES = STOCKS.map((s) => s.value);