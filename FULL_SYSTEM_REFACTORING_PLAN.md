# Cryptological — Full System (Frontend + Backend) Professionalization & Refactoring Plan

**Date:** Current  
**Objective:** Make the entire Cryptological platform (frontend + backend) the most professional, maintainable, and best-in-class codebase/product possible in its niche, to maximize chances of user growth or a credible acquisition.

**Core Principle:** Any significant frontend change (especially around data fetching and state management) must be planned in harmony with the backend. We will not create technical debt in one while cleaning the other.

---

## 1. Backend Architecture Overview (Deep Dive Summary)

### 1.1 Data Model Philosophy
The backend uses a **highly normalized but very wide** model:

- For price history: Almost every asset has its own pair of models (`XXXDailyMeta` + `XXXDaily`).
- Specialized models for on-chain (`BitcoinMetric`, `BitcoinAddressMetrics`), risk metrics (`RiskMetric`), MVRV, dominance, macro series, etc.
- Many models have similar structures (date + value fields).

**Strengths:** Flexible for ingesting from many different sources.
**Weaknesses:** Extremely repetitive. Adding a new asset or metric requires new models, migrations, serializers, and views. This directly drives the "giant DataContext" problem on the frontend.

### 1.2 Data Ingestion Layer
- Extremely heavy use of Django management commands (100+ scripts in `management/commands/`).
- Mix of backfill scripts and daily update scripts.
- Orchestrated via GitHub Actions + Vercel Cron (workaround for midnight congestion).
- Many ad-hoc scripts with duplicated logic (normalization, error handling, API clients).

This is one of the most important areas for professionalization.

### 1.3 API Layer
- Very granular, endpoint-per-dataset design:
  - `/api/mvrv/`, `/api/btc/data`, `/api/fear-and-greed/`, `/api/dominance/`, dozens of `/api/xxx/price/` endpoints, etc.
  - Some use DRF ViewSets (onchain-metrics, series).
  - Many are function-based views in `api.py`.

This 1:1 mapping with frontend state is the main coupling point with `DataContext.js`.

### 1.4 Authentication & Business Logic
- Clerk for auth (JWT verification in views + webhooks).
- Custom `UserSubscription` model + Stripe integration.
- Two versions of Clerk webhooks exist (legacy + secure with Svix).
- Subscription gating is enforced on the frontend (via `restrictToPaidSubscription`), with backend providing status.

### 1.5 Key Observations & Risks
- The backend is essentially a **large data warehouse + thin API layer**.
- Data pipeline is powerful but fragile and hard to maintain (many similar scripts).
- Tight coupling between data shape in DB → API response → frontend individual state variables.
- Good use of Neon + connection pooling, but hard quotas are manually managed.

---

## 2. Major Coupling Points with Frontend DataContext

The current `DataContext.js` (1726 lines) directly mirrors the backend's fragmented API:

- One `useState` + one `fetchXxxData` + one `refreshXxxData` per major endpoint.
- Many datasets are demand-loaded (good), but the pattern of "one function per dataset" is repeated everywhere.
- `computeDerivedData` in the frontend does client-side joins/LOCF because the backend doesn't provide convenient derived or joined endpoints for many cases.

Any serious DataContext refactor on the frontend should be coordinated with backend API improvements.

---

## 3. Recommended Joint Refactoring Strategy

### Phase 1: Data Access Layer Unification (Highest Priority)

**Backend goals:**
- Introduce a more generic time-series abstraction (or at minimum, consistent serializer patterns).
- Create a small number of higher-level "smart" endpoints that the frontend can consume (e.g. `/api/series/{id}/data/`, a generic observation query, or better support for derived calculations).
- Reduce the number of near-identical price endpoints.

**Frontend goals (in response):**
- Collapse many individual `fetchXxxData` functions into a more generic data fetching layer.
- Use the new backend capabilities to simplify `DataContext`.

### Phase 2: Data Pipeline Professionalization (Backend-heavy)

- Standardize the management commands (base classes, better logging, common utilities for normalization/error handling/API clients).
- Improve observability of the daily update process.
- Consider moving some orchestration logic out of shell scripts into proper management commands or a small scheduler.

### Phase 3: State Management & Architecture (Frontend-heavy, informed by backend)

- Proper split of DataContext (data vs actions).
- Better handling of derived/computed data (ideally moving more of `computeDerivedData` logic server-side over time, or at least making the contract cleaner).
- Consistent patterns for loading, caching, and error states that match backend capabilities.

### Phase 4: Modernization & DX

- Frontend: Vite + TypeScript (incremental).
- Backend: Evaluate Django best practices cleanup (if any obvious ones remain).
- Shared: Better API contracts / OpenAPI spec between front and back.

---

## 4. Proposed Immediate Next Steps

1. **Joint Architecture Review Document** (this file + expanded version)
2. **Deep analysis of the current DataContext** → propose specific split design that anticipates future backend improvements.
3. **Identify 3-5 highest-ROI backend API consolidations** that would give the biggest relief to the frontend.
4. Decide on migration strategy (can we do DataContext split *before* backend API changes, using the existing granular endpoints as a compatibility layer?).

---

**Questions for alignment before we start coding:**

- How much backend work are you comfortable doing yourself vs. wanting guidance only?
- Are you open to some breaking API changes on the backend if they significantly simplify the frontend long-term?
- Do you want us to create a "Backend Professionalization Roadmap" document in parallel to the frontend one?

Once we align on the above, I recommend we start with a detailed proposal for the **DataContext split**, explicitly calling out which parts would benefit most from future backend support.

Ready when you are.