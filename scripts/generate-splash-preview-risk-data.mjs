/**
 * One-off generator: fetches real BTC daily prices (public CoinGecko) through
 * 2024-10-10, runs calculateRiskMetric, writes fenced preview JSON for splash.
 *
 * Re-run manually if you ever want to refresh the frozen snapshot:
 *   node scripts/generate-splash-preview-risk-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { calculateRiskMetric } = require('../src/utility/riskMetric.js');

const PREVIEW_END = '2024-10-10';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../src/data/splashPreviewRiskData.json');

async function fetchBtcDaily() {
  const url = 'https://api.blockchain.info/charts/market-price?timespan=all&format=json&sampled=false';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`blockchain.info ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.values || [])
    .map(({ x, y }) => ({
      time: new Date(x * 1000).toISOString().slice(0, 10),
      value: Number(Number(y).toFixed(2)),
    }))
    .filter((row) => row.time <= PREVIEW_END && row.value > 0)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function slimRiskRows(rows) {
  return rows.map((d) => ({
    time: d.time,
    value: d.value,
    Risk: Number(d.Risk.toFixed(6)),
  }));
}

async function main() {
  console.log('Fetching BTC prices through', PREVIEW_END, '...');
  const prices = await fetchBtcDaily();
  console.log(`Got ${prices.length} daily points.`);
  const riskData = calculateRiskMetric(prices);
  const payload = {
    previewEnd: PREVIEW_END,
    previewEndLabel: '10 October 2024',
    source: 'blockchain.info daily USD (frozen public snapshot)',
    pointCount: riskData.length,
    data: slimRiskRows(riskData),
  };
  fs.writeFileSync(outPath, JSON.stringify(payload));
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});