# Project Phases

### NOTES
- add logging information for command scripts for time taken, success or not
    and any other useful info for making the automation as hardened as possible when the scripts are run through cronjobs

## PHASE ONE

### FUNCTIONALITY

- ~~Tooltips~~
- Improve styling [ongoing]
- Increase interactivity of charts (buttons) [ongoing]
    - Create a "bleed factor" for altcoins when comparing their performance against bitcoin over time
- Increase the number of altcoins available
- Add other financial information than crypto (inflation, interests, liquidity, monetary policy etc)

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
- Add an about page

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