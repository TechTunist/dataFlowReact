# Automating Optimization of DCA Buy & Sell Strategies

**Exploring feasible approaches to find the "King" of Dynamic Dollar-Cost-Averaging (in + out) within the existing Dynamic DCA Simulator**

> **Important**: This document contains **no code**. It is a pure design-thinking and problem-analysis exercise based on the current architecture, UI patterns, data model, and client-side constraints of the application (as of the latest iterations).

---

## Executive Summary

Yes — it is possible to add a **clickable "Auto-Optimize"** capability that searches for strong buy/sell tier configurations (and related parameters) for each available indicator/strategy (Risk Metric, Tx Tension, and now Market Heat Index), then surfaces a clear "King of DCA" comparison.

The naive "try every permutation" approach is impractical due to combinatorial explosion and browser performance limits. However, several **much smarter, domain-appropriate techniques** fit naturally inside the existing constraints:

- The backtester is already a fast, pure, in-memory function over pre-loaded time series.
- We already maintain per-strategy state (`resultsByStrategy`, separate tier sets, heat weights loaded from user settings).
- The UI already supports live tier editing, strategy switching that restores previous chart state, and multi-series portfolio visualization (invested vs portfolio value vs lump-sum baseline).

A well-designed optimizer can **seed from the user's current manual configuration**, run a modest number of smart trials (hundreds, not millions), keep the UI responsive, and deliver comparable results across the three strategies so the user can crown a winner for their chosen objective (raw ROI, risk-adjusted return, etc.).

---

## Problem Statement

### What We Want to Optimize
For each strategy/indicator we want to discover good values for:

- **Buy side**: number of tiers (1–4), trigger levels, multipliers (or "boost amounts")
- **Sell side**: number of tiers, trigger levels, sell percentages
- **Global behavior**: `buyStrategy` mode (`periodic-boost` vs `trigger-only`), `frequency`, possibly `startDate` (or evaluation window)
- **Heat-specific**: the seven weight sliders (fg, mvrv, mayer, risk, pi, alt, txmvrv) — because the user already tunes these in the dedicated Market Heat Index view and we want to respect the saved configuration

### Success Criteria
- A one-click (or "configure then click") experience.
- After optimization, the user can:
  - See the best discovered config for **Risk**, **Tx-Tension**, and **Heat**.
  - Compare them on multiple dimensions (final ROI, net P/L, max drawdown implied by the equity curve, number of trades, etc.).
  - "Crown" a king according to a user-chosen primary metric.
  - Load any winning config back into the live sliders for further manual refinement.
  - Visualize the optimized equity curves (invested, portfolio value, lump-sum baseline) side-by-side or overlaid.

### Why This Is Non-Trivial
- The search space is **high-dimensional and mixed** (continuous-ish levels + discrete multipliers/percentages + variable cardinality of the tier lists + categorical mode).
- Each evaluation is a full historical backtest (stateful position tracking with frequency cooldowns).
- Everything runs in the browser on the user's device.

---

## Application Constraints (What We Must Respect)

| Constraint | Implication |
|------------|-------------|
| **Pure client-side JavaScript** (React + no assumed heavy ML libs) | Search must be lightweight. We cannot ship TensorFlow.js or call external solvers. |
| **In-memory time series** (loaded via DataContext: btc, mvrv, fear&greed, tx-mvrv-ratio, alt season, etc.) | We have fast random access to the full indicator + price history once fetched. No network round-trips inside the inner loop. |
| **Existing backtest engine** | Already produces `roi`, `totalPortfolio`, `portfolioSeries` (for the nice chart), transaction log, static-DCA and lump-sum benchmarks. We can treat a single backtest as a cheap black-box function. |
| **Per-strategy state already exists** (`resultsByStrategy`, separate `xxxBuyTiers`/`xxxSellTiers` objects, heat weights loaded from `/api/user-settings`) | Huge advantage — optimizer results can live in the same shape and be restored when the user clicks strategy chips. |
| **UI must stay responsive** (especially on mobile portrait) | Long-running search must not freeze the main thread. Progress feedback, ability to cancel, and live "best-so-far" updates are required. |
| **Heat Index weights are user-specific and persisted server-side** | For the Heat strategy we have a moral (and UX) obligation to start the search from (or at least respect) whatever the user has tuned in the dedicated `/market-heat-index` page. |
| **No transaction costs / slippage modeled** (explicitly noted in current UI) | Any optimizer must surface the same caveat so users don't over-optimize for a frictionless world. |
| **Variable history length** depending on `startDate` | Longer windows = more realistic but slower evaluations. Search budget should be expressed in "number of evaluations" rather than wall time. |

These constraints actually **favor** certain techniques and rule others out.

---

## Why Brute Force Fails

Suppose we allow:
- Up to 3 buy tiers
- 5 discrete choices per level
- 4 choices per multiplier
- Symmetric for sells
- 2 choices for buy mode
- 4 choices for frequency

Even with heavy pruning this quickly reaches **tens or hundreds of thousands** of combinations. On a 4000-day history a single backtest might take 1–5 ms in optimized JS. 100 k evaluations = 100–500 seconds. Unacceptable on a phone, and still painful on desktop.

We need **orders-of-magnitude** reduction in evaluations while still exploring the space intelligently.

---

## Smarter Approaches That Fit the App

### 1. Heuristic + Local Search (Best "Bang for Buck")
**Core idea**: Do not search from scratch. Start from the configuration the user already has on screen (or from sensible quantiles of the indicator series).

1. Compute a few "smart seeds":
   - Current user tiers (if any)
   - Historical percentiles of the indicator (e.g., 10th/25th for buys, 75th/90th for sells)
   - A couple of "classic" presets (e.g., the defaults you already ship)
2. From each seed, run a cheap **local search / hill-climb**:
   - Perturb one parameter at a time (nudge a level up/down by one step, increase a multiplier by 0.25, flip buy mode, etc.).
   - Accept the move if the objective improves (or with a small probability for exploration).
3. Also try a tiny number of fully random restarts (10–30) to escape bad local basins.

**Why it works here**:
- The user's current sliders are already a strong prior.
- The indicator series is smooth-ish; small changes in thresholds usually produce smooth changes in outcome.
- Number of evaluations stays in the low hundreds even for "Deep" mode.

### 2. Evolutionary / Genetic Search (Excellent for Variable Tier Count)
Tiers are naturally a **list** (variable length "genome").

- Represent a candidate as: `{buyTiers: [{level, multiplier}, ...], sellTiers: [...], frequency, buyStrategy, ...}`
- Fitness = the objective (ROI, ROI / max-drawdown-proxy from the equity curve, etc.)
- Operations:
  - **Crossover**: take buy tiers from parent A, sell tiers from parent B.
  - **Mutation**: nudge a level, change a multiplier, add or remove a tier (with probability), flip buy mode.
- Small population (15–30) × 8–15 generations is usually enough.

This naturally handles "how many tiers is optimal?" without forcing the user to decide in advance.

### 3. Random / Low-Discrepancy Sampling + Refinement
- Use a cheap pseudo-random or Latin-Hypercube sampler to generate 100–300 candidates within reasonable bounds.
- Evaluate all of them.
- Take the top 5–10 and run the local hill-climb from each (cheap because local moves are fast).

This is trivial to implement, embarrassingly parallel in theory, and gives surprisingly good results for the computational budget.

### 4. Special Structure We Can Exploit
- **Decouple buy and sell somewhat**: for a fixed indicator series, the buy decisions and sell decisions are only coupled through the position size. We can still optimize them jointly, but we can evaluate "buy-only" variants quickly.
- **Quantile-based initialization**: instead of treating levels as free numbers, sample them as percentiles of the actual indicator values seen in the chosen window. This automatically respects the data distribution and avoids impossible thresholds (e.g., a buy level of 0.99 on a risk metric that rarely goes above 0.8).
- **Early stopping / pruning**: if after the first 30% of the window a candidate is already far behind the current best (in realized P/L or drawdown), abort the rest of the simulation.
- **Walk-forward / regime robustness**: after finding a candidate on the full window, re-evaluate it on a few different sub-periods (2011–2017, 2017–2021, 2021–today, etc.) and penalize configs that only win in one regime.

### 5. Handling the Heat Weights
For the Heat strategy we have an extra 7-dimensional continuous space (the weights).

Options (in increasing sophistication):
- Fix the weights to whatever the user has currently loaded (or the last saved version) and only optimize the DCA tiers on top of that fixed heat view. (Simplest and most faithful to "use my saved config".)
- Joint search: treat the seven weights as additional mutable genes. This can discover "DCA-optimized" weightings that the manual heat page might never surface.
- Two-phase: first do a cheap search over weight space using a very fast proxy objective, then fix the best weights and do a normal tier search.

Because the heat page already auto-saves, we can always start the Heat optimizer from the live user weights — a huge head start.

---

## Proposed High-Level User Experience (No Code)

1. **Entry Point**
   - A new prominent (but not overwhelming) button or section titled **"Auto-Optimize Strategies"** or **"Find the King of DCA"** near the existing Run button or in a "Power Tools" area.
   - Clicking it opens a small, friendly configuration panel (or a drawer).

2. **Configuration Panel (kept simple by default)**
   - Objective: dropdown — "Highest ROI", "Best risk-adjusted (ROI / worst drawdown)", "Highest final portfolio value", "Fewest trades for given ROI", etc.
   - Search intensity: **Fast** (≈ 80–150 evaluations), **Balanced** (≈ 300), **Deep** (≈ 800+). Show estimated time.
   - Which strategies: checkboxes for Risk / Tx-Tension / Heat (default = all three).
   - Advanced (collapsed): "Inherit search bounds from my current tiers", "Max tiers per side", "Respect my current Heat weights (recommended)".
   - Big "Start Optimization" button.

3. **During Search**
   - Non-blocking progress UI (a linear progress + "Evaluating 142 / 300 — best ROI so far: +187% (Risk)").
   - Live updating "Current Leaders" mini-cards that show the best config found so far for each strategy (tiny ROI number + trade count).
   - Prominent "Cancel" that gracefully stops and keeps the best results found up to that point.

4. **Results View — "The Arena"**
   - Three (or fewer) cards side-by-side or in a nice grid: one per strategy.
   - Each card shows:
     - The winning objective value
     - Key secondary metrics (implied max drawdown from the equity curve, trade count, final BTC held, etc.)
     - The discovered tier configuration (human-readable list)
     - Buttons: **Load into editor**, **Visualize on main chart**, **Compare equity curves**
   - A "King" banner on the overall winner (with a small note "according to your chosen objective — click to change objective").
   - A small "Robustness" row: how the winner performed on different sub-periods.
   - "Re-run exact backtest with these params" (guarantees the portfolioSeries matches what the user will see when they load the config).

5. **Post-Optimization Workflow**
   - User can load any winner's tiers + mode + frequency into the live controls.
   - Because we already have `resultsByStrategy` caching, switching strategies instantly restores the optimized visualization (including the grey lump-sum line).
   - User can then manually nudge a level or multiplier and immediately see the delta — the optimizer is a great starting point, not the final answer.

---

## Method Comparison Table

| Approach                  | Approx. Evaluations Needed | Handles Variable # Tiers? | Respects User Heat Weights? | UI Feedback Quality | Risk of Overfitting | Implementation Complexity (client) | Overall Fit |
|---------------------------|----------------------------|---------------------------|-----------------------------|---------------------|---------------------|------------------------------------|-------------|
| Full permutation          | 10k–1M+                   | Yes (if limited)         | Yes                        | Poor (too slow)    | High               | Low                               | Terrible   |
| Pure random sampling      | 200–1000                  | Yes                      | Yes                        | Good               | Medium             | Very Low                          | Good       |
| Heuristic seeds + local hill-climb | 100–400              | Limited                  | Excellent                  | Excellent          | Medium             | Low                               | **Excellent** |
| Small-population GA / Evolutionary | 300–800               | Excellent                | Excellent                  | Very Good          | Medium             | Medium                            | **Excellent** |
| Bayesian Optimization     | 50–150 (but needs lib)    | Possible                 | Yes                        | Excellent          | Lower              | High (new dep + complexity)       | Poor fit   |
| Two-phase (weights first, then tiers) | 150–400             | Yes                      | Built-in                   | Excellent          | Medium             | Medium                            | Very Good  |

**Recommended primary approach**: Heuristic seeds (current config + indicator quantiles + a few presets) + local hill-climb, optionally wrapped in a light evolutionary layer for the tier cardinality question. This gives 80–90% of the value of a deep search at 10–20% of the cost.

---

## Risks & Mitigations (Must Be Visible in UI)

- **Overfitting to a single historical regime** — Mitigation: show walk-forward or sub-period performance; default objective should be somewhat risk-aware (e.g., ROI / max-drawdown proxy).
- **"It worked in backtest but..."** — Keep the existing disclaimer language prominent. Maybe add "This is a historical search, not a prediction."
- **Long runtimes on mobile / old devices** — Hard cap the budget, show realistic time estimates, allow background tab (or warn).
- **Heat weights changing under the user** — If the user tunes the heat page while the optimizer is open, we should either snapshot the weights at the start of optimization or re-load them with a clear "using weights from YYYY-MM-DD HH:mm".
- **Combinatorial explosion still possible** — The UI must enforce reasonable bounds ("max 4 tiers per side", "multiplier 1.0–4.0", etc.).

---

## Nice-to-Have Power-User Features (Phase 2)

- "Optimize only buys" or "only sells" (fix one side, search the other).
- Multi-objective Pareto view (show the trade-off curve between ROI and trade frequency).
- "Robust King": the config that wins (or comes close) across the largest number of different objective functions or time windows.
- One-click "Apply King to live editor + re-simulate" that also updates the main chart with the exact equity curves.
- Export the winning parameter set as JSON (for reproducibility or future "what-if" pages).

---

## Conclusion & Recommendation

**Yes, this is a high-value, natural extension** of the existing Dynamic DCA Simulator.

The dumb brute-force approach is a non-starter. However, the application already has almost all the ingredients for a **smart, user-respecting optimizer**:

- Fast, pure backtester
- Strategy-specific tier state + result caching
- Live indicator series for three different views (Risk, Tx-Tension, user-tuned Heat)
- Heat weights that are already persisted per user

A combination of **heuristic initialization + local search (with optional light evolutionary search)** can deliver excellent configurations in a few hundred evaluations — fast enough for a browser, meaningful enough to crown a "King of DCA" across the three indicators, and respectful of the user's existing manual tuning work (especially for the Heat strategy).

The output should feel like a **powerful assistant** rather than a black-box oracle: the user stays in control, can load/inspect/compare any result, and the visualization tools they already love (the equity curve with lump-sum baseline, the trade log, the per-strategy switching) become even more powerful.

This feature would turn the simulator from "a great manual experimentation tool" into "the place where you discover and then refine the best DCA in/out strategy for the current market regime."

---

*Document created for design discussion only. No implementation code was written or suggested.*