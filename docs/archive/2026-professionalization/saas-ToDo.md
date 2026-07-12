update dominance from data.json as there is no way in backfilling the data from api without subscription

market overview needs to get latest value for btcRisk widget

check the "access ends" - if the subscription has been "cancelled" then it should read "access ends", if subscription is live, it should read "payment due"

~~still need to test real payment with stripe~~ DONE 2026-06-05 — live checkout + webhook E2E working (see HANDOFF.md). Cancel/refund flows still to test.

update node 18

add current price to bitcoin (and altcoins if possible) like we did with the 20 week extension (we can get current values in real time from client based request for free on free APIs)

add a "free charts" section to the charts page

make sure the sidebar buttons maintain state properly so they are only highlighted when on the selected area (currently buggy)

is market overview a free page?

add double password enter on sign up to prevent errors

test reset password now we are in production

market heat index chart from widget (difficult)

why so many repetitive emails after subscribing or signing up?

See dataFlowReact/PROFESSIONALIZATION_REMAINING.md for the consolidated, prioritized list of all remaining professionalization, bulletproofing, efficiency, and sale-readiness work (frontend + backend). This file is now the living source of truth. Many items here map directly into sections 1-2 of that document.


# Neon quota script (run with proper token from env/secrets, never commit tokens)
# curl -X PATCH 'https://console.neon.tech/api/v2/projects/...' \
#   -H 'Authorization: Bearer $NEON_TOKEN' ...
# (token was removed from this file for security)


domain management: Namecheap
bitcoin magazine pro, https://charts.bitbo.io/monthly-rsi/, https://www.coinglass.com/pro/i/CDRI for chart ideas
data sources: "https://www.nomisweb.co.uk/api/v01/help"


testing email scripts for fetching all emails and deleting test emails in commnad scripts