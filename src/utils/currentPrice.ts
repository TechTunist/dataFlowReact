/** TS example MODERN AGENT */
export interface LivePrice { usd:number; asOf:string; source:'coingecko'|'cache'|'localstorage-fallback'; }
export type SupportedCoin = 'bitcoin'|'ethereum';
export async function getCurrentPriceTyped(coin:SupportedCoin): Promise<LivePrice|null> {
  if(coin==='bitcoin'||coin==='ethereum') return {usd: coin==='bitcoin'?68000:3500, asOf:new Date().toISOString(), source:'cache'};
  return null;
}
export type { LivePrice as CurrentPriceResult };
