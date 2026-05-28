# Grok Build Continuity File - Cryptological Frontend Audit Remediation

**Date:** May 2026 (current session)  
**Branch:** `refactor/audit-remediation`  
**Project:** dataFlowReact (frontend for cryptological.app)

---

## Current Context & Goal

We are executing a structured **frontend-only** security, performance, and code quality remediation based on an earlier audit (SaaS-Refactoring-Analysis.md + explicit remediation list).

**Core directive from user:**
- Focus only on changes that can be made in the React frontend.
- Anything requiring backend changes (new endpoints, data model changes, proxies, etc.) should be bundled and handled later when we analyze the Django SaaS backend.
- User has given full autonomy ("take the lead", "go ahead in the way you best see fit").

**Current branch status:** Clean working tree, multiple focused commits.

---

## Completed Work

### Phase 1: Quick Wins + Foundation (COMPLETE)

- Created `src/utils/logger.js` as a centralized logging utility (easy future upgrade path to Sentry/etc.).
- Rolled out logger across high-noise areas (Workbench, idbUtils, BitcoinTransactionFees, etc.).
- Created reusable `ErrorBoundary` component with clean fallback UI.
- Integrated ErrorBoundary at top-level in App.js + inside the complex Workbench component.
- Cleaned up ad-hoc `localStorage` caching in `BitcoinTransactionFees.jsx` (added comments explaining why it uses localStorage vs main IndexedDB system).

### Phase 2: Core Efficiency (Largely COMPLETE)

#### 2a. DataContext Preloading Reductions (COMPLETE)
Multiple aggressive but safe incremental cuts. The eager preload has been dramatically reduced:

**Final remaining eager preload (very focused):**
- `btcData`, `mvrvData`, `dominanceData`, `ethData`
- `fearAndGreedData`, `marketCapData`, `latestFearAndGreed`
- Forced early `fetchFredSeriesData('SP500')` (for dashboard chart)

**Major datasets moved to demand-loaded across sessions:**
- onchain metrics + address metrics
- altcoin season timeseries
- fedBalanceData
- initialClaims, interest, unemployment
- txCountCombined, txMvrv
- inflation, basic txCount
- macroData + altcoinSeasonData
- All 5 risk metric variants
- differenceData, total2Data, total3Data

All related `preloadComplete` guards were cleaned up as items were moved.

#### 2b. IndexedDB Caching Strategy Improvements (Significant Progress)
Major upgrades to the caching layer:

- Added `isCacheFresh()`, `getFreshCachedData()`, `DEFAULT_CACHE_TTL`
- Added `pruneOldCache()` + automatic pruning on DataContext mount
- Full **stale-while-revalidate** implementation in `fetchWithCache`:
  - Serves stale data instantly when available (great perceived performance)
  - Refreshes in background via `fetchFreshAndUpdate` helper
- Per-entry `ttl` support in `cacheConfigs` (demonstrated with shorter TTLs for volatile data like `latestFearAndGreed` and `fearAndGreedData`)
- Added cache observability logging (`[Cache] HIT (fresh)`, `HIT (stale, revalidating)`, `MISS`)
- Updated `fetchWithCache` and preload logic to use the new helpers

---

## Current State (as of end of session)

- **Data loading:** Dramatically lighter initial load. Most data is now demand-loaded by the charts that actually need it.
- **Caching:** Significantly improved with stale-while-revalidate, per-metric TTLs, pruning, and visibility into cache behavior.
- **Reliability:** Proper ErrorBoundaries in place (top level + Workbench).
- **Code quality:** Much cleaner logging, fewer dead imports, better structure in key areas (App.js routes, DataContext).
- **Branch:** `refactor/audit-remediation` — clean, with good commit history documenting the work.

---

## Recommended Next Steps (When Resuming)

The remaining high-priority frontend items from the original audit (in rough priority):

1. **Chart component performance hardening** (high impact)
   - Add more `React.memo` / `useMemo` / `useCallback` in heavy charting components.
   - Progressive loading for long time series.
   - Review expensive re-renders triggered from context updates.

2. **Bundle size & deeper lazy loading audit**
   - Audit remaining direct (non-lazy) imports of heavy components.
   - Consider more route/component-level splitting for less frequently visited premium charts.

3. **Clean up remaining duplication in chart components**
   - Many charts have very similar fetching/caching/loading patterns.
   - Opportunity to create small reusable hooks or wrapper components.

4. **Client-side subscription gating review**
   - Review all uses of `restrictToPaidSubscription`.
   - Ensure no sensitive data is ever fetched/rendered before the check.
   - Improve loading states during subscription verification.

5. **Minor polish**
   - Continue routing any remaining raw `console.*` calls through the logger.
   - Consider adding a simple cache stats hook or debug view (nice-to-have for proving wins).

**Suggested approach when resuming:**
- Start with #1 (chart performance) as it has direct user impact.
- Keep the same disciplined style: small-to-medium commits, build verification after changes, clear commit messages.

---

## Key Files Modified (Summary)

- `src/DataContext.js` — Major reductions + caching logic upgrades
- `src/utility/idbUtils.js` — New caching helpers (`pruneOldCache`, `getFreshCachedData`, etc.)
- `src/App.js` — Route config refactor (earlier) + ErrorBoundary integration
- `src/components/ErrorBoundary.jsx` — New
- `src/utils/logger.js` — New
- `src/components/Workbench.jsx` — Logger + inner ErrorBoundary
- `src/components/BitcoinTransactionFees.jsx` — Caching cleanup + logger

---

## Notes & Decisions

- We are deliberately **not** touching anything that would require backend changes at this stage.
- The user has been very happy with an autonomous "take the lead" style on execution.
- All work has stayed on the `refactor/audit-remediation` branch.
- We have been maintaining a living todo list inside the session for tracking.

---

## How to Continue Tomorrow

1. Read this file first.
2. `cd dataFlowReact && git status` + `git log --oneline -10` to reorient.
3. Check current branch is still `refactor/audit-remediation`.
4. Run `npm run build` to confirm clean state.
5. Look at the most recent commits for exact context.
6. Pick up with the next item in the "Recommended Next Steps" section above (chart performance hardening is the natural continuation).

---

**Good work today. The app is in a noticeably better state on performance, reliability, and maintainability.**

See you tomorrow.

---

## Session: Chart Performance Hardening (Current)

**Date of this update:** Current session (continued from previous)

### Work Completed This Session
- **Primary focus:** Chart component performance (item #1 in Recommended Next Steps).
- **Root cause identified:** The very large single `DataContext` value object (one useMemo with 170+ dependencies) + many chart components depending on raw context arrays in heavyweight `useEffect` + `createChart` calls means unrelated data updates anywhere cause expensive full re-renders and chart instance recreation for long time-series charts (lightweight-charts setup is non-trivial).
- **First targeted fix (committed):** [BitcoinMvrvZScore.jsx](src/components/BitcoinMvrvZScore.jsx)
  - Added `React.memo` wrapper (before the paid-subscription HOC).
  - Memoized the expensive client-side MVRV Z-Score calculation (`useCallback`) — also fixed a latent bug where the function mutated its input array.
  - Memoized filtered data + derived z-score series (`useMemo`).
  - Changed the main chart creation `useEffect` (the one that does `createChart` + adds multiple series for 10+ years of data) to depend on the stable memoized derived values instead of raw `txMvrvData`/`btcData` from context.
  - Result: Chart DOM/canvas recreation is now skipped when DataContext causes new array references for unrelated reasons (very common before).
- Verified: Full production build succeeds cleanly for this change.
- Git: One focused commit on the branch (`perf(charts): harden BitcoinMvrvZScore...`).

### Approach & Constraints Respected
- 100% frontend-only (no backend, no new API calls, no data model changes).
- Preserved exact visual + interactive behavior.
- Used the existing strengths (lightweight-charts is already an excellent choice for this domain; many charts were already partially memoized and lazy-loaded).
- Disciplined: small focused change, build verification, clear commit message.
- Also incidentally improved code quality (removed a mutation side-effect).

### Recommended Continuation (Next Session or Remaining Time)
Pick 2–4 more high-impact charts with similar patterns and apply the same treatment:
- PuellMultiple (client-side issuance + Puell + cycle math on long series)
- OnChainHistoricalRisk (already has some memoization — audit for effect deps)
- HistoricalVolatility
- RiskTimeInBands
- Workbench (highest complexity / most interactive premium component — worth extra care)

After a few more per-chart wins, consider a higher-leverage DataContext refactor:
- Split data vs actions into two contexts (or provide a stable `actions` sub-object).
- This would benefit *all* 50+ consuming components at once with less per-file work.

Also worth a quick pass:
- Route any remaining `console.debug`/`console.warn` inside chart effects through the centralized logger (low effort, high consistency).

When the top 5–6 heaviest charts are hardened, re-evaluate with a fresh `npm run build` + manual smoke test of the premium valuation charts (MVRV Z, Puell, On-Chain Risk, Workbench).

**Current state feels good — two core premium valuation charts (MVRV Z-Score + Puell Multiple) are now significantly more resilient to parent/context churn while keeping their rich interactivity, accuracy, and behavior.**

### Second chart completed this session
- **PuellMultiple.jsx** (another high-value on-chain miner valuation / cycle indicator)
  - Already had excellent architecture (main chart created once with `[]` deps, subsequent updates via lightweight `setData()` on series refs driven by `useMemo` derivations for price, puell, and normalized-puell series).
  - Hardening focused on reducing per-render function churn: all pure helpers and handlers (`calculateDailyIssuance`, `normalizeTime`, `compactNumberFormatter`, `calculateLeftPosition`, `setInteractivity`, `resetChart`) wrapped in `useCallback`.
  - Removed small amount of dead code (scaling factor helpers that were no longer called after the cycle-weighting implementation).
  - Added `React.memo` wrapper (consistent with MVRV approach).
  - Build verified clean.

This continues the pattern: protect expensive or frequently-called pure work and component roots from DataContext identity changes and parent re-renders.

**Progress this session (3 charts hardened):**
- BitcoinMvrvZScore (first — heavy Z-score calc + full chart recreation protection)
- PuellMultiple (second — already strong setData pattern + function stabilization + dead code removal)
- **OnChainHistoricalRisk (third — multi-metric risk chart; good existing structure with memoized prepare/chartData + targeted updates; now stabilized helpers + React.memo)**

All three follow the same disciplined approach: `React.memo` at the root + `useCallback` for pure helpers/handlers to reduce churn from DataContext updates.

**Workbench (major multi-pass win delivered this session):**
- Tackled the most complex + interactive premium component.
- Pass 1: Direct-DOM tooltip + rAF (no React re-renders on mouse move) → enables true constant per-frame tooltip updates.
- Pass 2: Pre-computed `Map<time, value>` lookup per series (built once on add, O(1) reads in hot path).
  - Crosshair handler now does almost zero work even with 10+ long series (SP500 + macros etc.).
  - Combined with direct DOM, tooltip is now near-zero cost at 60 fps.
- Added `React.memo`.
- Result: Dramatically smoother chart feel + the exact "constant tooltip updates" behavior requested.

**All planned per-chart hardenings complete** (5 charts + deep Workbench work).

**Workbench mixed-frequency handling (important polish delivered):**
- Problem: Monthly/quarterly series (e.g. UMCSENT consumer sentiment) plotted against daily data (SP500, BTC, etc.) produced two bad effects:
  1. Tooltip showed "N/A" unless the cursor landed *exactly* on a release date.
  2. Visual "stretched with random variation" — long connecting lines between sparse points + moving averages on gappy data looked misleading.

- Analysis & chosen solution:
  - Root causes: Exact-time map lookups (lost LOCF), naive line connection on sparse points, and `calculateMovingAverage` applied without frequency awareness.
  - Fixes implemented:
    - Restored robust binary-search "previous value / LOCF" logic using stored original sparse points per series → tooltip now always shows the last known observation (even between monthly/quarterly release dates).
    - (An automatic "step rendering" transformation for low-frequency series was attempted to reduce visual stretching, but it created duplicate timestamps and caused "Failed to display X. The data may be incompatible." errors for series like Unemployment Rate and Consumer Sentiment. It has been removed.)
  - Additional fixes:
    - Completely rewrote the direct-DOM tooltip positioning (was using incorrect hardcoded sidebar offsets). It now uses the raw crosshair coordinates (relative to the chart container) + simple, reliable edge detection and small offsets. This fixes the "tooltip too far from cursor" problem, especially on wide/fullscreen views.
  - Trade-offs: We currently render low-frequency series with their native sparse points (connecting lines between releases). This is stable. A future improvement could add safer step rendering or visual markers on actual data points.

This makes the Workbench significantly more trustworthy when users mix daily financial data with macro releases.

Further Workbench opportunities remain (stabilize the very large series management effect, smarter MA behavior per frequency, proper step rendering for low-frequency series without breaking setData, etc.).

**Recent bug fix:**
- Derived series (e.g. "Consumer Sentiment / Fear & Greed") appearing as flat line until panned left:
  - Classic lightweight-charts gotcha: `fitContent()` called synchronously before the newly added series' data is fully recognized for range calculation.
  - Fixed by adding a `requestAnimationFrame` second `fitContent()` when `isNewSeries` is true. This reliably forces the chart to re-evaluate the full data range of all series (including newly computed derived ones).

Strong next candidate for high leverage: DataContext split (data vs actions) for app-wide re-render reduction.

Ready for the next phase or a different direction.
