# Open Access Promotion — AI Handoff

> **Filename note:** This file is still named `FREE_WEEKEND_PROMO.md` for historical reasons. It documents the **current open-access user-acquisition promotion** (not only a weekend window). Read this first when working on promo access, splash pricing copy, or reverting to paid premium.

**Last updated:** July 2026 (growth branch: limited-access messaging + public market pulse)

---

## What the promotion is

**Goal:** Grow signups by letting anyone with a **free Clerk account** use the full product (all premium charts and tools) without paying, while marketing content/videos drive cold traffic.

**Business model unchanged:** Stripe subscriptions still exist. The promotion temporarily removes the paywall for signed-in free users so they can experience the product before upgrading. **Payment plan UI is intentionally not being changed during this growth push.**

**Users still must sign in** — anonymous visitors cannot load interactive chart data. They can see:
- Marketing pages + public chart gallery (screenshots)
- Interactive risk-colour **preview** (static snapshot)
- **Public market pulse** (`GET /api/public/market-pulse/`) — small daily snapshot, no auth

**Copy must always say clearly (cold visitors):**
1. Free full access is **limited / promotional** (not permanent).
2. It requires a **free account (email + password)**.
3. **No card** during the promo.

Central copy: `src/config/openAccessPromo.js` (and splash / login / sticky CTA / FAQ consumers).

---

## Three separate layers (important)

The promotion touches three independent mechanisms. They can be toggled separately, but **should stay aligned** while the promo is live.

| Layer | What it controls | Toggle |
|-------|------------------|--------|
| **1. Backend API access** | Whether premium `/api/*` endpoints return data to free users | Code in `subscription_access.py` + `views.py` (see [Revert access](#revert-access-when-promotion-ends)) |
| **2. Frontend chart gates** | Whether `RestrictToPaid` blocks premium chart routes | Code in `subscriptionAccess.js` → `hasPremiumAccess()` |
| **3. Splash marketing UI** | Strikethrough pricing, “Currently free” copy on public landing page | Env: `REACT_APP_OPEN_ACCESS_PROMO=true` on Vercel |

| Layer | Currently active? |
|-------|-------------------|
| Backend API | **Yes** — all authenticated users get full API access |
| Frontend gates | **Yes** — all signed-in users pass `hasPremiumAccess()` |
| Splash marketing | **When env set** — `REACT_APP_OPEN_ACCESS_PROMO=true` |

Layer 3 is **marketing only**. Turning it off does not restore the paywall. Layers 1 and 2 control actual access.

---

## Current access behaviour (July 2026)

### Backend (`SaaS` / `vercelDataFlow/SaaS`)

| File | Current behaviour |
|------|-------------------|
| `src/DashFlow/subscription_access.py` | `user_has_full_access(clerk_user_id)` returns `True` for any non-empty Clerk user ID |
| `src/DashFlow/views.py` → `get_subscription_status()` | Always returns `access: 'Full'` for authenticated users (lines force `access = 'Full'` after building response) |
| `src/DashFlow/middleware.py` | Uses `user_has_full_access()` on premium API paths |

**Introduced in commit:** `251319c` — *Grant full API access to all authenticated users.*

### Frontend (`dataFlowReact`)

| File | Current behaviour |
|------|-------------------|
| `src/utils/subscriptionAccess.js` | `hasPremiumAccess(subscriptionStatus)` returns `True` whenever `subscriptionStatus` is truthy (any signed-in user) |
| `src/scenes/RestrictToPaid.js` | Uses `hasPremiumAccess()` from context |
| `src/DataContext.js` | Premium IndexedDB + API fetches allowed when subscription context is loaded |

**Introduced in commit:** `4621ff5` — *Grant full app access to all signed-in free accounts.*

### API response shape (current)

`GET /api/subscription-status/` for a free signed-in user:

```json
{
  "plan": "Free",
  "subscription_status": "free",
  "access": "Full",
  "promo_active": false,
  "promo_starts_at": null,
  "promo_ends_at": null
}
```

`promo_active` reflects the **legacy time-window env vars** (see below) but is **not** what currently grants access. Access is unconditional for authenticated users.

---

## Splash marketing UI (strikethrough pricing)

Implemented so visitors see premium is **currently free** while the promotion runs.

### Env var

```bash
# Vercel (frontend project) or dataFlowReact/.env
REACT_APP_OPEN_ACCESS_PROMO=true
```

Set to `false` or remove, then redeploy frontend to restore normal pricing copy on splash.

### Config (single source for copy)

`dataFlowReact/src/config/openAccessPromo.js`

| Export | Purpose |
|--------|---------|
| `isOpenAccessPromoActive()` | Reads `REACT_APP_OPEN_ACCESS_PROMO === 'true'` |
| `OPEN_ACCESS_PROMO.priceLabel` | `"Currently free"` |
| `OPEN_ACCESS_PROMO.premiumPriceUsd` | `"$13.45 / month"` (shown struck through) |
| `getPricingSectionSubtitle()` | Pricing section intro text |
| `getHeroPricingHint()` | Hero footnote under CTA |
| `getHowItWorksSteps()` | Step 3 becomes “Full access included” during promo |
| `getPromoFaqs()` | Prepends “Is premium really free right now?” |

### Components

| File | Role |
|------|------|
| `src/components/marketing/PromoPriceDisplay.jsx` | Red strikethrough on original price + “CURRENTLY FREE” label |
| `src/components/marketing/OpenAccessPromoBanner.jsx` | Green gradient callout banner |
| `src/components/marketing/FreePremiumAccessSticker.jsx` | White ribbon, red text, 45° rotation; corner of hero sections |
| `src/scenes/splash.jsx` | All pricing/subscription copy switches on `promoActive` |
| `src/scenes/BitcoinWhitepaper.jsx` | Hero sticker (`corner="top-right"`) |
| `src/scenes/HundredDayWindow.jsx` | Hero sticker (`corner="top-right"`) |

The sticker uses `position: absolute` on the hero `<section>` (with `overflow: visible`) so the main `Container` copy and CTAs are unchanged. It only renders when `REACT_APP_OPEN_ACCESS_PROMO=true`. Label: `OPEN_ACCESS_PROMO.stickerLabel` → `"Free Premium Access"`.

### What changes on splash when promo UI is on

- Hero: promo banner, “Get full access free” CTA, updated hints
- DCA section chip: “Included free · Flagship tool”
- How it works: step 3 no longer mentions $13.45/mo
- Pricing: `$13.45 / month` struck through; premium CTAs route to **free signup** (not Stripe checkout intent)
- FAQ: extra question about premium being free
- Bottom CTA + sticky bar: promo copy

### Tests

```bash
cd dataFlowReact
npm test -- --watchAll=false --testPathPattern="openAccessPromo"
```

---

## Legacy time-window promo (still in codebase, not driving access)

An earlier design used **backend env vars** to grant full access only during a date range:

```bash
PROMO_OPEN_ACCESS_START=2026-07-03T11:00:00+00:00
PROMO_OPEN_ACCESS_END=2026-07-05T23:59:59+00:00
```

| File | Role |
|------|------|
| `SaaS/src/newshome/settings.py` | Reads `PROMO_OPEN_ACCESS_START` / `PROMO_OPEN_ACCESS_END` |
| `SaaS/src/DashFlow/subscription_access.py` | `is_promo_open_access_active()`, `get_promo_status()` |
| `SaaS/src/DashFlow/views.py` | Merges `get_promo_status()` into subscription-status JSON |

**As of July 2026:** `user_has_full_access()` no longer calls `is_promo_open_access_active()`. These env vars only affect `promo_active` / `promo_ends_at` in API responses and frontend polling helpers — **not** the actual gate.

To use time-window promos again, restore the pre-`251319c` `user_has_full_access()` logic (see revert section) and set the env vars.

---

## Launch checklist (promo live)

1. **Backend:** Confirm `user_has_full_access` grants all authenticated users (commit `251319c` or equivalent on `main`). Deploy API.
2. **Frontend access:** Confirm `hasPremiumAccess` grants all signed-in users (commit `4621ff5` on `main`). Deploy SPA.
3. **Frontend marketing:** Set `REACT_APP_OPEN_ACCESS_PROMO=true` on Vercel. Deploy SPA.
4. **Verify:** Sign up a new free test account → open a premium chart (e.g. `/mvrv-z-score`, `/tx-mvrv`) → data loads. Visit splash → pricing shows strikethrough + “Currently free”.
5. **Optional:** Track signups in Plausible (not wired yet — see [Still optional](#still-optional)).

---

## Revert access when promotion ends

Do all steps below to fully restore paid premium gating.

### 1. Backend — restore subscription checks

Revert `user_has_full_access()` in `SaaS/src/DashFlow/subscription_access.py` to check plan + status + optional promo window. Reference implementation from commit `634cfc5` (parent of `251319c`):

- Return `False` if no `clerk_user_id`
- Return `True` if `is_promo_open_access_active()` (optional, for timed promos)
- Load `UserSubscription`; deny if plan is Free / no full-access features
- Allow `active`, `past_due`, `premium` statuses
- Allow `canceling` / `canceled` within grace via `cancelled_access_still_valid()`

Revert `get_subscription_status()` in `SaaS/src/DashFlow/views.py`:

- Remove unconditional `response_data['access'] = 'Full'` overrides
- Restore plan-based `access` from `plan.features`
- Restore `default_response['access'] = 'Limited'` for new users
- Restore promo overlay: `if is_promo_open_access_active(): response_data['access'] = 'Full'`

Revert `downgrade_subscription_to_free()` Clerk metadata: `access: 'Limited'` (currently `'Full'`).

Update tests in `DashFlow/tests/test_subscription_access.py` — free users should be denied outside promo/paid.

```bash
cd vercelDataFlow/SaaS/src
../venv/bin/python manage.py test DashFlow.tests.test_subscription_access -v 2
```

Deploy backend.

### 2. Frontend — restore chart gates

Revert `hasPremiumAccess()` in `dataFlowReact/src/utils/subscriptionAccess.js` to pre-`4621ff5` logic:

```javascript
export const hasPremiumAccess = (subscriptionStatus) => {
  if (!subscriptionStatus) return false;
  if (subscriptionStatus.promo_active) return true;
  const rawStatus = (subscriptionStatus.subscription_status || '').toLowerCase();
  if (rawStatus === 'canceling' || rawStatus === 'canceled') {
    return isCancelledButValid(subscriptionStatus);
  }
  if (subscriptionStatus.access === 'Full') return true;
  return false;
};
```

Revert `didAccessRevoke()` to compare premium before/after (not sign-out only).

Update `src/utils/subscriptionAccess.test.js` — free user with `access: 'Limited'` should fail `hasPremiumAccess`.

```bash
cd dataFlowReact
npm test -- --watchAll=false --testPathPattern="subscriptionAccess|premiumCache|SubscriptionContext"
```

Deploy frontend.

### 3. Splash marketing — turn off strikethrough UI

```bash
REACT_APP_OPEN_ACCESS_PROMO=false   # or remove the var
```

Redeploy frontend. Splash returns to normal $13.45/month pricing copy automatically.

---

## IndexedDB / cache policy (unchanged)

- **Free-tier cache IDs:** always allowed — see `premiumCache.js` → `FREE_TIER_CACHE_IDS`
- **Premium cache IDs:** gated by `canUsePremiumCache()` / `hasPremiumAccess()` during promo all signed-in users can use premium cache
- On access revocation: `purgePremiumCache()` clears premium IndexedDB entries

---

## Still optional

Not implemented; safe to skip or add later:

1. **Dashboard promo banner** for signed-in users (could read `subscriptionStatus.promo_active` or a shared config flag)
2. **Plausible `promo_signup` event** on successful signup during promo (`LoginSignup`, `plausibleEvents.js`)
3. **Subscription page** (`src/scenes/Subscription.js`) strikethrough on `$13.45` — not updated yet
4. **Other public pages** (chart gallery, SEO landings) — no sticker yet; reuse `FreePremiumAccessSticker` if needed

---

## Key files quick reference

### Access control

| Repo | File |
|------|------|
| Backend | `SaaS/src/DashFlow/subscription_access.py` |
| Backend | `SaaS/src/DashFlow/views.py` (`get_subscription_status`) |
| Backend | `SaaS/src/DashFlow/middleware.py` |
| Frontend | `src/utils/subscriptionAccess.js` |
| Frontend | `src/scenes/RestrictToPaid.js` |
| Frontend | `src/contexts/SubscriptionContext.js` |
| Frontend | `src/DataContext.js` |
| Frontend | `src/utils/premiumCache.js` |

### Marketing / splash

| Repo | File |
|------|------|
| Frontend | `src/config/openAccessPromo.js` |
| Frontend | `src/components/marketing/PromoPriceDisplay.jsx` |
| Frontend | `src/components/marketing/OpenAccessPromoBanner.jsx` |
| Frontend | `src/scenes/splash.jsx` |

### Tests

| Repo | Command |
|------|---------|
| Backend | `manage.py test DashFlow.tests.test_subscription_access` |
| Frontend | `npm test -- --testPathPattern="subscriptionAccess\|openAccessPromo"` |

---

## Repos & deploy

| Repo | GitHub | Local path | Deploy |
|------|--------|------------|--------|
| Frontend | `TechTunist/dataFlowReact` | `/home/tunist/dataFlowReact` | Vercel → cryptological.app |
| Backend | `TechTunist/SaaS` | `/home/tunist/vercelDataFlow/SaaS` | Vercel → vercel-dataflow.vercel.app |

**This file is duplicated in both repo roots** so context is available regardless of which repo an AI session opens.

---

## One-paragraph summary for a new AI assistant

> Cryptological is running an **open-access promotion**: any signed-in free user gets full premium charts and API data. This is implemented by simplifying `user_has_full_access()` (backend) and `hasPremiumAccess()` (frontend) to allow all authenticated users — not via Stripe and not via the legacy `PROMO_OPEN_ACCESS_*` date env vars. Splash marketing strikethrough pricing is controlled separately by `REACT_APP_OPEN_ACCESS_PROMO=true` (`openAccessPromo.js`, `splash.jsx`). To end the promo, revert the access functions to plan-based gating (commits before `251319c` / `4621ff5`), turn off the frontend env var, and redeploy both repos.