/**
 * Pure helpers for signed-in Dashboard Market Brief (habit loop).
 */

export function formatBriefUsd(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatBriefPct(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `${Number(value).toFixed(digits)}%`;
}

/**
 * Plain-English cycle / sentiment line for daily open habit.
 */
export function buildBriefNarrative(pulse, { daysLeft = null } = {}) {
  if (!pulse || typeof pulse !== 'object') {
    return 'Open a chart to load today’s context. Your dashboard is ready when you are.';
  }

  const parts = [];
  const fng = pulse.fear_and_greed;
  const fngVal = fng?.value != null ? Number(fng.value) : null;
  const fngCls = (fng?.classification || '').toLowerCase();

  if (fngVal != null && !Number.isNaN(fngVal)) {
    if (fngVal <= 25 || fngCls.includes('extreme fear')) {
      parts.push('Sentiment is in extreme fear territory, historically a higher-patience zone for long-term holders.');
    } else if (fngVal <= 45 || fngCls.includes('fear')) {
      parts.push('Sentiment is fearful, not euphoric, a useful backdrop for cycle and risk charts.');
    } else if (fngVal >= 75 || fngCls.includes('extreme greed')) {
      parts.push('Sentiment is in extreme greed, risk colour and cycle tools help avoid late-cycle FOMO.');
    } else if (fngVal >= 55 || fngCls.includes('greed')) {
      parts.push('Sentiment leans greedy, check risk bands and dominance before chasing strength.');
    } else {
      parts.push('Sentiment is near neutral, a good day to review structure rather than headlines.');
    }
  }

  const dom = pulse.btc_dominance_pct?.value;
  if (dom != null && !Number.isNaN(Number(dom))) {
    const d = Number(dom);
    if (d >= 55) {
      parts.push(`Bitcoin dominance is elevated (~${d.toFixed(1)}%), often a BTC-led tape.`);
    } else if (d <= 45) {
      parts.push(`Bitcoin dominance is softer (~${d.toFixed(1)}%), more room for alt-relative moves.`);
    } else {
      parts.push(`Bitcoin dominance sits near ${d.toFixed(1)}%.`);
    }
  }

  if (daysLeft != null && Number.isFinite(Number(daysLeft)) && Number(daysLeft) >= 0) {
    parts.push(`Roughly ${Math.round(Number(daysLeft))} days remain in the educational 100-day window countdown (historical average, not a prediction).`);
  }

  if (parts.length === 0) {
    return 'Market data is loading. Start with Risk Colour for cycle context, then pin charts you care about.';
  }

  return parts.join(' ');
}

export const BRIEF_NEXT_CHARTS = [
  { path: '/risk-color', label: 'Risk Colour', reason: 'Cycle map' },
  { path: '/dynamic-dca', label: 'Dynamic DCA', reason: 'Backtest rules' },
  { path: '/market-cycles', label: 'Market Cycles', reason: 'History' },
  { path: '/charts', label: 'Chart gallery', reason: 'Explore' },
];

/**
 * Metric tiles for the brief header.
 */
export function buildBriefMetrics(pulse) {
  if (!pulse) return [];
  const out = [];
  const btc = formatBriefUsd(pulse.btc_price?.value);
  if (btc) out.push({ key: 'btc', label: 'Bitcoin', value: btc, sub: pulse.btc_price?.date || 'Daily close' });

  if (pulse.fear_and_greed?.value != null) {
    out.push({
      key: 'fng',
      label: 'Fear & Greed',
      value: String(Math.round(Number(pulse.fear_and_greed.value))),
      sub: pulse.fear_and_greed.classification || 'Sentiment',
    });
  }

  const dom = formatBriefPct(pulse.btc_dominance_pct?.value);
  if (dom) {
    out.push({
      key: 'dom',
      label: 'BTC Dom',
      value: dom,
      sub: pulse.btc_dominance_pct?.date || 'Market share',
    });
  }

  const mcap = formatBriefUsd(pulse.total_market_cap?.value);
  if (mcap) {
    out.push({
      key: 'mcap',
      label: 'Total mcap',
      value: mcap,
      sub: pulse.total_market_cap?.date || 'Crypto market',
    });
  }

  const defi = formatBriefUsd(pulse.defi_tvl?.value);
  if (defi) {
    out.push({
      key: 'defi',
      label: 'DeFi TVL',
      value: defi,
      sub: 'DefiLlama',
    });
  }

  return out;
}
