# Free data sources for Cryptological

Budget constraint: **no paid data APIs for now.** Prefer sources that work with free tiers or no key, and respect rate limits (especially under free Vercel / GH Actions batching).

This is a living list of free options to evaluate. Nothing here is auto-wired unless already in the app.

## Already used (or historically used)

| Source | Use | Notes |
|--------|-----|--------|
| **CoinGecko** (free / demo key) | Altcoin daily prices | Rate-limit carefully; optional free demo API key raises limits |
| **Twelve Data** | Stocks | Free tier; batch + sleep in cron |
| **FRED (St. Louis Fed)** | Macro series | Free API key; excellent for Workbench / FredSeriesChart |
| **CoinMetrics community API** | Some on-chain / MVRV history | Free community endpoints; limited metrics |
| **Alternative.me Fear & Greed** | Sentiment | Free public API historically used for F&G |
| **Blockchain.info / mempool** | Fees (client-side) | Browser-callable; rate limits apply |
| **NOMIS (UK ONS)** | UK labour series | Free official stats |
| Static / CSV backfills | Dominance, gaps | When live APIs lack history |

## Strong free candidates to explore next

### Market prices & discovery
| Source | Why interesting | Caveats |
|--------|-----------------|---------|
| **CoinGecko keyless / Demo** | Broad coin list, market charts | Strict RPM; don’t call from every browser user for heavy series |
| **CoinPaprika** | Free historical + markets | Terms/rate limits; good backup to CoinGecko |
| **Binance public REST** | Spot klines OHLCV, no key for many endpoints | Exchange-centric; listing bias; ToS for redistribution |
| **Kraken public REST** | OHLC, order book | Same caveats as exchange APIs |
| **DexScreener** | Free, no key for DEX pairs | Great for alts on DEX; not a CEX market-cap source |

### Macro / traditional finance (free)
| Source | Why interesting | Caveats |
|--------|-----------------|---------|
| **FRED** | Already integrated; expand series (WALCL, Core PCE, mortgage rates, dollar index) | API key free; document series IDs |
| **Yahoo Finance** (unofficial / community libs) | Equities, indices, FX | Unofficial; can break; prefer Twelve Data free tier when possible |
| **ECB SDW / Eurostat** | EU rates, HICP | Free; good if EU macro audience grows |
| **World Bank / IMF APIs** | Global macro | Coarse frequency; good for context charts |

### On-chain / crypto fundamentals (free tiers)
| Source | Why interesting | Caveats |
|--------|-----------------|---------|
| **CoinMetrics Community** | CapMVRV, supply metrics | Limited metric set vs paid |
| **Blockchain.com charts API** | Some BTC network series | Coverage narrower than Glassnode |
| **mempool.space API** | Fees, mempool, lightning stats | Great for fee widgets; not full on-chain valuation suite |
| **DefiLlama** | TVL, fees, stablecoin mcap | Free API; DeFi-focused, useful macro-crypto context |
| **Dune** (public queries / free tier) | Custom on-chain SQL | Operational complexity; not a simple REST drop-in |
| **Blockchain explorers** (Etherscan-class free tiers) | Token transfers, gas | Per-chain keys; free quotas low |

### Sentiment / alternative
| Source | Why interesting | Caveats |
|--------|-----------------|---------|
| **Alternative.me F&G** | Already aligned with product | Single series |
| **Reddit / RSS** (DIY) | Narrative heat | Heavy engineering; moderation risk |
| **Wikipedia pageviews** | Attention proxy | Fun experimental Workbench series |

## Product rules for free sources

1. **Prefer server-side daily ingest** into Neon (existing pattern) over every-user client fetches.
2. **Never put paid-only keys in the React bundle** (`REACT_APP_*` is public).
3. **Respect Vercel 10s** — one small job per batch, backoff between CoinGecko/etc.
4. **Additive only** on historical tables (see `BACKEND_DATA_PIPELINE_SAFETY_RUNBOOK.md`).
5. **Document rate limits** in the management command docstring when adding a source.

## Highest-ROI free adds (no new paid vendors)

1. ~~More **FRED** series in Workbench (`WALCL`, `PCEPILFE`, `CPILFESL`, `MORTGAGE30US`, `DTWEXBGS`)~~ — **shipped on growth branch** (FE routes + Workbench + `populate_fred_series` defaults). **Ops:** run against Neon once:
   ```bash
   python manage.py populate_fred_series --series-ids WALCL PCEPILFE CPILFESL MORTGAGE30US DTWEXBGS
   python manage.py update_fred_macro --series-ids WALCL PCEPILFE CPILFESL MORTGAGE30US DTWEXBGS --backfill
   ```
2. ~~**DefiLlama** stablecoin / total DeFi TVL~~ — **shipped on growth branch (slice 4)** as public pulse enrichment only (no DB tables): `api.llama.fi/charts` + `stablecoins.llama.fi/stablecoins`, 15‑min cache, non-fatal if down. Optional later: daily Neon series for Workbench history.
3. **mempool.space** fee history if not already covered well by current fees chart.
4. **CoinPaprika** as failover when CoinGecko rate-limits bottom-16 alts.
   - Free tier: `https://api.coinpaprika.com/v1/` (no key for many endpoints).
   - Good for: OHLCV / tickers when CoinGecko 429s on bottom-16 altcoin cron.
   - **Not wired yet** — add as secondary path in `altcoin_fetch.py` only after local rate-limit tests.
   - Prefer server-side daily ingest (same batching + pause pattern as CoinGecko).

## Newsletter brief export (growth slice 6)

Manual weekly copy for Zoho (no paid email API):

```bash
cd SaaS/src
python manage.py export_weekly_brief --output=weekly_market_brief.txt --stdout
python manage.py export_emails   # subscriber list separately
```

Paste `weekly_market_brief.txt` into the campaign body; import the CSV for recipients.

## Out of scope until budget exists

Glassnode, CryptoQuant, paid CoinMetrics, paid CoinDesk/CryptoCompare plans, Kaiko, Amberdata, etc. Design features so they can plug in later without rewriting free paths.
