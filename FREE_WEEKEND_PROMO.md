# Free Weekend Promo (Option A)

Signed-in users get **full premium access** for a configured time window — no payment required. The promo is **inactive by default** until env vars are set. Goal: grow the top of the funnel (email signups via Clerk) while letting people experience the full product.

---

## Quick launch checklist

When ready to run the promo:

1. Set backend env vars (UTC ISO-8601):
   ```
   PROMO_OPEN_ACCESS_START=2026-06-28T00:00:00+00:00
   PROMO_OPEN_ACCESS_END=2026-06-30T23:59:59+00:00
   ```
2. Redeploy **backend first**, then **frontend** (backend-only is safe; frontend-only can show broken charts).
3. Verify with a free test account: `/api/subscription-status/` returns `access: "Full"` and `promo_active: true`.
4. Complete the three pre-launch items in [Still to do before launch](#still-to-do-before-launch) below.

To turn off: clear both env vars or set `PROMO_OPEN_ACCESS_END` in the past, then redeploy backend.

---

## Architecture

### Two gates (must stay aligned)

| Layer | Location | Checks |
|-------|----------|--------|
| **Backend API** | `SaaS/src/DashFlow/middleware.py` → `user_has_full_access()` | Every `/api/*` request (JWT + subscription/promo) |
| **Frontend UI** | `RestrictToPaid.js` → `hasPremiumAccess()` | Chart render gate from `SubscriptionContext` |

Paid subscribers are unaffected: promo only elevates free users during the window.

### Backend files

| File | Role |
|------|------|
| `SaaS/src/DashFlow/subscription_access.py` | `is_promo_open_access_active()`, `get_promo_status()`, promo branch in `user_has_full_access()` |
| `SaaS/src/newshome/settings.py` | `PROMO_OPEN_ACCESS_START` / `PROMO_OPEN_ACCESS_END` (empty = off) |
| `SaaS/src/DashFlow/views.py` | `get_subscription_status()` overlays `access: 'Full'` + promo fields during window |
| `SaaS/src/DashFlow/tests/test_subscription_access.py` | Promo on/off, free vs paid, auth required |

### Frontend files

| File | Role |
|------|------|
| `dataFlowReact/src/utils/subscriptionAccess.js` | `hasPremiumAccess()`, `didAccessRevoke()`, promo polling helpers |
| `dataFlowReact/src/utils/premiumCache.js` | Premium IndexedDB IDs, `purgePremiumCache()` |
| `dataFlowReact/src/utils/subscriptionRevocation.js` | Bridge: DataContext 403 → SubscriptionContext refetch |
| `dataFlowReact/src/contexts/SubscriptionContext.js` | Poll during promo, refetch at end, visibility refetch, cache purge on revoke |
| `dataFlowReact/src/scenes/RestrictToPaid.js` | Uses shared `hasPremiumAccess()` (honors `promo_active`) |
| `dataFlowReact/src/DataContext.js` | Blocks premium IndexedDB without access; 403 triggers refetch |
| `dataFlowReact/src/utils/subscriptionAccess.test.js` | Access + revocation tests |
| `dataFlowReact/src/utils/premiumCache.test.js` | Premium cache ID tests |
| `dataFlowReact/src/contexts/SubscriptionContext.test.js` | Integration-style gating tests |

---

## API response shape (during promo)

`GET /api/subscription-status/` (authenticated) includes:

```json
{
  "plan": "Free",
  "subscription_status": "free",
  "access": "Full",
  "promo_active": true,
  "promo_starts_at": "2026-06-28T00:00:00+00:00",
  "promo_ends_at": "2026-06-30T23:59:59+00:00"
}
```

`plan` stays `Free` — only `access` is elevated. Users still need a Clerk account (sign-in required for all chart routes).

---

## What happens when the promo ends

| Mechanism | Behavior |
|-----------|----------|
| API requests | **403 immediately** on premium endpoints (server clock) |
| Subscription poll | Every **5 min** while `promo_active`; one-shot refetch at `promo_ends_at` |
| Tab refocus | Refetches subscription on `visibilitychange` → visible |
| UI gate | `RestrictToPaid` re-renders when status flips to `Limited` |
| IndexedDB | Premium cache **purged** on revocation; premium cache not served without access |
| 403 on data fetch | Triggers subscription refetch via `subscriptionRevocation.js` |

### Edge cases (documented behavior)

| User behavior | After promo ends |
|---------------|------------------|
| Stays on one chart, no refresh | Can view/zoom **in-memory** data; no new API data |
| SPA navigate away and back (no refresh) | Mitigated: polling + visibility refetch update context; premium IDB blocked |
| Full page refresh | Upgrade screen on premium charts immediately |
| First visit to uncached premium chart | 403, no data |

---

## IndexedDB / cache policy

- **Free-tier cache IDs** (always allowed): `btcData`, `ethData`, `dominanceData`, `marketCapData`, `fearAndGreed*`, US macro series, etc. — see `premiumCache.js` → `FREE_TIER_CACHE_IDS`.
- **Premium cache IDs** (gated): `mvrvData`, `txMvrv*`, `fredSeriesData_*`, `altcoinData_*`, `floorEchoData`, etc.
- Stale-while-revalidate background refresh on 403: keeps old data in memory but triggers subscription refetch.
- On `didAccessRevoke()`: `purgePremiumCache()` clears premium entries from IndexedDB.

---

## Tests

### Backend

```bash
cd SaaS/src
DATABASE_URL=sqlite:///test.db DEBUG=True ../.venv/bin/python manage.py test DashFlow.tests.test_subscription_access -v 2
```

Covers: promo inactive by default, free user granted Full inside window, denied outside, paid user retains access after promo, promo status fields, empty `clerk_user_id` denied.

### Frontend

```bash
cd dataFlowReact
npm test -- --watchAll=false --testPathPattern="subscriptionAccess|premiumCache|SubscriptionContext"
```

Covers: promo access, revocation detection, cache ID classification, premium snapshot gating.

---

## Still to do before launch

These are **not implemented** yet — complete before announcing the promo:

1. **Promo banner** on splash and/or dashboard  
   - Copy example: “Free weekend — all charts unlocked until Sunday 23:59 UTC”  
   - Feed from `subscriptionStatus.promo_active` and `promo_ends_at`  
   - Suggested files: `dataFlowReact/src/scenes/splash.jsx`, `dataFlowReact/src/scenes/dashboard/index.jsx`, optional shared `PromoBanner.jsx`

2. **Plausible event for promo signups** (optional but recommended)  
   - Track signups during the window, e.g. `promo_signup` in `dataFlowReact/src/utils/plausibleEvents.js`  
   - Fire from `LoginSignup` on successful signup when `promo_active` (or always during promo dates)

3. **Set env vars at go-time**  
   - Backend host (Vercel/Railway/etc.): `PROMO_OPEN_ACCESS_START`, `PROMO_OPEN_ACCESS_END`  
   - Use **UTC** with explicit end time in banner copy  
   - Redeploy backend → verify test account → redeploy frontend

---

## What we deliberately did not build

- **Anonymous access** (no sign-in): would require relaxing `AuthWrapper`, JWT middleware, and ~35 component HOCs — high risk, no email capture.
- **Stripe trial**: requires card; not a “free weekend for everyone.”
- **Expanding `FREE_TIER_API_PREFIXES` alone**: unlocks API only, not UI gates.

---

## Repos

| Repo | GitHub | Deploy target |
|------|--------|---------------|
| Frontend | `TechTunist/dataFlowReact` | Vercel (cryptological.app) |
| Backend | `TechTunist/SaaS` | Backend host for Django API |

This doc is duplicated in both repo roots for context switching across sessions.