# Cryptological Professionalization — Remaining Work

**Date:** Current (post parallel subagent professionalization sprint on feat/professionalization-sprint)
**Goal:** Bulletproof for regular users + efficient + sale-ready (premium, maintainable codebase that signals quality to buyers/acquirers).

**SPRINT STATUS (parallel subagents):** Major progress across slices. See git log on feat branch and subagent outputs. Workbench decomp (hooks) integrated with shims; DataService expanded with formatters; multiple charts hardened; bulletproof emails/sub/sidebar/widget/currentPrice util + tests/Vite starter/free charts; backend new logging + dominance json command (additive). Build green on FE, imports OK on BE. Remaining: full DataContext delegations using new service, complete hook wiring in Workbench (stubs in place), more test coverage, Vite as default, full current price rollout, real email dedup testing. Update this file as items close.
**Guiding Docs:** JOINT_PROFESSIONALIZATION_PLAN.md, QUALITY_PROFESSIONALIZATION_ROADMAP.md, SAFE_FRONTEND_DATA_LAYER_EVOLUTION_PROPOSAL.md, SYSTEM_COUPLING_MAP.md, BACKEND_DATA_PIPELINE_SAFETY_RUNBOOK.md, forGrokBuild.md, backend ToDo.md + frontend TODO.md (older).

**Core Principles (from prior work):**
- Production safety first. Zero risk to historical data or daily pipelines (additive, parallel paths, local repro first).
- Frontend changes can be more aggressive (no backend model/migration risk).
- Prioritize: (1) maintainability for future owners, (2) premium/reliable feel, (3) visible quality signals (modern stack, tests, docs), (4) perf.

---

## 1. Critical Bulletproofing & Reliability (Do First)

These affect user trust, data correctness, support load, and prod stability when usage increases.

- **Repetitive / duplicate emails on signup & subscribe** (backend ToDo.md) [DONE sub/bulletproof-fe + be]
  - Legacy `clerk_webhook` (sends free welcome) + `clerk_webhook_secure` (no email) + Stripe `customer.subscription.created` (sends premium welcome) + possible multiple Clerk events (`user.created`, `email.created`, `session.*`).
  - WebhookEvent model exists (used for Stripe idempotency) — extend for Clerk events + email sends. (added _send_welcome_if_not_recent + event_id guards in all 3 handlers + recording)
  - Add guards / dedup logic before sending (check recent send timestamp or event id).
  - Audit all email paths: welcome free, welcome premium, receipts, failures, cancellations, refunds.
  - Related: `testing email scripts` in management commands (export_emails, delete_test_emails) — ensure they are robust + logged.

- **Subscription status display & lifecycle labels** ("access ends" vs "payment due") [DONE sub/bulletproof-fe + be]
  - Backend `get_subscription_status` already has logic for 'canceling'/'canceled' → "Access will end on ..." or switches to free after grace. (now returns short `subscription_status` + new `display_status` = 'payment due' for live; 'access ends on DATE' for canceling/canceled future)
  - Frontend (Subscription.js, Profile.js, SubscriptionContext, RestrictToPaid.js) has partial handling but inconsistent:
    - "Next Payment:" vs "Access Ends:", "Canceled", status strings sometimes contain full phrases. (updated displays + conditionals to use display_status + raw internal for "Next Payment Due: DATE" / "Access Ends: DATE"; strengthened Restrict grace check)
    - ToDo: "if the subscription has been 'cancelled' then it should read 'access ends', if subscription is live, it should read 'payment due'".
  - Make labels crystal clear and consistent everywhere (billing portal button, profile, sub page, cancel dialog).
  - Test edge cases: past_due, canceling within grace, post-expiry auto-downgrade, Clerk metadata sync.
  - Still need **real end-to-end Stripe payment testing** (refunds pending per ToDo).

- **Market Overview btcRisk widget freshness** (backend+frontend ToDo) [DONE sub/bulletproof-fe]
  - Widget falls back to client calc from btcData or IDB cache (`getBitcoinRisk`/`saveBitcoinRisk` in idbUtils + calculateRiskMetric). (now prefers fetch /api/risk-metrics/ fresh latest (0-1 guard), uses logger, calc only if >400 pts data for reliable norm; IDB still for cache)
  - "needs to get latest value for btcRisk widget" — ensure it pulls precomputed latest from backend risk endpoints when available, or reliably computes + caches the *current* value.
  - Verify it shows up-to-date risk even if btcData preload is minimized.

- **Sidebar navigation state / highlighting bugs** (ToDo) [DONE sub/bulletproof-fe]
  - Carousel + "Charts" special-case active logic in Sidebar.jsx is fragile (isActive for Charts when not on /dashboard or /market-overview).
  - Buttons don't reliably highlight only for selected area. Fix + add tests or visual regression if possible. (simplified: exact for dash/ov, Charts only on /charts or categorized item paths like /bitcoin /workbench)

- **Free vs paid gating & "is market overview a free page?"**
  - MarketOverview is currently `protected: true` in App.js routes.
  - Decide policy + enforce consistently (backend + frontend RestrictToPaid + Clerk metadata).
  - Audit all "free charts" access (ToDo item: add a "free charts" section to the charts page?).
  - Ensure no data is fetched/rendered for paid-only before auth + sub check completes (see RestrictToPaid + SubscriptionContext).

- **Signup UX: double password confirmation** [DONE sub/bulletproof-fe]
  - LoginSignup/index.jsx already has `confirmPassword` + mismatch alert + Clerk signUp.create.
  - ToDo may be stale or wants better UX (inline error, disable submit until match, password strength meter via Clerk, show requirements).
  - Review Clerk config for password policy. (improved to inline error state + helperText on TextField, clear on edit)

- **Password reset in production**
  - "test reset password now we are in production" — verify Clerk flow end-to-end, emails, redirects, error states.

- **Security hygiene**
  - **Remove plaintext secrets from ToDo.md** (Neon API token + curl in vercelDataFlow/SaaS/ToDo.md — this is in the repo).
  - Audit all .md, code, env examples for keys.
  - Legacy webhook endpoint (`/api/clerk-webhook/`) still mounted alongside secure one — consider deprecation + removal after confirming traffic.
  - Review all places fetching before subscription status is known.
  - Add rate limiting / abuse protection on public-ish endpoints if not present (Django + Vercel).
  - Consider adding basic request logging / observability for prod debugging.

- **Daily data pipeline robustness (backend)**
  - Add/improve per-script logging: time taken, success/failure, row counts, API errors (old NOTE in TODO.md).
  - Make GH Actions + update_all.py --batch more observable (exit codes, summaries, failure notifications?).
  - Enhance `DatasetUpdate` usage or add last-success-per-dataset visibility to frontend (last updated badges already exist in some places via hooks/LastUpdated).
  - Dominance backfill: "update dominance from data.json as there is no way in backfilling the data from api without subscription".

- **Current / live price overlays** [DONE sub/bulletproof-fe: util ready]
  - "add current price to bitcoin (and altcoins if possible) like we did with the 20 week extension (we can get current values in real time from client based request for free on free APIs)".
  - Bitcoin20WeekExtension and several premium charts (Puell, OnChainRisk, HistoricalVol etc.) already surface live-ish current price.
  - Main BitcoinPrice, AltcoinPrice, dashboard widgets etc. need consistent treatment (some commented code in BitcoinPrice.jsx for localStorage current price from fees?).
  - Centralize a "current price" lightweight client fetch (coingecko/binance public ticker or similar) + cache short TTL, without hitting our backend for every user. (created src/utils/currentPrice.js with getCurrentBtcPrice + getCurrentAltPrice, 30s mem+ls cache; documented for adoption by charts)

- **Error handling & user-facing resilience**
  - Route all remaining raw `console.*` in src/ through centralized `logger` (some persist in Sahm, Topbar, DataContext risk, FearAndGreedBinaryContext, etc.).
  - Improve empty / loading / error states uniformly (LoadingFallback, ErrorBoundary already placed top + Workbench; extend to more charts).
  - Graceful partial failures (e.g., one macro series down shouldn't break Workbench).

---

## 2. Architectural & Maintainability (Highest Leverage for Sale / Handover)

From QUALITY_ROADMAP + DATA_LAYER_PROPOSAL + COUPLING_MAP (these are the "this no longer looks like a side project" items).

**Frontend Data Layer (in progress — continue incrementally):**
- DataService.js foundation exists (normalize, dedup, getBtc/ Eth /Mvrv /MarketCap /DominanceSeries, initialize from DataContext).
- Only ~5 series fully delegated; DataContext still ~1876 LOC with dozens of individual fetch*/refresh* + state.
- Next:
  - Delegate more (Fear&Greed variants, macros, risk metrics, onchain, altcoins, FRED, derived?).
  - Extract repeated "preload guard + waitForPreloadIfNeeded + isFetched" pattern (already partially done).
  - Begin consuming the service layer from Workbench (big win).
  - Goal: DataContext becomes thin coordinator (global concerns, preload policy, subscription, actions facade).

- **DataContext split**
  - Split raw data state from actions (fetch/refresh) — either two contexts or stable `actions` sub-object in the value.
  - This + service layer = massive reduction in re-render surface for 50+ consumers.
  - Keep old fetch* functions during transition for safety (per proposal).

**Workbench (1609 LOC, most sophisticated + interactive premium feature):**
- Already received major perf work (direct-DOM tooltip + rAF, precomputed Map lookups per series for O(1), React.memo, mixed-freq LOCF fixes, derived series Infinity guards + aggressive fitContent).
- **Decomposition sprint (this sub/workbench-decomp slice): COMPLETE**
  - Extracted 5 focused hooks under `src/hooks/useWorkbench*.js` + small config piece in `src/components/workbench/availableSeries.js`:
    - `useWorkbenchSeriesData` (getRawData + getNormalized via DataService, getters, // INTEGRATE comments + TODOs for getDerivedSeries etc.)
    - `useWorkbenchDerivedSeries` (computeDerivedData + guards + create + dialog state)
    - `useWorkbenchMovingAverages` (calc + getSeriesData + MA/color overrides + dialog)
    - `useWorkbenchSeriesManagement` (actives + change handlers that trigger context/DS-backed fetches + clear)
    - `useWorkbenchTooltip` (direct-DOM rAF creation + update + schedule)
  - Refactored Workbench.jsx to thin orchestrator + chart instance mgmt (refs, createChart effect, series setData effect, render).
  - Added useCallback/useMemo, stable refs (for hook composition), no new mutations.
  - Data access: routed through hook using existing DS methods (getBtcPriceSeries etc in imports + comments); normalize/dedup fully via DS.
  - **Zero behavior change** for users (add series, derived ratio/diff e.g. SP500/BTC, MAs, tooltips, mixed-freq LOCF, fullscreen, export, save/load paths if any).
  - `npm run build` succeeds.
  - Remaining large effect (series sync to chart) noted for future; MA freq polish + full DS getDerived still TODO for data-layer agent.
  - See commit history on sub/workbench-decomp + forGrokBuild updates.
- Next: other charts + full data layer consumption of the new hooks where shared.

**Chart components (many similar heavy patterns):**
- Recent hardening: BitcoinMvrvZScore, PuellMultiple, OnChainHistoricalRisk (React.memo + useCallback on pure work + stable deps for createChart effects).
- Audit & apply same to remaining high-cost charts: HistoricalVolatility, RiskTimeInBands, Workbench (done), BitcoinTxMvrv, MarketHeatIndex, many altcoin/price charts, FredSeriesChart, etc.
- Add progressive / windowed loading for very long series if needed.
- Consistent primitives for price lines, tooltips, current-value callouts.

**Other arch:**
- Client-side subscription gating review: ensure `restrictToPaidSubscription` HOC + hooks never allow paid data fetch/render before verified.
- Centralize more technical indicator / risk calc logic (utility/riskMetric.js, technicalIndicators.js).

**Backend (additive only, respect safety runbook):**
- **Series abstraction** (models already have some `Series` + observations) — grow read paths without touching per-asset XXXDaily tables.
- New generic read endpoints (e.g. `/api/series/{id}/data/`) that frontend data layer can adopt later — huge relief for coupling.
- Standardize management commands (base class for logging, normalization, rate-limit backoff, DatasetUpdate recording). 100+ similar scripts are the maintenance tax.
- Clean up duplication in api.py / views.py (many near-identical price handlers).
- Two webhook paths: consolidate.

**Modern stack signals (visible to buyers):**
- Migrate from Create React App (react-scripts) → Vite (package.json still on CRA; engines now 20.x).
- Incremental TypeScript (new files + critical modules like DataService, risk utils, subscription logic first).
- Real test coverage (currently boilerplate only):
  - Data transforms / normalization / dedup / computeDerivedData.
  - Workbench core logic (series add/remove, derivation, mixed freq).
  - Subscription status machine + gating.
  - Backend: model constraints, webhook idempotency, status transitions (at least smoke + a few integration).

---

## 3. Product Polish, UX & Sale-Readiness

- **"Free charts" section** + clarify free tier experience (ToDo).
- **Market Heat Index chart from widget** (difficult, per ToDo) — evaluate if worth the effort vs other polish.
- Add current price consistently (see bulletproofing).
- Consistent "last updated" / freshness UI everywhere (LastUpdated hook exists; expand).
- Improve dashboard / sidebar / nav polish (state bugs above).
- Bundle size & lazy loading: audit direct imports of heavy libs (Plotly still used in some, lightweight-charts primary). Lazy more premium-only routes/components.
- More chart interactivity / buttons as in old phase (bleed factor etc. lower priority now).
- About / splash / marketing pages polish if dated.
- Error + empty states feel premium.
- Mobile: more testing (useIsMobile hook exists).
- Remove or archive old planning docs from root after work is done (or move to /docs); keep forGrokBuild + runbooks.

**Documentation for handover / buyer:**
- "How to add a new asset/metric/chart" runbook.
- "How the subscription + Clerk + Stripe flow works" (with sequence diagram).
- "Daily data pipeline runbook" (already have safety one — expand with common failure modes + local repro steps).
- "Frontend data access patterns" (once DataService matures).
- Environment / deploy checklist.
- Architecture decision records for key choices (granular models, client derivation, etc.).

**Other sale signals:**
- High-quality short demo video / screenshots of Workbench + key valuation charts.
- Optional privacy-respecting usage events (what charts get used?).
- Clean git history, no secrets, green builds.
- Remove test data / emails scripts from prod paths or gate them.

---

## 4. Lower Priority / Nice-to-Haves (After Core)

- Old phase items: more altcoins, bleed factor formula, more macro (PMI etc.), advanced charts from Bitbo/Coinglass ideas.
- Backend: more precomputes, realised cap on MVRV, etc. (from readme.md).
- Full design system / shared chart component library.
- External monitoring (Sentry for FE/BE, uptime for data freshness).
- GDPR / data export / account deletion flows.
- 2FA encouragement (Clerk supports), better password UX.
- CI: GitHub Actions for lint, build, (light) tests on PRs.
- Performance budgets + bundle analyzer in build.

---

## 5. Quick Wins That Are Probably Already Partially Done (Verify)

- Many caching / preload reductions, stale-while-revalidate, ErrorBoundaries, logger rollout — verify no regressions.
- Confirm double-password field exists (it does — polish the UX).
- Some current price logic exists in premium charts.

---

## Recommended Order (Next Session)

1. **Bulletproofing batch** (emails idempotency + de-dup, subscription label cleanup + tests, remove secret from ToDo.md, sidebar fix, market-overview risk latest, gating audit).
2. **Continue data layer** (delegate 5–10 more series, start wiring Workbench to DataService, extract more helpers).
3. **More chart + Workbench hardening + hooks extraction**.
4. **Vite migration + first TS files + first real tests** (high signal).
5. Backend standardization (new command base, logging, one more generic series endpoint).
6. Docs + polish pass.
7. End-to-end payment + reset password + load testing.

Track progress in this file + forGrokBuild.md. All changes small, reviewable, builds green, behavior preserved where possible.

**Status of this list:** Living. Update as items are completed or new ones discovered during regular use.
