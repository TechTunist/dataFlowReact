# Cryptological — Status (living)

**Updated:** 2026-07-12  
**Purpose:** Single short tracker for “what’s done / what’s next.” Prefer this over archived plans under `docs/archive/`.

## Living docs (read these)

| Doc | Use |
|-----|-----|
| [`MASTER_GUIDE.md`](MASTER_GUIDE.md) | Product + how to run / extend the stack |
| [`dataFlowReact/README.md`](dataFlowReact/README.md) | Frontend architecture map |
| [`dataFlowReact/BACKEND_DATA_PIPELINE_SAFETY_RUNBOOK.md`](dataFlowReact/BACKEND_DATA_PIPELINE_SAFETY_RUNBOOK.md) | Never risk historical data / pipelines |
| [`SaaS/HANDOFF.md`](SaaS/HANDOFF.md) | Deploy, env, Stripe resume notes |
| [`SaaS/readme.md`](SaaS/readme.md) | Cron / data pipeline ops |

Archived roadmaps, sprint notes, and session handoffs: [`docs/archive/`](docs/archive/README.md).

## Professionalization — done (high level)

- **DataService** is the home for formatters, series getters, onchain/pagination loaders, btc-yield-recession join, `ensureSeriesLoaded`.
- **DataContext** still owns React cache state + preload + IndexedDB `fetchWithCache`, but fetch bodies largely **delegate** to DataService.
- **Stable actions** + `useDataActions()` so fetch identity churn does not thrash all consumers; `useData()` remains backward compatible.
- **Workbench** hooks extract series data/management/tooltip/MA/derived; loads route through `ensureSeriesLoaded`.
- Caching, integrity checks, logger, error boundaries, bulletproofing batch (Stripe E2E, email dedup paths, sub labels, free charts UI, current price util).
- Unit tests for DataService transforms, risk utils, subscription access, etc.
- Vite available in parallel (`dev:vite` / `build:vite`); **default build remains CRA**.

## Not done / next (priority order)

1. ~~**Workbench thin-out**~~ — done: `WorkbenchView` + `useWorkbenchPersistence`.
2. ~~**Consistent chart data access**~~ — **done 2026-07-12**: almost all charts use `useChartData` / `useChartDataActions` (`hooks/useChartData.js`). Guide: `dataFlowReact/docs/DATA_LAYER.md`. Workbench/macro overlay keep full `useData()` bag for load routing.
3. **CI** — lint + `npm test` + `npm run build` on PRs (optional).
4. **Vite** — deferred (previous attempt had high cost); stay on CRA until explicitly revisited.
5. **Backend** — additive only; no model unification without parallel path.
6. **Optional later** — per-series React contexts (max re-render isolation); further Workbench series-sync extract.

## Explicit non-goals (for now)

- Big-bang delete of DataContext  
- Risk 3+ backend model/migration rewrites  
- Full TypeScript migration  
- Multiple overlapping roadmap `.md` files (use this file + archive)

## Repos / branches

- Frontend: `dataFlowReact/`  
- Backend: `SaaS/`  
- Active product work has included growth/promo branches; data-layer professionalization lives in tree regardless of branch name — trust **code** over old archive dates.
