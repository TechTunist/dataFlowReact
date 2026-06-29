# Grok session handoff — Cryptological (June 2026)

Read this file first on a new machine to continue the same work. Two repos are involved.

## Repositories

| Repo | GitHub | Local path (original machine) | Latest relevant commit |
|------|--------|-------------------------------|------------------------|
| Frontend | `TechTunist/dataFlowReact` | `/home/tunist/dataFlowReact` | `7581edc` — newsletter UI, 100-day window, em-dash cleanup |
| Backend (SaaS) | `TechTunist/SaaS` | `/home/tunist/projects/SaaS` | `94f15b8` — newsletter export, unsubscribe API, opt-in defaults |

Clone both and pull `main` on each before continuing.

```bash
git clone git@github.com:TechTunist/dataFlowReact.git
git clone git@github.com:TechTunist/SaaS.git
```

## Production URLs

- **Frontend:** https://cryptological.app (Vercel, CRA app)
- **Backend API:** https://vercel-dataflow.vercel.app (Django on Vercel)
- **Newsletters sent from:** `matt@cryptological.app` via Zoho (same domain)

Frontend API base URL is set via `REACT_APP_API_BASE_URL` (see `src/config/api.js`).

---

## What we built (newsletter system)

Goal: weekly newsletter from Zoho to **opted-in users only**, with one-click unsubscribe and a pre-send CSV export for Zoho Campaigns. No Zoho API automation yet — export-before-send is the workflow.

### Data model

Newsletter preference lives in **Clerk `public_metadata`**:

- `emailNotifications` — `true` = subscribed, `false` = not (default for **new** users)
- `newsletter_consent_at` — ISO timestamp when user opts in
- `newsletter_unsubscribed_at` — ISO timestamp when user opts out

### Frontend (`dataFlowReact`)

| Feature | Location |
|---------|----------|
| Signup opt-in checkbox (unchecked default) | `src/scenes/LoginSignup/index.jsx` |
| Google OAuth opt-in (sessionStorage → apply after login) | `src/utils/newsletterOptIn.js`, `src/App.js` |
| Settings toggle | `src/scenes/Settings.js` |
| Public unsubscribe page | `src/scenes/NewsletterUnsubscribe.jsx`, route `/newsletter/unsubscribe` |
| Zoho footer snippet (copy-paste) | `public/newsletters/email-footer-snippet.html` |
| Newsletter PDF embed | `public/newsletters/issue-1.pdf`, `src/components/marketing/NewsletterEmbed.jsx` |

Public routes include `/newsletter/unsubscribe` in `PUBLIC_ROUTE_PATHS` (`src/App.js`).

### Backend (`SaaS`)

| Feature | Location |
|---------|----------|
| Token signing / unsubscribe URLs | `src/DashFlow/newsletter.py` |
| Unsubscribe endpoint | `GET /api/newsletter/unsubscribe/?token=...` in `views.py`, `urls.py` |
| User settings (opt-in + timestamps) | `update_user_settings`, `get_user_settings` in `views.py` |
| New user default opt-out | `clerk_webhook_secure` in `views.py` sets `emailNotifications: false` |
| Export script for Zoho | `python3 manage.py export_emails` → `newsletter_subscribers.csv` |
| Email footer templates | `src/templates/newsletter_email_footer.html`, `.txt` |
| Tests | `src/DashFlow/test_newsletter.py` |

**Important:** Legacy `clerk_webhook` is deprecated (returns 410). Production uses `clerk_webhook_secure` with Svix verification.

### Zoho workflow (before each newsletter send)

```bash
cd SaaS/src
python3 manage.py export_emails
# → newsletter_subscribers.csv with columns: Email, Name, UnsubscribeURL
```

1. Import CSV into Zoho Campaigns
2. Map `UnsubscribeURL` as merge field
3. Paste footer from `email-footer-snippet.html` or backend template
4. Use `{{UnsubscribeURL}}` in the unsubscribe link
5. Send from `matt@cryptological.app`

### Legacy users

Accounts created **before** the opt-in change may still have `emailNotifications: true` from the old default. They will appear in exports until they unsubscribe. A one-time metadata migration command was discussed but **not** implemented.

---

## What we built (100-Day Window marketing page)

Public page: `/100-day-window` (`src/scenes/HundredDayWindow.jsx`)

| Component | Purpose |
|-----------|---------|
| `HundredDayWindowOriginStory.jsx` | Newsletter #1 story, YouTube embed (starts 0:33), free-weekend block |
| `NewsletterEmbed.jsx` | Scrollable PDF iframe for `public/newsletters/issue-1.pdf` |
| `EducationalDisclaimer.jsx` | Reusable UK-style educational disclaimer |
| `HundredDayWindowBanner.jsx` | Site-wide banner (already existed) |

Recent copy change: **"Why 11 October?"** is its own full-width section (not inline in the math block). Explains 370-day average from last two cycles, errs on caution, better to look early than miss the bottom.

SEO content for crawlers: `src/seo/staticPageContent.js` (section on newsletter + YouTube).

### YouTube

- Video ID: `HecEFCo5opg`
- Embed starts at 33 seconds
- URL constant in `HundredDayWindowOriginStory.jsx`

---

## Site-wide copy cleanup (done)

All em dashes (`—`) were bulk-replaced with commas across `src/`, `public/`, `scripts/`. Edge cases fixed manually (`MarketHeatIndex.jsx` placeholders, splash pricing cells).

Advisory language on the 100-day page was softened (educational framing, not DCA/trading recommendations).

---

## Dev commands

### Frontend

```bash
cd dataFlowReact
npm install
npm start          # http://localhost:3000
npm test -- --watchAll=false
npm run build
```

If dev server gets stuck after Ctrl+Z: `kill` the suspended node process on port 3000, then `npm start` again.

### Backend

```bash
cd SaaS/src
# Use project venv if available; needs decouple, django, etc.
python3 manage.py test DashFlow.test_newsletter
python3 manage.py export_emails
```

---

## Not yet done (from earlier plans)

### `FREE_WEEKEND_PROMO.md` items (if that file still exists)

- Promo banner on splash/dashboard
- Plausible `promo_signup` event
- Backend env vars at go-time for promo access

### Newsletter phase 2 (optional)

- Zoho Campaigns API sync (automated list updates)
- One-time migration to set `emailNotifications: false` for legacy users who never opted in
- Deploy verification: confirm backend `94f15b8` is live on Vercel before first real export

### Backend local WIP (may be in `git stash` on original machine)

The SaaS repo had unrelated in-progress work (e.g. `tx-mvrv-ratio` endpoint) stashed as `all-wip-before-push` and `urls-tx-mvrv`. Not pushed. Check `git stash list` on the original machine if needed.

---

## Key env vars (backend / Vercel)

- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` (secure webhook)
- `SECRET_KEY` (Django — used for unsubscribe token signing)
- `FRONTEND_BASE_URL` — defaults to `https://cryptological.app` for unsubscribe links
- `ZOHO_MATT_APP_SPECIFIC_PASSWORD` — SMTP for welcome emails

---

## How to continue in a new Grok session

Suggested prompt:

> Read `GROK_SESSION_HANDOFF.md` in the dataFlowReact repo root. We're building Cryptological's newsletter opt-in/export flow and the `/100-day-window` marketing page. Frontend is `dataFlowReact`, backend is `SaaS`. Continue from the "Not yet done" section / whatever I ask next.

Always check both repos — frontend and backend changes are split across them.

---

## File quick reference

```
dataFlowReact/
  GROK_SESSION_HANDOFF.md          ← this file
  src/scenes/HundredDayWindow.jsx
  src/components/marketing/
    HundredDayWindowOriginStory.jsx
    NewsletterEmbed.jsx
    EducationalDisclaimer.jsx
  src/scenes/NewsletterUnsubscribe.jsx
  src/scenes/LoginSignup/index.jsx
  src/scenes/Settings.js
  src/utils/newsletterOptIn.js
  public/newsletters/
    issue-1.pdf
    email-footer-snippet.html

SaaS/src/
  DashFlow/newsletter.py
  DashFlow/views.py                 ← webhook, settings, unsubscribe
  DashFlow/urls.py
  DashFlow/management/commands/export_emails.py
  DashFlow/test_newsletter.py
  templates/newsletter_email_footer.html
```

---

*Last updated: 29 June 2026. Commits: dataFlowReact `7581edc`, SaaS `94f15b8`.*