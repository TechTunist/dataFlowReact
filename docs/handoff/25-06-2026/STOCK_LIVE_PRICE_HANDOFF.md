# Stock Live Price — Session Handoff

**Date:** 25 June 2026  
**Workspace:** `/home/matt/cryptological`  
**Repos:** `dataFlowReact/` (frontend, Vercel) · `SaaS/` (Django backend, Vercel)  
**Status:** Research & architecture decided — **not yet implemented**

---

## Why this doc exists

Continuation handoff for work started on 24–25 Jun 2026 (splash page polish + stock live-price design). Tomorrow's session may be on a **different machine without chat history**. This file is the single source of truth for the stock live-price feature.

---

## Goal

Make stock charts behave like crypto charts for freshness:

1. When a user opens a stock chart on a **trading day**, show a **current (or same-day) price** — not only the last nightly DB close.
2. **"Last updated"** should show **today's date** on trading days (not yesterday).
3. Stay **performant** and **within API limits** with multiple concurrent users.
4. Do **not** corrupt historical OHLCV or moving-average / risk calculations.

---

## How crypto does it today (copy this pattern)

### Utility: `dataFlowReact/src/utils/currentPrice.js`

- Fetches from **CoinGecko** public API (no key):  
  `https://api.coingecko.com/api/v3/simple/price?ids={coinId}&vs_currencies=usd`
- **60s in-memory cache**; localStorage fallback for BTC/ETH only.
- **Never throws** — returns `null` on failure.
- Called **once per chart load** per coin (no polling).

### Chart components (same pattern)

Used in: `BitcoinPrice.jsx`, `EthereumPrice.jsx`, `AltcoinPrice.jsx`

1. After historical data loads, call `getCurrentPrice(coin)` **once** (`currentPriceFetched` ref prevents repeats).
2. Store in state (`currentAltPrice` / `currentBtcPrice`).
3. Append live point with `priceSeriesRef.current.update({ time: today, value: price })` — **never** `setData()` + `fitContent()` here (preserves zoom).
4. Only when `denominator === 'USD'` for altcoins.

**Key snippet** (`AltcoinPrice.jsx` ~398–410):

```javascript
useEffect(() => {
  if (priceSeriesRef.current && currentAltPrice != null && chartData.length > 0 && denominator === 'USD') {
    const today = new Date().toISOString().split('T')[0];
    priceSeriesRef.current.update({ time: today, value: currentAltPrice });
  }
}, [currentAltPrice, denominator]);
```

### Historical data (separate from live overlay)

- Nightly cron → Django DB → `/api/{coin}/price/` → IndexedDB via `DataContext.fetchWithCache`.
- Live overlay is **client-only**; does not write back to Neon.

---

## What stocks do today (broken / stale)

### Historical daily OHLCV

- **Source:** Twelve Data via `SaaS/src/DashFlow/stock_fetch.py`
- **Cron:** GitHub Actions `SaaS/.github/workflows/update.yml` at **00:03 UTC** daily (after US close).
- **API routes:** `/api/tsla/price/`, `/api/nvda/price/`, etc. (stocks reuse `altcoinData` / `fetchAltcoinData` in `DataContext.js`).
- **Symbols:** `dataFlowReact/src/config/stocksConfig.js` (~29 stocks, `BRKB` → `BRK.B` on backend).

### Why charts look stale

On **Tuesday 2pm ET**, last DB bar is usually **Monday's close**:

1. Cron runs once nightly; today's `1day` bar may be incomplete.
2. `stock_fetch.py` **skips zero/invalid OHLC** for the current session bar (HOOD, GME, AMC especially).
3. `LastUpdated` = **last bar date in API response**, not live quote:

```javascript
// DataContext.js fetchFreshAndUpdate
const latestFetchedDate = formattedData[formattedData.length - 1].time;
setLastUpdated(latestFetchedDate);
```

See also: `dataFlowReact/BACKEND_DATA_PIPELINE_SAFETY_RUNBOOK.md` → "Stocks (different issue)".

### Live overlay — currently broken

`StockPrice.jsx` was copy-pasted from `AltcoinPrice.jsx` and calls:

```javascript
getCurrentPrice(selectedCoin)  // CoinGecko — TSLA → id "tsla" → fails silently
```

`StockRisk.jsx` / `StockRiskColor.jsx` use **last DB bar only** (no live fetch).

---

## Architecture decision (recommended)

### ❌ Pure client-side (Finnhub / exposed API key)

- Every user opening a chart = external API call.
- Shared `REACT_APP_*` key in bundle = **all users share one rate limit**.
- IndexedDB only helps repeat visits for **that user**; does not protect global quota.
- **Not recommended** for multi-user production.

### ❌ Upsert intraday price into daily OHLCV tables

- Would make "Last updated" work automatically but **skews 200-day MA, Mayer Multiple, stock risk** until nightly overwrite.
- Avoid.

### ✅ Hybrid: server-cached quote + client overlay (like crypto)

| Layer | Responsibility |
|---|---|
| **Nightly cron (existing)** | Authoritative daily OHLCV → Neon |
| **New quote cron (2×/trading day)** | Twelve Data `/quote` → small cache table |
| **New API endpoint** | `GET /api/stock-live-quote/{symbol}/` — serves cache, lazy-refresh if stale |
| **Client** | One fetch on chart open; `update()` overlay; bump LastUpdated display |

### Quote cron schedule (US trading days)

| Time (ET) | Purpose |
|---|---|
| **~9:35am** | Post-open snapshot — users see **today** early |
| **~4:05pm** | Post-close snapshot — final intraday price before nightly OHLCV job |

**API budget:** ~29 stocks × 2 = **~58 Twelve Data calls/day**, independent of user count.  
Existing nightly job adds ~29 more. Well within typical free-tier limits if spaced (workflow already waits 2s between batches).

### Weekends / holidays

- No quote fetch.
- Last bar stays Friday; LastUpdated = Friday (correct).
- Do **not** append Saturday/Sunday chart points.

---

## Proposed implementation checklist

### Backend (`SaaS/`)

- [ ] **Model** `StockLiveQuote` (or similar): `symbol`, `price`, `as_of_date`, `fetched_at`, `source`
- [ ] **Helper** `fetch_stock_quote(twelve_symbol)` using existing `TWELVE_DATA_API_KEY`
- [ ] **Symbol map** `BRKB` → `BRK.B` (mirror `stocksConfig.js` / existing management commands)
- [ ] **View** `GET /api/stock-live-quote/<symbol>/` — return cached row; refresh if missing/stale on trading day
- [ ] **Management command** `refresh_stock_live_quotes` — loop all symbols, upsert cache
- [ ] **Cron** — add batches to `update.yml` or Vercel cron at 9:35 ET + 4:05 ET (trading days only)
- [ ] **Trading-day guard** — skip weekends/US market holidays (simple weekday check minimum; holiday calendar optional v2)
- [ ] Register route in `urls.py`; add to subscription access if needed (stocks are paid)

### Frontend (`dataFlowReact/`)

- [ ] **New util** `src/utils/currentStockPrice.js` — fetch `/api/stock-live-quote/{symbol}`, 60s mem cache, IndexedDB cache keyed `stockLiveQuote_{symbol}_{date}`, never-throw
- [ ] **`StockPrice.jsx`** — replace `getCurrentPrice` → `getCurrentStockPrice`; fix comments; only overlay when `quote.as_of_date >= lastBarDate`
- [ ] **`StockRisk.jsx`** — optional: use live price for legend + append point before risk recalc (careful with algorithm)
- [ ] **`StockRiskColor.jsx`** — same as StockRisk
- [ ] **`LastUpdated`** — pass `customDate={max(lastBar, quoteDate)}` when live quote exists on trading day
- [ ] **Remove** broken CoinGecko call in `StockPrice.jsx`

### Tests

- [ ] `currentStockPrice.js` — cache hit, symbol mapping, null on failure
- [ ] Weekend: no overlay appended
- [ ] `as_of_date` logic when last bar is Friday and today is Monday

---

## Key files reference

| File | Role |
|---|---|
| `dataFlowReact/src/utils/currentPrice.js` | Crypto live price (template) |
| `dataFlowReact/src/components/StockPrice.jsx` | Broken live overlay |
| `dataFlowReact/src/components/StockRisk.jsx` | Last bar only |
| `dataFlowReact/src/components/StockRiskColor.jsx` | Last bar only |
| `dataFlowReact/src/config/stocksConfig.js` | Stock symbols & groups |
| `dataFlowReact/src/DataContext.js` | `fetchAltcoinData`, `altcoinLastUpdated` |
| `dataFlowReact/src/hooks/LastUpdated.jsx` | Display component |
| `SaaS/src/DashFlow/stock_fetch.py` | Daily OHLCV from Twelve Data |
| `SaaS/.github/workflows/update.yml` | Nightly cron (00:03 UTC) |
| `SaaS/src/DashFlow/urls.py` | Stock price API routes |

---

## Other splash-page work (same session, already deployed)

Unrelated to stock prices but done in the same session:

- Removed hover-expand on chart preview images (`ChartPreviewLink.jsx`)
- Removed "Asset coverage" bar (text + 3 coin icons) from `splash.jsx`
- Chart previews: full screenshot visible, links to gallery sections

---

## Open questions for tomorrow

1. **Twelve Data `/quote` on current plan?** Confirm endpoint + credit cost before coding.
2. **Holiday calendar** — weekday-only guard OK for v1?
3. **StockRisk / StockRiskColor** — overlay price only in legend, or recalculate risk with live price?
4. **IndexedDB TTL** — cache live quote client-side for rest of calendar day to avoid repeat API hits?

---

## Quick start tomorrow

```bash
cd /path/to/cryptological
# Frontend
cd dataFlowReact && git pull
# Backend
cd ../SaaS && git pull
# Read this file
cat ../25-06-2026/STOCK_LIVE_PRICE_HANDOFF.md
```

Start with backend `StockLiveQuote` model + quote endpoint, then wire `currentStockPrice.js` + `StockPrice.jsx`.

---

*Generated from Grok session handoff — 25 Jun 2026*