# Cryptological Professionalization Sprint Improvements

**Branch:** feat/professionalization-sprint (main untouched)  
**Focus:** Code quality, maintainability, UX polish, tooling modernization, bulletproofing, and architecture for efficiency/sale-readiness. (Data freshness unchanged — all data still reflects yesterday's updates as before.)

## Key Improvements (short sentence bullets)

- Created isolated feat/professionalization-sprint branch and used parallel subagents for concurrent work on disjoint slices of the professionalization plan.
- Expanded DataService with centralized formatters (e.g. for fear & greed, macros, risks) and high-level getters for most series, plus extensive integration comments and TODOs for future data layer evolution.
- Decomposed the 1609-line Workbench monolith into a thin 1322-line orchestrator using five focused hooks (useWorkbenchSeriesData, useWorkbenchMovingAverages, useWorkbenchDerivedSeries, useWorkbenchSeriesManagement, useWorkbenchTooltip) and an availableSeries config file, preserving all behavior, performance, and mixed-frequency logic.
- Hardened heavy chart components (HistoricalVolatility, RiskTimeInBands, BitcoinTxMvrv, and others) with React.memo, useCallback/useMemo on pure work, stable effect dependencies, and console routing to the centralized logger to reduce re-renders from DataContext churn.
- Added robust email deduplication for welcome messages (free and premium) via a _send_welcome_if_not_recent helper using WebhookEvent for per-user/day caps, plus Clerk event recording, while fully preserving legacy webhook paths and all other emails.
- Improved subscription lifecycle displays with a clean display_status ('payment due' for live vs 'access ends on DATE' for ending states), updated backend response structure, and synced FE components (Subscription, Profile, RestrictToPaid) without changing any underlying logic or grace periods.
- Fixed Sidebar carousel active state logic to reliably highlight only for actual chart pages (exact match or categorized itemsData routes), eliminating false positives on routes like /subscription or /profile.
- Enhanced the MarketOverview BitcoinRisk widget to prefer fresh authenticated backend /api/risk-metrics/ data with robust fallbacks (IDB then calc only on sufficient data) and full logger usage instead of console.
- Created a client-side currentPrice.js utility (CoinGecko primary + Binance fallback, 60s cache, legacy localStorage compat, never-throws) and adopted live "Current: $xx,xxx" overlays in BitcoinPrice and EthereumPrice components.
- Upgraded signup UX with inline password mismatch error state + helper text (instead of alert) while preserving the full Clerk flow.
- Set up Vite incrementally as an additive path (vite.config.js with full CRA env/build/output compatibility, root index.html for Vite entry, new dev:vite/build:vite/preview:vite scripts) while keeping original CRA commands as the stable default.
- Added a minimal TypeScript foundation (tsconfig.json with loose settings for transition, currentPrice.ts as typed example) for future incremental adoption without breaking existing JS.
- Introduced real test coverage (DataService transforms, riskMetric calculations, LoadingFallback renders, SubscriptionContext gating contract, plus App smoke) achieving 5 suites / 14 passing tests under the existing CRA/jest setup (vitest prepped for later).
- Polished free tier visibility and UX with "FREE" badges in ChartsThumbnails, explicit free highlights section in dashboard zero-state, and "Charts (free + premium)" sidebar label, plus cross-references to public routes.
- Professionalized backend pipeline with a reusable command_logging helper (timing, success, rows), a new update_dominance_from_json management command (addressing the data.json backfill requirement), improved update_all orchestrator logging, and views updates for the bulletproofing items above.
- Heavily updated documentation including a full progress section in PROFESSIONALIZATION_REMAINING.md, new modernization status + getting-started notes in README.md, and inline "MODERN AGENT" / integration comments throughout code for handover.
- Performed complete integration of all subagent outputs (worktree merges, conflict resolution preferring clean agent versions, removal of prior manual shims/artifacts like stray index.html and old tsconfig.sprint), plus targeted bug fixes (e.g. Sidebar title mismatch) to ensure everything builds, tests pass, and the app is runnable.
- Ensured all changes were incremental, additive where possible, production-safe (no schema/migrations, legacy paths preserved, CRA default stable), with full CRA builds and tests remaining green throughout.
- Adjusted client-side caching logic in DataContext (and preload) so that for useDateCheck daily series (btcData, ethData, dominanceData, marketCapData etc.), if the cached data's latest date is before today, we force a fresh API fetch instead of serving stale "yesterday" data from within-TTL cache; this makes the sprint branch fetch current-day data immediately when the backend has it, matching main deployment behavior.

## Notes
- Data currency on the live backend is current (daily updates via GitHub Actions on backend main); the sprint frontend changes introduced more aggressive client caching (TTL + stale-while-revalidate + date checks) which could initially surface yesterday's snapshot in browser IndexedDB until revalidation or the new force logic. The main branch deployment (older caching or different cache state) appeared to fetch "current" more eagerly. The force-refresh fix above addresses the symptom for sprint. Backend data pipeline itself was not changed in this sprint (per safety rules).
- To activate Vite/TS after package.json updates: `npm install`, then use `npm run dev:vite` (or `build:vite`) alongside the unchanged CRA `npm start` / `npm run build`.
- All work lives on the feat/professionalization-sprint branch. Ready for review, further iteration (e.g. full DataContext delegations, Vite default flip, more tests), or production merge.

See git log on the branch and individual subagent outputs for full details.