// Central metadata for chart pages: route → chart ID, titles, and topbar visibility.

export const routeToChartId = {
  "/btc-20-ext": "bitcoin-20-ext",
  "/bitcoin": "bitcoin-price",
  "/total": "total-market-cap",
  "/total-difference": "total-difference",
  "/total2": "total2",
  "/total3": "total3",
  "/bitcoin-fees": "bitcoin-fees",
  "/bitcoin-dominance": "bitcoin-dominance",
  "/bitcoin-roi": "bitcoin-roi",
  "/running-roi": "running-roi",
  "/historical-volatility": "historical-volatility",
  "/monthly-returns": "monthly-returns",
  "/monthly-average-roi": "monthly-average-roi",
  "/btc-add-balance": "bitcoin-address-balances",
  "/ethereum": "ethereum-price",
  "/puell-multiple": "puell-multiple",
  "/risk": "bitcoin-risk",
  "/risk-eth": "ethereum-risk",
  "/pi-cycle": "pi-cycle-top",
  "/fear-and-greed": "fear-and-greed",
  "/fear-and-greed-3d": "fear-and-greed-3d",
  "/logarithmic-regression": "logarithmic-regression",
  "/risk-color": "risk-color",
  "/risk-bands": "risk-bands",
  "/altcoin-price": "altcoin-price",
  "/altcoin-risk": "altcoin-risk",
  "/market-cycles": "market-cycles",
  "/fear-and-greed-chart": "fear-and-greed-chart",
  "/fear-and-greed-binary": "fear-and-greed-binary",
  "/fear-and-greed-binary-chart": "fear-and-greed-binary",
  "/us-inflation": "us-inflation",
  "/us-unemployment": "us-unemployment",
  "/us-interest": "us-interest",
  "/us-combined-macro": "us-combined-macro",
  "/us-initial-claims": "us-initial-claims",
  "/uk-unemployment": "uk-unemployment",
  "/uk-claimants": "uk-claimants",
  "/uk-earnings": "uk-earnings",
  "/uk-population": "uk-population",
  "/uk-workforce-jobs": "uk-workforce-jobs",
  "/uk-business-counts": "uk-business-counts",
  "/uk-jsa-age": "uk-jsa-age",
  "/uk-jsa-ethnicity": "uk-jsa-ethnicity",
  "/uk-labour-by-age": "uk-labour-by-age",
  "/uk-public-private": "uk-public-private",
  "/uk-aps-workplace": "uk-aps-workplace",
  "/uk-esa-claimants": "uk-esa-claimants",
  "/tx-mvrv": "tx-mvrv",
  "/on-chain-historical-risk": "on-chain-historical-risk",
  "/altcoin-season-index": "altcoin-season-index",
  "/sp500unrate": "sp500-div-unrate",
  "/fred/fed-funds-rate": "fred-fed-funds-rate",
  "/fred/sp500": "fred-sp500",
  "/fred/recession-indicator": "fred-recession-indicator",
  "/fred/cpi": "fred-cpi",
  "/fred/unemployment-rate": "fred-unemployment-rate",
  "/fred/10-year-treasury": "fred-10-year-treasury",
  "/fred/10y-2y-spread": "fred-10y-2y-spread",
  "/fred/5y-inflation-expectation": "fred-5y-inflation-expectation",
  "/fred/euro-dollar": "fred-euro-dollar",
  "/fred/crude-oil": "fred-crude-oil",
  "/fred/producer-price": "fred-producer-price",
  "/fred/nonfarm-payrolls": "fred-nonfarm-payrolls",
  "/fred/gdp": "fred-gdp",
  "/fred/gdp-growth": "fred-gdp-growth",
  "/fred/m1-money-supply": "fred-m1-money-supply",
  "/fred/m2-money-supply": "fred-m2-money-supply",
  "/fred/consumer-sentiment": "fred-consumer-sentiment",
  "/fred/vix": "fred-vix",
  "/fred/ted-spread": "fred-ted-spread",
  "/fred/yen-dollar": "fred-yen-dollar",
  "/fred/pound-dollar": "fred-pound-dollar",
  "/fred/cad-dollar": "fred-cad-dollar",
  "/fred/chicago-fed-index": "fred-chicago-fed-index",
  "/fred/economic-policy-uncertainty": "fred-economic-policy-uncertainty",
  "/fred/housing-starts": "fred-housing-starts",
  "/fred/case-shiller": "fred-case-shiller",
  "/fred/nikkei-225": "fred-nikkei-225",
  "/fred/german-bond-yield": "fred-german-bond-yield",
  "/fred/sahm-recession-indicator": "sahm-recession-indicator",
  "/workbench": "workbench",
  "/sp500-roi": "sp500-roi",
  "/btc-mvrv-z": "mvrv-zscore",
  "/tail-curvature": "tail-curvature",
  "/market-heat-index": "market-heat-index",
  "/dynamic-dca": "dynamic-dca",
};

export const isChartPageRoute = (pathname) => Boolean(routeToChartId[pathname]);

// Routes that hide the topbar; account/theme controls move to the sidebar footer.
export const HIDE_TOPBAR_ROUTES = Object.keys(routeToChartId);

export const getTitleAndSubtitle = (pathname, isMobile = false) => {
  switch (pathname) {
    case "/dashboard":
      return { title: "Dashboard", subtitle: "All charts" };
    case "/bitcoin":
      return { title: "Bitcoin", subtitle: "Historical Chart" };
    case "/bitcoin-dominance":
      return { title: "Bitcoin Dominance", subtitle: "Bitcoin Dominance Chart" };
    case "/total":
      return { title: "Total Crypto Market Cap", subtitle: isMobile ? "All Crypto Assets" : "Combined marketcap of the top 125 crypto assets" };
    case "/risk":
      return { title: "Bitcoin", subtitle: "Historical Risk Metric for Bitcoin" };
    case "/ethereum":
      return { title: "Ethereum", subtitle: "Historical Chart" };
    case "/risk-eth":
      return { title: "Ethereum", subtitle: "Risk Metric" };
    case "/pi-cycle":
      return { title: "PiCycle Top", subtitle: "Top Calling Indicator" };
    case "/market-heat-index":
      return { title: "Market Heat Index", subtitle: isMobile ? "Tunable multi-factor market heat" : "Live tunable composite of MVRV, Mayer, Risk, F&G, PiCycle, Alt Season" };
    case "/fear-and-greed":
      return { title: "Fear & Greed", subtitle: "Market Sentiment" };
    case "/logarithmic-regression":
      return { title: "Bitcoin", subtitle: "Logarithmic Regression" };
    case "/risk-color":
      return { title: "Price v Risk Bands", subtitle: isMobile ? "Colorized Price v Risk" : "Colorized asset price based on the given risk level" };
    case "/risk-bands":
      return { title: "Time in Risk Bands", subtitle: isMobile ? "" : "See how long an asset spends in different risk bands" };
    case "/altcoin-price":
      return { title: "Altcoins", subtitle: "Altcoin Analysis" };
    case "/about":
      return { title: "About", subtitle: "Why did I create Cryptological?" };
    case "/login-signup":
      return { title: "Login / Signup", subtitle: "Under Construction" };
    case "/market-cycles":
      return { title: "Bitcoin Cycles", subtitle: isMobile ? "Compare Market Cycles" : "Start from either the cycle bottom or from the halving" };
    case "/bitcoin-roi":
      return { title: "Bitcoin ROI", subtitle: isMobile ? "ROI" : "Annualised ROI for Bitcoin" };
    case "/btc-20-ext":
      return { title: "Bitcoin Bubble Indicator", subtitle: isMobile ? "20 Week Ext." : "Bubble Indicator Showing the Extension From the 20 Week Moving Average" };
    case "/monthly-average-roi":
      return { title: "Monthly Average ROI", subtitle: isMobile ? "Monthly ROI" : "Monthly Averaged ROI Over Selected Timeframes" };
    case "/monthly-returns":
      return { title: "Bitcoin Monthly Returns", subtitle: isMobile ? "Monthly Returns" : "The Monthly Returns for Bitcoin" };
    case "/running-roi":
      return { title: "Running ROI", subtitle: isMobile ? "Running ROI v Price" : "The Running ROI plotted Against Price" };
    case "/fear-and-greed-chart":
      return { title: "Bitcoin Fear and Greed", subtitle: "Fear and Greed plotted over the Bitcoin Price" };
    case "/altcoin-risk":
      return { title: "Altcoin Risk Chart", subtitle: "Risk metric for a selection of altcoins" };
    case "/us-inflation":
      return { title: "US Inflation", subtitle: "Annualised inflation rate" };
    case "/us-interest":
      return { title: "US Interest Rate", subtitle: "Fed Funds Rate" };
    case "/us-combined-macro":
      return { title: "US Macro Information", subtitle: "Compare US Macro Data" };
    case "/us-initial-claims":
      return { title: "US Initial Claims", subtitle: "Jobless Claims" };
    case "/uk-unemployment":
      return { title: "UK Unemployment (LFS)", subtitle: isMobile ? "UK Unemp Rate" : "UK ILO Unemployment + Employment Rates (16-64, consistent Nomis LFS data)" };
    case "/uk-claimants":
      return { title: "UK Claimant Count", subtitle: isMobile ? "UK Claimants" : "UK Jobseeker's Allowance Claimant Rate (timely, consistent monthly Nomis data)" };
    case "/uk-earnings":
      return { title: "UK Earnings (ASHE)", subtitle: isMobile ? "UK Earnings" : "UK Median Earnings by Gender (ASHE, consistent Nomis data)" };
    case "/uk-population":
      return { title: "UK Population Estimates", subtitle: isMobile ? "UK Population" : "UK Population by Age and Gender (Nomis, consistent annual data)" };
    case "/uk-workforce-jobs":
      return { title: "UK Workforce Jobs", subtitle: isMobile ? "UK Jobs" : "UK Workforce Jobs by Industry (consistent Nomis data)" };
    case "/uk-business-counts":
      return { title: "UK Business Counts", subtitle: isMobile ? "UK Businesses" : "UK Business Enterprises by Industry/Size (Nomis, consistent data)" };
    case "/uk-jsa-age":
      return { title: "UK JSA by Age/Duration", subtitle: isMobile ? "UK JSA Age" : "UK JSA Claimant by Age and Duration (consistent Nomis breakdowns)" };
    case "/uk-jsa-ethnicity":
      return { title: "UK JSA by Ethnicity", subtitle: isMobile ? "UK JSA Ethnicity" : "UK JSA by Ethnicity, Age, Gender (detailed Nomis breakdowns)" };
    case "/uk-labour-by-age":
      return { title: "UK Labour by Age", subtitle: isMobile ? "UK Labour Age" : "UK Labour Market Status by Age (APS, consistent Nomis data)" };
    case "/uk-public-private":
      return { title: "UK Public/Private Employment", subtitle: isMobile ? "UK Pub/Priv Jobs" : "UK Employment by Public/Private Sector (BRES, consistent data)" };
    case "/uk-aps-workplace":
      return { title: "UK APS Workplace", subtitle: isMobile ? "UK Workplace" : "UK APS Workplace Analysis (consistent Nomis data)" };
    case "/uk-esa-claimants":
      return { title: "UK ESA Claimants", subtitle: isMobile ? "UK ESA" : "UK ESA Claimants by Gender/Age (Nomis, consistent data)" };
    case "/puell-multiple":
      return { title: "Puell Multiple", subtitle: isMobile ? "Miner Revenue" : "Current Mined BTC Value to the 365 day Moving Average" };
    case "/tx-mvrv":
      return { title: "Tx Tension", subtitle: "Network valuation relative to transaction activity" };
    case "/fred/fed-funds-rate":
      return { title: "Federal Funds Rate", subtitle: isMobile ? "Fed Rate" : "Effective Federal Funds Rate" };
    case "/fred/sp500":
      return { title: "S&P 500", subtitle: isMobile ? "Stock Index" : "S&P 500 Index Daily Closing Values" };
    case "/fred/recession-indicator":
      return { title: "US Recession", subtitle: isMobile ? "Recession Periods" : "US Recession Indicator" };
    case "/fred/cpi":
      return { title: "Consumer Price Index", subtitle: isMobile ? "CPI" : "US Consumer Price Index" };
    case "/fred/unemployment-rate":
      return { title: "Unemployment Rate", subtitle: isMobile ? "Unemployment" : "US Unemployment Rate" };
    case "/fred/10-year-treasury":
      return { title: "10-Year Treasury", subtitle: isMobile ? "Treasury Yield" : "10-Year Treasury Note Yield" };
    case "/fred/10y-2y-spread":
      return { title: "10Y-2Y Spread", subtitle: isMobile ? "Yield Spread" : "10-Year to 2-Year Treasury Spread" };
    case "/fred/5y-inflation-expectation":
      return { title: "Inflation Expectation", subtitle: isMobile ? "5Y Inflation" : "5-Year Breakeven Inflation Rate" };
    case "/fred/euro-dollar":
      return { title: "Euro to USD", subtitle: isMobile ? "Exchange Rate" : "Euro to USD Exchange Rate" };
    case "/fred/crude-oil":
      return { title: "Crude Oil Price", subtitle: isMobile ? "Oil Price" : "WTI Crude Oil Price" };
    case "/fred/producer-price":
      return { title: "Producer Price Index", subtitle: isMobile ? "PPI" : "Producer Price Index for Commodities" };
    case "/fred/nonfarm-payrolls":
      return { title: "Nonfarm Payrolls", subtitle: isMobile ? "Payrolls" : "US Nonfarm Payroll Employment" };
    case "/fred/gdp":
      return { title: "Real GDP", subtitle: isMobile ? "GDP" : "US Real Gross Domestic Product" };
    case "/fred/gdp-growth":
      return { title: "GDP Growth", subtitle: isMobile ? "Growth Rate" : "US Real GDP Growth Rate" };
    case "/fred/m1-money-supply":
      return { title: "M1 Money Supply", subtitle: isMobile ? "M1" : "US M1 Money Supply" };
    case "/fred/m2-money-supply":
      return { title: "M2 Money Supply", subtitle: isMobile ? "M2" : "US M2 Money Supply" };
    case "/fred/consumer-sentiment":
      return { title: "Consumer Sentiment", subtitle: isMobile ? "Sentiment" : "US Consumer Sentiment Index" };
    case "/fred/vix":
      return { title: "VIX Index", subtitle: isMobile ? "Volatility" : "CBOE Volatility Index" };
    case "/fred/ted-spread":
      return { title: "TED Spread", subtitle: isMobile ? "Spread" : "LIBOR to T-Bill Spread" };
    case "/fred/yen-dollar":
      return { title: "Yen to USD", subtitle: isMobile ? "Exchange Rate" : "Japanese Yen to USD Exchange Rate" };
    case "/fred/pound-dollar":
      return { title: "Pound to USD", subtitle: isMobile ? "Exchange Rate" : "British Pound to USD Exchange Rate" };
    case "/fred/cad-dollar":
      return { title: "CAD to USD", subtitle: isMobile ? "Exchange Rate" : "Canadian Dollar to USD Exchange Rate" };
    case "/fred/chicago-fed-index":
      return { title: "Chicago Fed Index", subtitle: isMobile ? "Activity Index" : "Chicago Fed National Activity Index" };
    case "/fred/economic-policy-uncertainty":
      return { title: "Policy Uncertainty", subtitle: isMobile ? "Uncertainty" : "US Economic Policy Uncertainty Index" };
    case "/fred/housing-starts":
      return { title: "Housing Starts", subtitle: isMobile ? "Housing" : "US Housing Starts" };
    case "/fred/case-shiller":
      return { title: "Home Price Index", subtitle: isMobile ? "Home Prices" : "Case-Shiller US Home Price Index" };
    case "/fred/nikkei-225":
      return { title: "Nikkei 225", subtitle: isMobile ? "Stock Index" : "Nikkei 225 Index" };
    case "/fred/german-bond-yield":
      return { title: "German Bond Yield", subtitle: isMobile ? "Bond Yield" : "German 10-Year Bond Yield" };
    case "/indicators/btc-yield-recession":
      return { title: "Bitcoin to 10 Year Yield", subtitle: isMobile ? "BTC vs 10 Year" : "Bitcoin Vs 10 year Bond Yield with Recesion Indicator" };
    case "/workbench":
      return { title: "Workbench (beta)", subtitle: isMobile ? "Create your own indicator" : "Create your own indicator from a selection of data" };
    case "/on-chain-historical-risk":
      return { title: "OnChain Risk", subtitle: isMobile ? "Historical Risk" : "Historical Risk Levels of OnChain Indicators" };
    case "/market-overview":
      return { title: "General Market Conditions", subtitle: isMobile ? "Overview" : "Select features of the current market conditions" };
    case "/btc-add-balance":
      return { title: "BTC Account Balance", subtitle: isMobile ? "Discrete BTC Balances" : "Balances of Bitcoin in individual or grouped addresses" };
    case "/total-difference":
      return { title: "Total Cap to Fair Value", subtitle: isMobile ? "Total Cap to Fair Value" : "Total Market Cap to Fair Value Difference" };
    case "/historical-volatility":
      return { title: "Bitcoin Volatility", subtitle: isMobile ? "Historical Volatility" : "Historical Volatility to Predict Changes of Momentum" };
    case "/altcoin-season-index":
      return { title: "Altcoin Season Index", subtitle: isMobile ? "Crypto Seasonality" : "Is it closer to Altcoin Season or Bitcoin Season?" };
    case "/sp500-roi":
      return { title: "S&P500 Return On Investment", subtitle: isMobile ? "Yearly ROI" : "Annualised ROI of the S&P500" };
    case "/sp500unrate":
      return { title: "S&P 500 vs Unemployment", subtitle: isMobile ? "SP500 / Unrate" : "S&P 500 dividend yield squared vs unemployment rate" };
    case "/fred/sahm-recession-indicator":
      return { title: "Sahm Rule", subtitle: isMobile ? "Recession Indicator" : "Recession Indicator" };
    case "/charts":
      return { title: "Charts", subtitle: "All available charts on Cryptological" };
    case "/btc-mvrv-z":
      return { title: "Bitcoin MVRV Z-Score", subtitle: isMobile ? "Identify extreme conditions" : "Demonstrates the relationship between market value and realised value" };
    case "/total2":
      return { title: "Total2", subtitle: "Total Crypto Market Cap Minus BTC" };
    case "/total3":
      return { title: "Total3", subtitle: "Total Crypto Market Cap Minus BTC & ETH" };
    case "/tail-curvature":
      return { title: "Tail Curvature", subtitle: isMobile ? "Asymmetric Quantiles" : "Asymmetric Tail Curvature in Bitcoin Price Quantiles — Cowen (2026)" };
    case "/dynamic-dca":
      return { title: "Dynamic DCA Simulator", subtitle: isMobile ? "Risk & Tx backtesting" : "Compare dynamic DCA vs lump sum using Risk Metric or Tx Tension" };
    default:
      return { title: "CryptoLogical", subtitle: "" };
  }
};