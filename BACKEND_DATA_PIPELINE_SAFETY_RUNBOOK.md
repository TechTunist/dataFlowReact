# Backend Data Pipeline Safety Runbook

**Purpose:** This document exists because losing or corrupting the historical dataset would be catastrophic. It is intentionally conservative.

**Last Updated:** Current

## Core Constraints (Never Forget These)

1. Production database contains years of historical data collected from rate-limited APIs.
2. Vercel serverless functions have a hard 10-second timeout.
3. This is why the architecture uses many small, individual per-asset update scripts.
4. Large backfills have historically needed to be run locally against the production database.
5. The daily update pipeline (GitHub Actions + `update_all.py --batch N`) is the only thing keeping the live site fresh.

Any change that risks breaking #3 or #5, or that could corrupt the data collected under those constraints, is unacceptable.

## Golden Rules

- **Additive changes only** for the foreseeable future when touching data models or ingestion logic.
- Never delete or alter existing columns/tables without an extremely long parallel coexistence period + proven migration path.
- New ingestion logic should live in new commands/scripts first, not by modifying the sacred update scripts.
- Always have a way to re-ingest or repair data from source if something goes wrong.
- Local reproduction of the pipeline must be reliable before we ever consider touching production ingestion paths.

## Current Architecture (As Understood)

- Orchestrator: `update_all.py --batch N`
- Trigger: Vercel cron → `/api/trigger-github-workflow/` → GitHub Actions workflow
- Individual scripts: `update_xxx.py` and various `precompute_xxx_risk.py` commands
- Success tracking: `DatasetUpdate` model
- Many scripts have corresponding backfill versions used historically.

## Safe Practices for Any Future Work

### When Exploring Changes

1. **Never run experimental ingestion against the real production database first.**
2. Use a local or branched Neon database for testing new ingestion logic.
3. Prefer creating new management commands (`update_xxx_v2.py` or `ingest_series.py`) rather than editing existing ones.
4. Document every new command's assumptions, rate limit handling, and timeout characteristics.

### When Considering Model Changes

- Adding new fields to existing models = Risk Level 2 (requires review).
- Creating entirely new models/tables for new data = Risk Level 1 (much safer).
- Any migration that alters existing columns or constraints = Risk Level 4 (avoid for now).

### Rollback & Recovery

- Every change that touches data ingestion must have a documented way to:
  - Detect it went wrong.
  - Stop further damage.
  - Re-populate the affected data from source if possible.

## Recommended Future Patterns (Safe Evolution)

1. **New "Series" abstraction layer** (you already have some of this) that can sit alongside the old per-asset models.
2. New read-optimized endpoints that the frontend can gradually adopt.
3. A more robust orchestration layer (still respecting the 10s limit per task) that can eventually replace the current batch system without a big-bang migration.
4. Better observability/logging around what actually succeeded in each daily run.

## Current Sacred Files / Areas (Treat with Extreme Caution)

- `update_all.py`
- All `update_*.py` and `precompute_*_risk.py` commands that are currently in the active batch rotation
- The `DatasetUpdate` model and how it is written to
- The GitHub Actions workflow that triggers updates
- The `/api/trigger-github-workflow/` endpoint
- Any model that stores primary historical time-series data (especially the various `XXXDaily` tables)

## How to Propose Changes Safely

Any proposal that touches the data pipeline must include:

1. Risk level (using the framework in JOINT_PROFESSIONALIZATION_PLAN.md)
2. Whether it is purely additive
3. How we would detect if it went wrong
4. Rollback / recovery steps
5. How it can be tested locally without risking production data

---

## Manual ops: altcoin date gaps (bottom 16 coins)

**When to use:** Charts for MOVE, RAY, RENDER, ARB, ALGO, MATIC/POL, XMR, ICP, ONDO, FET, NEAR, HYPE, LEO, LTC, UNI, or VET show a **flat gap** then a sudden jump to today.

**Root cause (Jun 2026):** CryptoCompare (`min-api.cryptocompare.com`) now returns **401 without an API key**. The nightly cron failed silently for these coins until fallback logic was added.

### Recovery command (safe — additive inserts only)

Run **locally** against production Neon (`DATABASE_URL` in `SaaS/.env`):

```bash
cd SaaS/src
../venv/bin/python manage.py fill_recent_gaps --days=30 --pause=15
```

| Flag | Meaning |
|------|---------|
| `--days=30` | Fetch window (increase if gap > 30 days) |
| `--pause=15` | Seconds between CoinGecko requests (avoid 429 on free tier) |
| `--symbol=MOVE` | Optional: one coin only |

### After backfill

1. Hard-refresh the app and spot-check one altcoin chart.
2. Add `CRYPTOCOMPARE_API_KEY` to Vercel backend env so cron uses the primary source (see below).
3. Do **not** delete rows manually — re-run `fill_recent_gaps`; it skips existing dates.

### CryptoCompare key vs CoinGecko fallback

| | Manual `fill_recent_gaps` | Nightly cron (16 coins) |
|--|---------------------------|-------------------------|
| **CoinGecko fallback** | Works with `--pause=15` (~4 min once) | Often **429 rate-limited** if all coins run quickly |
| **CryptoCompare + key** | One request per coin, fast | Reliable unattended daily updates |
| **Data quality** | CoinGecko: hourly-derived OHLC, volume=0 on fallback | CryptoCompare: native daily OHLCV |

CoinGecko is **insurance for manual recovery**. CryptoCompare key is **insurance for automation**.

### Stocks (different issue)

Stock scripts use Twelve Data. Last bar = **last US trading day**, not calendar today (weekends/holidays). Thursday before Juneteenth weekend is correct.

**Full checklist:** `SaaS/HANDOFF.md` → section **Manual ops toolkit — data pipeline**.

---

**This document should be updated whenever we learn something new about safe ways to evolve the system.**

Last updated: **2026-06-21** (altcoin gap recovery + `fill_recent_gaps`).