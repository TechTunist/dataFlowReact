# Project Phases

### NOTES
- add logging information for command scripts for time taken, success or not
    and any other useful info for making the automation as hardened as possible when the scripts are run through cronjobs

## REMINDERS / FUTURE QUICK WINS (to tackle later)

### FRED API Macro Series Additions (Easy, High-Value for Macro/Crypto Users)
These are generic FRED series that can be added with almost zero backend work (the `/api/series/{id}/` proxy already supports any public series). Just frontend config + optional dedicated route.

**Top recommended quick wins:**
- **WALCL** — Fed Balance Sheet Total Assets (weekly). Extremely high relevance for liquidity cycles and BTC. (We have a custom fed-balance endpoint; adding the clean FRED version gives users the raw series + Workbench access.)
- **PCEPILFE** — Core PCE Price Index (the Fed's preferred inflation measure). Complements existing CPIAUCSL.
- **CPILFESL** — Core CPI (All Items Less Food and Energy). Policy-relevant companion to headline CPI.
- **MORTGAGE30US** — 30-Year Fixed Mortgage Rate (weekly, very practical/real-world signal).
- **DTWEXBGS** — Trade Weighted U.S. Dollar Index: Broad (better "dollar strength" signal than the individual DEX pairs).

Other strong candidates: ICSA (Initial Claims), JTSJOL (JOLTS Job Openings), INDPRO (Industrial Production), CIVPART (Labor Force Participation), credit spreads (e.g. BofA ICE series).

**How to add later:**
1. Add entry to `src/components/workbench/availableSeries.js` (makes it instantly usable in Workbench).
2. Add good explanation text to `src/config/macroSeriesExplanations.js`.
3. (Optional but nice) Add a dedicated `/fred/xxx` route in `App.js` using `FredSeriesChart`.
4. Minor: update `chartPageMeta.js` titles + formatter in `macroChartUtils.js`.

These would be genuine "why didn't we have this?" value adds for the macro audience.

---

## OLD CONTENT (historical)

## PHASE ONE

### FUNCTIONALITY

- ~~Tooltips~~
- Improve styling [ongoing]
- Increase interactivity of charts (buttons) [ongoing]
    - Create a "bleed factor" for altcoins when comparing their performance against bitcoin over time
- Increase the number of altcoins available
- Add other financial information than crypto (inflation, interests, liquidity, monetary policy etc)
- add historical dominance data from kaggle

## TOOLS
- The "Bleed Factor" can be constructed by integrating the above metrics into a formula. Here’s a simple version to start with:

    Bleed Factor=w1⋅RP+w2⋅DT+w3⋅V+w4⋅DD+w5⋅RTBleed Factor=w1​⋅RP+w2​⋅DT+w3​⋅V+w4​⋅DD+w5​⋅RT

    Where:

        RP = Relative Performance index (normalized)
        DT = Downtrend/Uptrend duration ratio
        V = Volatility score (relative to Bitcoin)
        DD = Drawdown severity index
        RT = Recovery Time index
        w1,w2,w3,w4,w5w1​,w2​,w3​,w4​,w5​ = Weights for each factor based on perceived importance

### DESIGN

- Add a splash page
- Add an about page (done)

### INFRASTRUCTURE

- Deploy API on a server that can handle automated cronjob scripts to handle daily updates
- Purchase bespoke URL, setup DNS, certificate, TLS/SSL on Vercel

### CUSTOMER SERVICE

- Setup logging
- Create FAQ
- Setup Contact for user enquiries and troubleshooting options

## PHASE TWO

- Enable signup / login
- Create Membership Tiers

**Note:** See PROFESSIONALIZATION_REMAINING.md (in this directory) for the current detailed, prioritized remaining work list focused on professionalization, maintainability, bulletproofing for regular use, efficiency, and making the app sale-ready. The old phase list is largely historical; active tracking happens in the professionalization doc + forGrokBuild.md.