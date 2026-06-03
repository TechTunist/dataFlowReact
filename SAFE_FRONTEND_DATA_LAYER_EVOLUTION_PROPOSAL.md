# Safe Frontend Data Layer Evolution Proposal

**Status:** Proposal for discussion and decision by owner  
**Date:** Current  
**Goal:** Significantly improve the professionalism, maintainability, and perceived quality of the frontend **without requiring any risky changes to the backend data pipeline or database in the near-to-medium term**.

This proposal is built directly on top of the SYSTEM_COUPLING_MAP.md and respects all the hard safety constraints documented in JOINT_PROFESSIONALIZATION_PLAN.md and BACKEND_DATA_PIPELINE_SAFETY_RUNBOOK.md.

---

## 1. Executive Summary

The current frontend has a **very tight, 1:1 coupling** between its data management layer (primarily `DataContext.js` + heavy usage in Workbench) and the backend’s highly granular API surface.

This is the single biggest source of:
- Code complexity and duplication
- Re-render problems
- Difficulty adding new features cleanly
- “This doesn’t feel like a professional, mature codebase” impression for a potential buyer or serious user

**Recommendation:** We perform a significant but safe evolution of the frontend data layer. This work can deliver most of the architectural and maintainability benefits **while treating the current backend API as a stable black box** for the foreseeable future.

We do **not** need to wait for backend improvements. We can make the frontend substantially better on its own.

---

## 2. Why This Is High Value Right Now

From the Coupling Map, the main problems are clear:

- `DataContext.js` (1726 lines) is essentially a big bag of individual state + fetch functions that mirror backend endpoints.
- The Workbench does sophisticated client-side joining, derivation, and moving-average logic on top of raw data because better abstractions don’t exist.
- Adding any new dataset or improving existing behavior usually means touching many of the same files and patterns.

For a potential buyer or for long-term maintainability, this is one of the most visible “this is still a side project” smells.

By cleaning this up properly, we can make the codebase feel much more professional **without touching the sacred backend data pipeline**.

---

## 3. Core Constraints for This Work

- Zero changes to backend models, migrations, or existing update scripts.
- The current granular API endpoints must continue to work exactly as they do today.
- All changes must be incremental and reviewable.
- We must maintain the ability to run the live production app at all times.

---

## 4. Proposed Target Architecture (Frontend Only)

### New Layer: `DataService` (or `DataAccessLayer`)

Instead of components and the Workbench talking directly to `DataContext` (or using raw context values), we introduce a thin, well-defined data access layer.

**Goals of this layer:**
- Hide the fact that the backend is currently very granular.
- Provide a more coherent, resource-oriented view of data to the rest of the app.
- Make it easy to later swap in better backend endpoints when we eventually decide it is safe to do so.
- Centralize caching, loading states, error handling, and derived data logic.

**High-level shape (to be refined):**

- `DataService` (or multiple focused services)
  - `getPriceSeries(asset: string)`
  - `getMacroSeries(seriesId: string)`
  - `getRiskMetrics(...)`
  - `getDerivedSeries(definition)` — handles the current client-side derivation logic cleanly
  - `getObservationsForSeries(seriesId)` — unifies the Series/observations system used by Workbench

- These services would still ultimately call the existing `apiUrl()` + `fetchWithCache` (or a small wrapper) under the hood for now.

- The refactored `DataContext` becomes much thinner — mostly responsible for:
  - Holding the raw cached data (or delegating to the service layer)
  - Exposing the new higher-level services/hooks
  - Managing global concerns (preload decisions, subscription status, etc.)

### Benefits

- DataContext stops being a 1700-line monster.
- Workbench becomes dramatically easier to reason about and extend (big win for perceived quality).
- Future backend improvements become much less painful to adopt.
- Clearer separation of concerns → easier for a future maintainer or buyer to understand.

---

## 5. Phased Implementation Plan (Safe & Reviewable)

### Phase 1: Preparation & Small Wins (Low risk)
- Create the initial `DataService` / hooks abstraction layer as a thin wrapper.
- Move a small number of low-risk, high-duplication areas (e.g. some of the altcoin price fetching logic) behind the new layer.
- Add good documentation and examples in the new layer.

### Phase 2: DataContext Refactor (Medium effort, high impact)
- Perform the long-planned DataContext split, but using the new service layer as the primary consumer.
- Keep the old individual `fetchXxxData` functions working during transition (for safety).
- Gradually migrate internal consumers.

### Phase 3: Workbench Modernization (Highest visible quality win)
- Refactor the Workbench to consume the new higher-level data services instead of raw context + manual derivation.
- Extract clear hooks: `useSeriesData`, `useDerivedSeries`, `useMovingAverage`, etc.
- This is where the biggest “this feels professional now” improvement will be felt.

### Phase 4: Polish & Future-Proofing
- Improve loading/error/empty state consistency using the new layer.
- Add better observability (e.g. “last updated” per logical series rather than per raw endpoint).
- Document the new data access patterns clearly for future owners.

---

## 6. Risk Assessment

- **Backend risk:** Extremely low (we are not proposing any backend changes).
- **Production stability risk:** Low — we can keep old paths working during the transition.
- **Regression risk:** Medium — any large refactor carries this. Mitigated by doing it in small, reviewable phases with good test coverage on critical paths (especially Workbench derivation logic).
- **Buyer perception risk:** Negative if we don’t do this. Positive and noticeable if we do it well.

---

## 7. Recommendation

I recommend we **start with Phase 1** (building the initial service layer abstraction) as the next concrete piece of work after you review this proposal.

This is the lowest-risk, highest-clarity first step. It gives us immediate architectural improvement while giving you visibility and control before we touch the big DataContext or Workbench refactors.

---

**Your decision needed:**

1. Does this overall direction and phased approach feel right to you?
2. Would you like me to expand any section (especially the proposed shape of the `DataService` layer) before we begin?
3. If yes to the direction, shall I start drafting the initial `DataService` structure + migration strategy as the first implementation proposal?

I’m ready to take the lead on the next piece as soon as you give the green light. We will move at whatever pace and with whatever level of review you want.