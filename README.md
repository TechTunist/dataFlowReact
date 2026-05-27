# Cryptological — Quantitative Crypto & Macro Financial Analysis Platform

**Cryptological** is a SaaS dashboard that provides deep quantitative analysis of Bitcoin, altcoins, on-chain metrics, market cycles, and macroeconomic indicators. It combines a rich React frontend with a Django REST backend, Clerk authentication, Stripe subscriptions, and automated daily data pipelines.

This README explains the **architecture, design decisions, and how everything fits together** so a newcomer can fully understand the system without reading the code.

---

## 1. High-Level Purpose & Vision

The goal is to give serious crypto investors and analysts a professional-grade set of tools that were previously scattered across many paid services (Glassnode, CryptoQuant, TradingView, etc.).

Key value propositions:
- **On-chain + macro combined** in one place (most dashboards focus on one or the other).
- **High-quality, pre-computed metrics** (MVRV Z-Score, Pi Cycle, Puell Multiple, Risk Bands, Fear & Greed, Altcoin Season Index, etc.).
- **Subscription-gated premium features** while keeping useful free content.
- **Daily automated updates** so data stays fresh without manual intervention.

---

## 2. Overall Architecture

```
┌─────────────────────────────┐
│   React Frontend            │  ← dataFlowReact (Vercel)
│   (cryptological.app)       │
│   - 60+ custom chart views  │
│   - Clerk Auth              │
│   - Stripe checkout         │
└──────────────┬──────────────┘
               │  Bearer JWT (Clerk)
               │  /api/* proxied
               ▼
┌─────────────────────────────┐
│   Django REST API           │  ← vercelDataFlow/SaaS (Vercel)
│   (vercel-dataflow.vercel.app) │
│   - DRF endpoints           │
│   - Clerk webhook handlers  │
│   - Stripe webhooks         │
│   - UserSubscription model  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│   Neon Postgres             │
│   (managed, serverless)     │
└─────────────────────────────┘

Daily Data Pipeline:
GitHub Actions (update scripts) ← triggered by Vercel Cron
```

**Why this split?**
- Frontend is extremely visualization-heavy → React + modern charting libs was the only practical choice.
- Backend needs complex relational time-series models, scheduled jobs, payment logic, and webhook security → Django + DRF + Python ecosystem was a strong fit.
- Both deployed on **Vercel** for zero-ops serverless hosting + easy custom domains.

---

## 3. Frontend (dataFlowReact)

### Tech Stack
- Create React App (Node 20)
- **@clerk/clerk-react** for authentication
- **@mui/material** + custom theming (dark crypto theme)
- Charting: `react-plotly.js`, `recharts`, `lightweight-charts`
- Routing: `react-router-dom`
- Payments: `@stripe/stripe-js`
- State: React Context (`SubscriptionContext`, `FavoritesContext`)
- Other: `axios`/`fetch`, `idb` (IndexedDB caching), responsive hooks

### Key Design Decisions

**Why so many individual chart components?**
Each metric (BitcoinMvrvZScore, PiCycleTop, FearAndGreedBinaryChart, etc.) has unique data requirements, visual style, and interaction needs. A generic charting system would have been too limiting for the quality bar.

**Authentication Flow**
1. User signs in via Clerk (LoginSignup scene).
2. `AuthWrapper` + `ProtectedRoute` guard routes.
3. `SubscriptionContext` calls backend `/api/subscription-status/` using Clerk's `getToken()` → Bearer JWT.
4. Backend verifies the JWT against Clerk's JWKS.

**API Communication**
- Frontend `vercel.json` rewrites all `/api/*` calls to the Django backend (`https://vercel-dataflow.vercel.app`).
- This allows the frontend to use relative `/api/...` paths in development and production.

**Subscription Gating**
- `RestrictToPaid.js` and `restrictToPaidSubscription` scene protect premium charts.
- Free users see limited features; paid users get full access + Stripe customer portal.

---

## 4. Backend (vercelDataFlow/SaaS)

### Project Structure
- `src/newshome/` — Django project settings/urls
- `src/DashFlow/` — Main application (models, serializers, views, api.py)
- `src/accounts/`, `src/visits/` — Supporting apps
- `src/templates/` — Email templates (welcome, premium, etc.)

### Core Models (DashFlow)
Hundreds of time-series models, including:
- `BitcoinDaily`, `EthereumDaily`, `BitcoinDailyMeta`
- On-chain metrics (`BitcoinMetric`, address-level data)
- Risk metrics, MVRV, dominance, macro indicators (inflation, interest rates, unemployment, FRED series)
- `UserSubscription`, `SubscriptionPlan`, `WebhookEvent`

Models are deliberately normalized with metadata tables for flexibility when ingesting data from multiple sources.

### API Surface (`DashFlow/urls.py`)
~80+ dedicated endpoints, e.g.:
- `/api/btc/data`, `/api/mvrv/`, `/api/fear-and-greed/`
- `/api/combined-macro-data/`
- `/api/risk-metrics/`
- `/api/tx-mvrv/`, `/api/tx-macro/` (combined views)
- Auth/payment: `/api/subscription-status/`, `/api/create-checkout-session/`, `/api/clerk-webhook-secure/`

Most endpoints return JSON tailored exactly to what one specific React component expects.

### Authentication & Authorization
1. **Clerk JWT Verification** (`verify_clerk_token` in views.py)
   - Uses `cryptography` + Clerk's JWKS endpoint.
   - Every protected endpoint extracts `sub` (Clerk user ID) from the token.

2. **Clerk Webhooks** (two versions exist: legacy + secure)
   - `/api/clerk-webhook-secure/` uses **Svix** signature verification (`svix.webhooks.Webhook`).
   - On user creation/update, the backend creates/updates `UserSubscription` records and syncs metadata back to Clerk.

3. **Stripe Integration**
   - Checkout sessions created with Clerk user metadata.
   - Webhook handler updates subscription status.
   - Customer portal sessions for self-service management.

### Why Clerk + Svix + Stripe?
- Clerk handles the hard parts of auth (magic links, passwordless, social, user management).
- Svix provides reliable webhook delivery + signature verification (critical for security).
- Stripe is the industry standard for subscriptions.

---

## 5. Data Pipeline & Automation

### Daily Update Mechanism
1. GitHub Actions workflow (`update.yml`) runs shortly after midnight.
2. Vercel Cron job (`/api/trigger-github-workflow/`) at `2 0 * * *` manually triggers the workflow (workaround for midnight congestion).
3. Python management commands / scripts pull from:
   - CoinMetrics / Glassnode-style APIs
   - FRED (St. Louis Fed)
   - Other on-chain sources
4. Data is upserted into Neon Postgres.
5. A second cron cleans expired subscriptions weekly.

This architecture keeps the database fresh without the frontend ever needing to poll external APIs directly.

---

## 6. Deployment & Infrastructure

### Vercel Configuration
**Frontend (`dataFlowReact`)**
- Standard CRA build.
- `vercel.json` rewrites `/api/*` → backend.

**Backend (`vercelDataFlow/SaaS`)**
- `@vercel/python` runtime (Python 3.10).
- `wsgi.py` entrypoint.
- `collectstatic` during build.
- Two cron jobs defined in `vercel.json`.

### Database — Neon
- Serverless Postgres.
- Connection via `DATABASE_URL` + `dj_database_url`.
- Connection pooling (`CONN_MAX_AGE=600`).
- Hard quotas set to stay within the free/paid tier.

### Environment Variables (key ones)
Frontend:
- `REACT_APP_CLERK_PUBLISHABLE_KEY`
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- `REACT_APP_API_BASE_URL`

Backend:
- `CLERK_SECRET_KEY`, `CLERK_ISSUER_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SVIX_*` secrets
- `DATABASE_URL` (Neon)
- `FRONTEND_BASE_URL`

---

## 7. Why This Architecture Was Chosen

| Concern                    | Choice                          | Rationale |
|---------------------------|----------------------------------|---------|
| Rich interactive charts   | React + Plotly/Recharts         | Best developer experience for complex financial visualizations |
| Auth + user management    | Clerk                           | Fastest way to get production-grade auth + metadata sync |
| Payments & subscriptions  | Stripe + Clerk webhooks         | Industry standard + reliable webhook story |
| Backend framework         | Django + DRF                    | Excellent ORM for time-series data, admin, management commands |
| Hosting                   | Vercel (both)                   | Zero-config serverless, cron, custom domains, preview deploys |
| Database                  | Neon Postgres                   | Serverless, branching, excellent Django support |
| Data freshness            | GitHub Actions + Vercel Cron    | Reliable daily updates without managing servers |

---

## 8. Current State & Known Areas

- Strong core of Bitcoin + macro charts.
- Working subscription system with Stripe + Clerk sync.
- Daily automated data refresh in production.
- Some legacy code paths (two Clerk webhook endpoints) exist from iterative security hardening.

See `TODO.md` (frontend) and `ToDo.md` (backend) for remaining tasks.

---

## 9. Getting Started (for Developers)

1. Clone both repos.
2. `cd dataFlowReact && npm install`
3. `cd vercelDataFlow/SaaS && pip install -r requirements.txt`
4. Set up `.env` files with Clerk, Stripe, Neon, and Svix keys.
5. Run Django migrations and the update scripts.
6. `npm start` (frontend) + `python manage.py runserver` (backend).

For production, push to the respective GitHub repos — Vercel handles the rest.

---

This document should give anyone a complete mental model of **why** the system looks the way it does and **how** all the pieces communicate.