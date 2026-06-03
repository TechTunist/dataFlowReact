# Cryptological — Quality & Professionalization Roadmap

**Date:** Current  
**Goal:** Transform the application into one of the most professional, maintainable, and best-in-class codebases/products in the crypto data visualization niche — maximizing its value for either user growth or acquisition.

**Context:**
- Zero users / zero revenue currently.
- User owns cryptological.app + has full time available.
- Frontend (this repo) + Backend will be sold together.
- Significant previous work done on performance, caching, error handling, and Workbench stability.

---

## Guiding Principles (New Direction)

1. **Professionalism over quick wins** — Every change should make the product feel premium and the code obviously maintainable by a third party.
2. **Buyer / Maintainer Empathy** — Assume the next person to touch this code has never seen it before.
3. **Focus on High-Signal Areas** — Prioritize the Data Layer, Workbench (the most unique feature), and overall architecture.
4. **Visible + Invisible Quality** — Balance deep refactors with user-facing polish that makes the app feel "best in class".
5. **Incremental but Strategic** — We can be more ambitious because time is available, but we still ship in focused, reviewable increments.

---

## Current State Assessment (as of now)

### Major Strengths
- Rich feature set (especially the Workbench).
- Good recent improvements in caching, error boundaries, logging, and chart performance.
- Subscription infrastructure already exists.
- Domain + branding in place.

### Major Quality / Professionalism Gaps

| Area | Current State | Impact on "Best in Class" / Saleability | Priority |
|------|---------------|-----------------------------------------|----------|
| **DataContext** | 1726 lines, one giant context with 100+ items | High re-render risk, very hard for new dev to understand | **Critical** |
| **Workbench** | 1621 lines, massive useEffect managing everything | Extremely difficult to maintain or extend | **Critical** |
| **Build Tooling** | Still on Create React App | Dated, slower builds, worse DX | High |
| **Type Safety** | Pure JavaScript | Higher bug risk, less professional signal | High |
| **Component Architecture** | Many large, similar chart components with duplication | Hard to maintain consistency | High |
| **Testing** | Almost non-existent | Major risk signal for any buyer | High |
| **Bundle Size** | Heavy (Plotly + multiple chart libs) | Slow initial load hurts first impression | Medium-High |
| **Documentation** | Good README for architecture, but limited inline docs | Harder for future owner | Medium |
| **Product Polish** | Good charts, but inconsistent loading/empty/error states, Workbench UX can still feel rough | Hurts "premium" perception | Medium |

---

## Proposed Phased Roadmap

### Phase 1: Architectural Foundations (Highest Leverage)
Goal: Make the hardest parts obviously maintainable.

1. **DataContext Split** (Biggest win)
   - Separate Data State from Actions (fetch/refresh functions).
   - Consider lightweight selector pattern or multiple smaller contexts.
   - Massive improvement in re-render behavior and understandability.

2. **Workbench Decomposition**
   - Extract custom hooks (`useSeriesData`, `useChartInstance`, `useTooltip`, etc.).
   - Better separation of concerns (data fetching vs rendering vs interaction).
   - Make adding new series types much cleaner.

3. **Establish Clear Patterns**
   - Document "How we build charts" and "How we handle data fetching".
   - Create shared chart primitives where it makes sense.

### Phase 2: Modern Foundation
- Migrate from Create React App → **Vite** (huge DX and professionalism upgrade).
- Introduce **TypeScript** incrementally (start with new files + critical modules).
- Upgrade dependency management and build scripts.

### Phase 3: Product & DX Excellence
- Build a small internal design system / chart component library.
- Systematically improve loading, empty, and error states across the app.
- Significantly improve Workbench UX (better series management, saving presets, sharing, etc.).
- Add meaningful test coverage for critical paths (especially Workbench logic and data transformations).

### Phase 4: Sale / Growth Readiness
- Final bundle optimization pass.
- High-quality demo video + sales materials.
- Internal documentation for a future owner ("How to add a new chart", "How the subscription system works", etc.).
- Optional: Add basic analytics/events so a buyer can see usage patterns.

---

## Prioritization Logic (for this goal)

We should generally follow this order:

1. Things that make the code **dramatically easier** for someone else to take over (DataContext, Workbench, architecture).
2. Things that make the product feel **premium and reliable** (states, performance, consistency).
3. Things that are **visible quality signals** to a buyer (modern stack, TypeScript, tests, documentation).
4. Pure optimization (unless it has big user experience impact).

---

## Immediate Next Steps (Recommendation)

Given the new goal, I recommend we:

1. **Create a living Quality Roadmap** (this document) and keep it updated.
2. **Start with the DataContext split** — this is the single highest-leverage change for both performance and maintainability.
3. While doing that, begin planning the Workbench decomposition in parallel (they are related).
4. Decide together whether we also want to do the Vite migration relatively early (it's a big but high-signal change).

---

**Questions for you before we begin execution:**

- How aggressive do you want to be on the tech stack modernization (Vite + TypeScript)?
- Are you open to bigger refactors even if they take several sessions?
- Do you want us to also create a parallel "Backend Quality Notes" document (since you're selling both)?

Once you confirm direction, I'll start the first concrete work (most likely the DataContext analysis + split plan).