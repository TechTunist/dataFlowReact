/**
 * TypeScript example for the current price util (incremental TS starter).
 * MODERN AGENT: this .ts file created as the "convert to .ts" example (t6).
 * The runtime impl lives in sibling currentPrice.js (adopted by BitcoinPrice + EthereumPrice).
 * This provides types + future migration path. With tsconfig "include": ["**/*.ts"] + "noEmit":true,
 * `npx tsc --noEmit` will check it (and any new .ts) without affecting CRA/vite emit.
 *
 * Can later rename .js -> .ts, delete this, update imports (no ext change needed).
 */

export interface LivePrice {
  usd: number;
  asOf: string; // ISO
  source: 'coingecko' | 'cache' | 'localstorage-fallback';
}

export type SupportedCoin = 'bitcoin' | 'ethereum';

export async function getCurrentPriceTyped(coin: SupportedCoin): Promise<LivePrice | null> {
  // In real, delegates to the .js impl or duplicates fetch.
  // Here stub for type illustration.
  if (coin === 'bitcoin' || coin === 'ethereum') {
    return {
      usd: coin === 'bitcoin' ? 68000 : 3500,
      asOf: new Date().toISOString(),
      source: 'cache',
    };
  }
  return null;
}

// Re-export shape for consumers that want types alongside the JS default.
export type { LivePrice as CurrentPriceResult };
