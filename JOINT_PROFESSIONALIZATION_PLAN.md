# Cryptological — Joint Frontend + Backend Professionalization Plan (Safety-First)

**Status:** Living Document  
**Date:** Current  
**Core Constraint:** The production application at cryptological.app is live. We will make **zero changes** that risk data loss, broken data pipelines, or downtime for users.

## Guiding Principles (Non-Negotiable)

1. **Production Safety First** — Nothing we do can risk the live database or daily data updates.
2. **Zero Data Loss** — All changes must be reversible or run in parallel with existing systems.
3. **Respect Real Constraints** — Vercel 10-second function timeouts, external API rate limits, and the historical need to run heavy backfills locally are facts, not problems to be ignored.
4. **Incremental & Reviewable** — Every change must be small enough to understand, test, and roll back.
5. **Harmonious Evolution** — Frontend and backend changes must be designed together so they reinforce each other rather than fight each other.

---

## Current Reality (Honest Assessment)

### Backend Characteristics (Critical Constraints)

- **Data Model**: Highly repetitive per-asset models (`XXXDaily` + `XXXDailyMeta` for dozens of assets). This pattern exists because it was the simplest way to ingest from many different sources quickly.
- **Data Pipeline**: 100+ individual management commands. This architecture was deliberately chosen so each script finishes well under Vercel's 10-second serverless timeout.
- **Orchestration**: GitHub Actions (triggered by Vercel cron at `2 0 * * *`) runs scripts in batches via `update_all.py --batch N`.
- **Heavy Operations**: Large backfills were (and often still need to be) run locally against the production database because deployed scripts time out.
- **API Design**: Extremely granular endpoints (one per dataset the frontend wants). This directly caused the "giant DataContext" on the frontend.
- **Auth**: Clerk + custom JWT verification + Svix webhooks (some legacy duplication exists).

### Frontend Characteristics

- `DataContext.js` (~1726 lines) is a direct mirror of the backend's fragmented API surface.
- The Workbench does significant client-side data joining and derivation because convenient aggregated endpoints don't exist.
- We have already made excellent progress on caching, error boundaries, and chart performance.

---

## Risk Assessment Framework

Any proposed change will be classified by risk level:

- **Risk Level 0 (Safe)**: Documentation, new non-breaking endpoints, new management commands that don't touch existing data, frontend-only changes that use current APIs.
- **Risk Level 1 (Low)**: Adding new optional fields, new read-only endpoints, new derived data tables (with separate ingestion).
- **Risk Level 2 (Medium)**: Refactoring existing management commands, introducing new model abstractions (must be additive at first).
- **Risk Level 3 (High)**: Any change to existing models, migrations that alter columns/indexes, changes to the core update orchestration.
- **Risk Level 4 (Forbidden for now)**: Anything that could lose or corrupt historical data, break the daily update pipeline, or require coordinated downtime.

**Rule**: We will not touch Risk Level 3+ items until we have:
- Complete local reproduction of the data pipeline.
- Clear rollback plan.
- Parallel "new path" running alongside the old one for validation.

---

## Proposed Phased Approach (Extremely Conservative)

### Phase 0: Joint Understanding & Safety Infrastructure (Current)

**Goals:**
- Both of us have a shared, accurate mental model of the entire system.
- We establish tools and processes that make future work much safer.

**Work:**
- [ ] Complete joint architecture document (this file + expanded version).
- [ ] Document exact data flow from external APIs → GitHub Actions → database → API → frontend.
- [ ] Create a "Data Pipeline Runbook" (how to safely run updates locally, how to inspect what ran, etc.).
- [ ] Inventory all places where the frontend and backend are coupled (especially DataContext ↔ API endpoints).
- [ ] Agree on communication protocol for any proposed changes (always start with a written proposal + risk assessment).

### Phase 1: Parallel "Better" Paths (Additive Only)

Instead of modifying existing fragile systems, we create new, cleaner versions alongside them.

**Frontend Examples:**
- New generic data fetching layer in the frontend that can consume both old granular endpoints *and* future better endpoints.
- DataContext split that hides the current mess behind a cleaner interface.

**Backend Examples:**
- New, more generic time-series read models or materialized views (without touching existing tables).
- A new "Series" abstraction (you already have some of this in models) that can gradually become the source of truth for new features.
- New management command patterns that wrap the old scripts with better logging/observability.

**Key Rule**: The old pipeline and old API endpoints must continue to work exactly as they do today for as long as needed.

### Phase 2: Gradual Migration (When Safe)

Only after we have:
- Proven the new patterns in production (via parallel paths).
- Full local reproduction capability.
- Clear data validation between old and new paths.

Then we can slowly switch consumers over (frontend first on read paths, later on write paths).

### Phase 3: Cleanup (Last)

Only when nothing is using the old patterns anymore.

---

## Specific Recommendations for DataContext Refactor (Given Backend Reality)

Because of the extreme caution required on the backend, here is how I recommend we approach the frontend DataContext work:

1. **Do the split, but treat the current API surface as immutable for now.**
   - Create a clean internal data service layer.
   - The new layer can initially just call the existing granular endpoints.
   - This gives us huge maintainability wins on the frontend immediately.

2. **Design the new frontend data layer with future backend improvements in mind.**
   - Make it easy to swap in better endpoints later (e.g., a generic `/api/series/{id}/data/` endpoint) without touching most of the app.

3. **Use the Workbench as a proving ground.**
   - The Workbench already does the most sophisticated client-side data joining. We can improve it in ways that also validate patterns we might want to move server-side later.

4. **Never propose backend model or migration changes as part of the "DataContext project."**
   - Those conversations should be completely separate and held to much higher safety standards.

---

## Immediate Next Actions (What We Should Do Right Now)

1. **Create the living joint plan document** (this one) and keep it updated.
2. **Produce a "Current System Coupling Map"** — a clear document showing exactly which frontend pieces call which backend endpoints/models.
3. **Write a "Safe Local Development & Data Pipeline Runbook"** for the backend (how to safely run updates locally against a copy or with safeguards).
4. Begin the **DataContext split design** (frontend-only for now), explicitly documenting which future backend improvements would give the biggest further wins.

---

**Questions for you before we execute the next pieces:**

- How much of the backend code are you comfortable letting me propose specific refactors for (even if we never touch Risk Level 3+ items without extreme caution)?
- Would you like me to first create the "Current System Coupling Map" document?
- Are there any specific parts of the backend (e.g., a particular group of management commands, the webhook handling, the risk metric precomputation, etc.) that you consider especially sacred or fragile?

I'm ready to start producing documents and analysis immediately. We will move as slowly and carefully as you need.