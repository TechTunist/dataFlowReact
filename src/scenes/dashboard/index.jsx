// src/scenes/dashboard/index.js
import { useState, useEffect, useContext, memo } from "react";
import { Box, Card, CardContent, Typography, Grid, useTheme, Snackbar, Alert, Button, IconButton } from "@mui/material";
import { tokens } from "../../theme";
import { Link } from "react-router-dom";
import { DataContext } from "../../DataContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import LazyLoad from "react-lazyload";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import BitcoinPrice from "../../components/BitcoinPrice";
import BitcoinDominance from "../../components/BitcoinDominance";
import TotalMarketCap from "../../components/TotalMarketCap";
import AltcoinPrice from "../../components/AltcoinPrice";
import AltcoinRisk from "../../components/AltcoinRisk";
import StockPrice from "../../components/StockPrice";
import StockRisk from "../../components/StockRisk";
import StockRiskColor from "../../components/StockRiskColor";
import EthereumRisk from "../../components/EthereumRisk";
import EthereumPrice from "../../components/EthereumPrice";
import MarketCycles from "../../components/MarketCycles";
import PiCycleTop from "../../components/PiCycleTop";
import FearAndGreed from "../../components/FearAndGreed";
import BitcoinLogRegression from "../../components/BitcoinLogRegression";
import BitcoinRiskColor from "../../components/BitcoinRiskColor";
import AssetRiskTimeInBands from "../../components/RiskTimeInBands";
import BitcoinROI from "../../components/BitcoinROI";
import Bitcoin20WeekExtension from "../../components/Bitcoin20WeekExtension";
import MarketCapDifference from "../../components/TotalMarketCapDifference";
import RunningROI from "../../components/RunningROI";
import RunningROIRisk from "../../components/RunningROIRisk";
import HistoricalVolatility from "../../components/HistoricalVolatility";
import BitcoinMonthlyReturnsTable from "../../components/MonthlyReturnsTable";
import MonthlyAverageROI from "../../components/MonthlyAverageROI";

import PuellMultiple from "../../components/PuellMultiple";
import BitcoinRisk from "../../components/BitcoinRisk";
import FearAndGreedChart from "../../components/FearAndGreedChart";
import FearAndGreed3D from "../../components/FearAndGreed3D";
import FearAndGreedBinaryChart from "../../components/FearAndGreedBinaryChart";
import BitcoinTransactionFees from "../../components/BitcoinTransactionFees";
import UsInflationChart from "../../components/UsInflation";
import UsInterestChart from "../../components/UsInterest";
import UsCombinedMacroChart from "../../components/UsCombinedMacro";
import UsInitialClaimsChart from "../../components/UsInitialClaims";
import BitcoinTxMvrvChart from "../../components/BitcoinTxMvrv";
import UKUnemploymentChart from "../../components/UKUnemployment";
import UKClaimantCountChart from "../../components/UKClaimantCount";
import UKEarningsChart from "../../components/UKEarnings";
import UKPopulationChart from "../../components/UKPopulation";
import UKWorkforceJobsChart from "../../components/UKWorkforceJobs";
import UKBusinessCountsChart from "../../components/UKBusinessCounts";
import UKJSAByAgeChart from "../../components/UKJSAByAge";
import UKJSAByEthnicityChart from "../../components/UKJSAByEthnicity";
import UKLabourByAgeChart from "../../components/UKLabourByAge";
import UKPublicPrivateChart from "../../components/UKPublicPrivateEmployment";
import UKAPSWorkplaceChart from "../../components/UKApsWorkplace";
import UKEsaClaimantsChart from "../../components/UKEsaClaimants";
import MarketHeatIndex from "../../components/MarketHeatIndex";
import OnChainHistoricalRisk from "../../components/OnChainHistoricalRisk";
import AltcoinSeasonIndexChart from "../../components/AltcoinSeasonIndexChart";
import FredSeriesChart from "../../components/FredSeriesChart";
import WorkbenchChart from "../../components/Workbench";
import SP500ROI from "../../components/SP500ROI";
import BitcoinMvrvZScoreChart from "../../components/BitcoinMvrvZScore";
import Total2Chart from "../../components/Total2Marketcap";
import Total3Chart from "../../components/Total3Marketcap";
import TailCurvature from "../../components/TailCurvature";
import SahmRecessionIndicator from "../../components/SahmRecessionIndicator";

const chartConfig = [
  { id: "bitcoin-20-ext", title: "Bitcoin 20 Week Extension", linkTo: "/btc-20-ext", component: (props) => <Bitcoin20WeekExtension isDashboard={true} {...props} />, description: "Bitcoin price with 20-week extension analysis." },
  { id: "bitcoin-price", title: "Bitcoin Price", linkTo: "/bitcoin", component: (props) => <BitcoinPrice isDashboard={true} {...props} />, description: "A simple chart of the entire bitcoin daily close price history." },
  { id: "bitcoin-fees", title: "Bitcoin Transaction Fees", linkTo: "/bitcoin-fees", component: (props) => <BitcoinTransactionFees isDashboard={true} {...props} />, description: "Bitcoin transaction fees over time." },
  { id: "total-market-cap", title: "Total Crypto Market Cap", linkTo: "/total", component: (props) => <TotalMarketCap isDashboard={true} {...props} />, description: "The market cap of the entire crypto market." },
  { id: "total-difference", title: "Market Cap Difference", linkTo: "/total-difference", component: (props) => <MarketCapDifference isDashboard={true} {...props} />, description: "Difference in market cap across assets." },
  { id: "total2", title: "Total2 Market Cap", linkTo: "/total2", component: (props) => <Total2Chart isDashboard={true} {...props} />, description: "The market cap of the entire crypto market minus Bitcoin." },
  { id: "total3", title: "Total3 Market Cap", linkTo: "/total3", component: (props) => <Total3Chart isDashboard={true} {...props} />, description: "The market cap of the entire crypto market minus Bitcoin & Ethereum." },
  { id: "bitcoin-dominance", title: "Bitcoin Dominance", linkTo: "/bitcoin-dominance", component: (props) => <BitcoinDominance isDashboard={true} {...props} />, description: "Bitcoin Dominance chart over all crypto assets." },
  { id: "bitcoin-roi", title: "Bitcoin ROI", linkTo: "/bitcoin-roi", component: (props) => <BitcoinROI isDashboard={true} {...props} />, description: "Annualised ROI for Bitcoin." },
  { id: "running-roi", title: "Running ROI", linkTo: "/running-roi", component: (props) => <RunningROI isDashboard={true} {...props} />, description: "Running return on investment for Bitcoin." },
  { id: "historical-volatility", title: "Historical Volatility", linkTo: "/historical-volatility", component: (props) => <HistoricalVolatility isDashboard={true} {...props} />, description: "Historical volatility of Bitcoin." },
  { id: "monthly-returns", title: "Bitcoin Monthly Returns", linkTo: "/monthly-returns", component: (props) => <BitcoinMonthlyReturnsTable isDashboard={true} {...props} />, description: "Monthly returns for Bitcoin." },
  { id: "monthly-average-roi", title: "Monthly Average ROI", linkTo: "/monthly-average-roi", component: (props) => <MonthlyAverageROI isDashboard={true} {...props} />, description: "Average monthly ROI for Bitcoin." },

  { id: "ethereum-price", title: "Ethereum Price", linkTo: "/ethereum", component: (props) => <EthereumPrice isDashboard={true} {...props} />, description: "A simple chart of the entire Ethereum daily close price history." },
  { id: "puell-multiple", title: "Puell Multiple", linkTo: "/puell-multiple", component: (props) => <PuellMultiple isDashboard={true} {...props} />, description: "Puell Multiple indicator for Bitcoin mining." },
  { id: "mvrv-zscore", title: "Bitcoin Mvrv Z-Score", linkTo: "/btc-mvrv-z", component: (props) => <BitcoinMvrvZScoreChart isDashboard={true} {...props} />, description: "Pick out extremes between the market value and realised value of Bitcoin." },
  { id: "bitcoin-risk", title: "Bitcoin Risk Metric", linkTo: "/risk", component: (props) => <BitcoinRisk isDashboard={true} {...props} />, description: "The risk metric demonstrates the risk of holding bitcoin." },
  { id: "ethereum-risk", title: "Ethereum Risk Metric", linkTo: "/risk-eth", component: (props) => <EthereumRisk isDashboard={true} {...props} />, description: "The risk metric demonstrates the risk of holding Eth." },
  { id: "pi-cycle-top", title: "PiCycle Top Indicator", linkTo: "/pi-cycle", component: (props) => <PiCycleTop isDashboard={true} {...props} />, description: "The PiCycle Top Indicator for Bitcoin market tops." },
  { id: "fear-and-greed", title: "Fear and Greed Indicator", linkTo: "/fear-and-greed", component: (props) => <FearAndGreed isDashboard={true} {...props} />, description: "The Fear and Greed index measures market sentiment." },
  { id: "logarithmic-regression", title: "Bitcoin Logarithmic Regression", linkTo: "/logarithmic-regression", component: (props) => <BitcoinLogRegression isDashboard={true} {...props} />, description: "Logarithmic Regression trend lines for Bitcoin." },
  { id: "risk-color", title: "Risk Colour Chart", linkTo: "/risk-color", component: (props) => <BitcoinRiskColor isDashboard={true} {...props} />, description: "Colour coded bitcoin risk levels." },
  { id: "risk-bands", title: "Time Spent in Risk Bands", linkTo: "/risk-bands", component: (props) => <AssetRiskTimeInBands isDashboard={true} {...props} />, description: "Time spent in each defined Bitcoin risk band." },
  { id: "running-roi-risk", title: "Running ROI Risk", linkTo: "/running-roi-risk", component: (props) => <RunningROIRisk isDashboard={true} {...props} />, description: "1-year running ROI with raw and linearly scaled 0–1 buy/sell signal zones." },
  { id: "altcoin-price", title: "Altcoin Charts", linkTo: "/altcoin-price", component: (props) => <AltcoinPrice isDashboard={true} {...props} />, description: "Simple price chart for a selection of altcoins." },
  { id: "altcoin-risk", title: "Altcoin Risk", linkTo: "/altcoin-risk", component: (props) => <AltcoinRisk isDashboard={true} {...props} />, description: "Risk metrics for altcoins." },
  { id: "stocks", title: "Stock Selector", linkTo: "/stocks", component: (props) => <StockPrice isDashboard={true} defaultSelectedCoin="TSLA" {...props} />, description: "Daily stock prices with technical indicators — mega-cap, crypto-adjacent, benchmarks, and retail sentiment groups." },
  { id: "stock-risk", title: "Stock Risk", linkTo: "/stock-risk", component: (props) => <StockRisk isDashboard={true} {...props} />, description: "Equity risk metric (200-day MA + rolling 5-year percentile) with USD or BTC denomination." },
  { id: "stock-risk-color", title: "Stock Risk Colour", linkTo: "/stock-risk-color", component: (props) => <StockRiskColor isDashboard={true} {...props} />, description: "Colorized stock price by risk band — compare crypto-adjacent names vs benchmarks." },
  { id: "market-cycles", title: "Bitcoin Market Cycles", linkTo: "/market-cycles", component: (props) => <MarketCycles isDashboard={true} {...props} />, description: "Compare previous crypto market cycles." },
  { id: "fear-and-greed-chart", title: "Fear and Greed Chart", linkTo: "/fear-and-greed-chart", component: (props) => <FearAndGreedChart isDashboard={true} {...props} />, description: "Chart of Fear and Greed index over time." },
  { id: "fear-and-greed-3d", title: "Fear and Greed 3D", linkTo: "/fear-and-greed-3d", component: (props) => <FearAndGreed3D isDashboard={true} {...props} />, description: "3D visualization of Fear and Greed." },
  { id: "fear-and-greed-binary", title: "Fear and Greed Binary", linkTo: "/fear-and-greed-binary-chart", component: (props) => <FearAndGreedBinaryChart isDashboard={true} {...props} />, description: "Binary Fear and Greed states over time." },
  { id: "us-inflation", title: "US Inflation", linkTo: "/us-inflation", component: (props) => <UsInflationChart isDashboard={true} {...props} />, description: "US inflation rates over time." },
  { id: "us-interest", title: "US Interest Rates", linkTo: "/us-interest", component: (props) => <UsInterestChart isDashboard={true} {...props} />, description: "US interest rates over time." },
  { id: "us-combined-macro", title: "US Combined Macro", linkTo: "/us-combined-macro", component: (props) => <UsCombinedMacroChart isDashboard={true} {...props} />, description: "Combined US macroeconomic indicators." },
  { id: "us-initial-claims", title: "US Initial Claims", linkTo: "/us-initial-claims", component: (props) => <UsInitialClaimsChart isDashboard={true} {...props} />, description: "US initial jobless claims." },
  { id: "uk-unemployment", title: "UK Unemployment (LFS)", linkTo: "/uk-unemployment", component: (props) => <UKUnemploymentChart isDashboard={true} {...props} />, description: "Official UK unemployment & employment rates (broad LFS measure). A key signal of whether the UK jobs market is healthy or under pressure — important real-world context for risk sentiment." },
  { id: "uk-claimants", title: "UK Claimant Count", linkTo: "/uk-claimants", component: (props) => <UKClaimantCountChart isDashboard={true} {...props} />, description: "Fast monthly % of people claiming unemployment benefits. A timely early warning of labour market stress (like US jobless claims)." },
  { id: "uk-earnings", title: "UK Earnings (ASHE)", linkTo: "/uk-earnings", component: (props) => <UKEarningsChart isDashboard={true} {...props} />, description: "Median weekly pay in the UK by gender. Tracks wage growth and ordinary household income strength." },
  { id: "uk-population", title: "UK Population Estimates", linkTo: "/uk-population", component: (props) => <UKPopulationChart isDashboard={true} {...props} />, description: "UK population size and gender split. Long-term foundation for labour supply, consumers and economic scale." },
  { id: "uk-workforce-jobs", title: "UK Workforce Jobs", linkTo: "/uk-workforce-jobs", component: (props) => <UKWorkforceJobsChart isDashboard={true} {...props} />, description: "Total jobs in the UK economy. Direct read on employment levels and whether the economy is creating work." },
  { id: "uk-business-counts", title: "UK Business Counts", linkTo: "/uk-business-counts", component: (props) => <UKBusinessCountsChart isDashboard={true} {...props} />, description: "Number of UK businesses. Indicator of entrepreneurship, company formation and private-sector health." },
  { id: "uk-jsa-age", title: "UK JSA by Age/Duration", linkTo: "/uk-jsa-age", component: (props) => <UKJSAByAgeChart isDashboard={true} {...props} />, description: "Unemployment benefit claimants split by age and how long they have been claiming. Shows who is hit hardest and whether problems are becoming entrenched." },
  { id: "uk-jsa-ethnicity", title: "UK JSA by Ethnicity", linkTo: "/uk-jsa-ethnicity", component: (props) => <UKJSAByEthnicityChart isDashboard={true} {...props} />, description: "Claimants broken down by ethnic group. Reveals whether labour market pain is evenly spread or concentrated in particular communities." },
  { id: "uk-labour-by-age", title: "UK Labour by Age", linkTo: "/uk-labour-by-age", component: (props) => <UKLabourByAgeChart isDashboard={true} {...props} />, description: "Employment, unemployment and inactivity rates by age band. Shows how different generations are faring in the jobs market." },
  { id: "uk-public-private", title: "UK Public/Private Employment", linkTo: "/uk-public-private", component: (props) => <UKPublicPrivateChart isDashboard={true} {...props} />, description: "UK employment levels (public vs private proxy). Core measure of overall labour market strength and economic activity." },
  { id: "uk-aps-workplace", title: "UK APS Workplace", linkTo: "/uk-aps-workplace", component: (props) => <UKAPSWorkplaceChart isDashboard={true} {...props} />, description: "Workplace-based employment counts. Complements residence-based views and shows where jobs are actually located." },
  { id: "uk-esa-claimants", title: "UK ESA Claimants", linkTo: "/uk-esa-claimants", component: (props) => <UKEsaClaimantsChart isDashboard={true} {...props} />, description: "People on disability/illness-related benefits (ESA proxy). Signals health-related labour market exclusion and broader economic hardship." },
  { id: "tx-mvrv", title: "Bitcoin Transaction MVRV", linkTo: "/tx-mvrv", component: (props) => <BitcoinTxMvrvChart isDashboard={true} {...props} />, description: "Bitcoin MVRV ratio for transactions." },
  { id: "on-chain-historical-risk", title: "On-Chain Historical Risk", linkTo: "/on-chain-historical-risk", component: (props) => <OnChainHistoricalRisk isDashboard={true} {...props} />, description: "Historical risk based on on-chain data." },
  { id: "altcoin-season-index", title: "Altcoin Season Index", linkTo: "/altcoin-season-index", component: (props) => <AltcoinSeasonIndexChart isDashboard={true} {...props} />, description: "Index indicating altcoin season trends." },
  { id: "market-heat-index", title: "Market Heat Index", linkTo: "/market-heat-index", component: (props) => <MarketHeatIndex isDashboard={true} {...props} />, description: "Interactive Market Heat Index with tunable weights for MVRV, Mayer, Risk, F&G, PiCycle, AltSeason factors." },
  { id: "fred-fed-funds-rate", title: "Federal Funds Rate", linkTo: "/fred/fed-funds-rate", component: (props) => <FredSeriesChart isDashboard={true} seriesId="DFF" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(2)}%`} {...props} />, description: "Daily Effective Federal Funds Rate in the US." },
  { id: "fred-sp500", title: "S&P 500 Index", linkTo: "/fred/sp500", component: (props) => <FredSeriesChart isDashboard={true} seriesId="SP500" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} enableTechnicalIndicators={true} {...props} />, description: "Daily closing values of the S&P 500 Index." },
  { id: "fred-recession-indicator", title: "US Recession Indicator", linkTo: "/fred/recession-indicator", component: (props) => <FredSeriesChart isDashboard={true} seriesId="USRECD" chartType="histogram" valueFormatter={(value) => (value === 1 ? "Recession" : "No Recession")} defaultScaleMode={0} {...props} />, description: "Periods of recession in the US." },
  { id: "fred-cpi", title: "US Consumer Price Index", linkTo: "/fred/cpi", component: (props) => <FredSeriesChart isDashboard={true} seriesId="CPIAUCSL" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Consumer Price Index for All Urban Consumers." },
  { id: "fred-unemployment-rate", title: "US Unemployment Rate", linkTo: "/fred/unemployment-rate", component: (props) => <FredSeriesChart isDashboard={true} seriesId="UNRATE" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(1)}%`} {...props} />, description: "Monthly US unemployment rate." },
  { id: "fred-10-year-treasury", title: "10-Year Treasury Yield", linkTo: "/fred/10-year-treasury", component: (props) => <FredSeriesChart isDashboard={true} seriesId="DGS10" enableTechnicalIndicators={true} chartType="line" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(2)}%`} {...props} />, description: "Daily 10-Year Treasury Note yield." },
  { id: "fred-10y-2y-spread", title: "10Y-2Y Treasury Spread", linkTo: "/fred/10y-2y-spread", component: (props) => <FredSeriesChart isDashboard={true} seriesId="T10Y2Y" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(2)}%`} {...props} />, description: "Spread between 10-Year and 2-Year Treasury yields." },
  { id: "fred-5y-inflation-expectation", title: "5-Year Inflation Expectation", linkTo: "/fred/5y-inflation-expectation", component: (props) => <FredSeriesChart isDashboard={true} seriesId="T5YIE" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(2)}%`} {...props} />, description: "Market's expected average annual inflation rate over 5 years." },
  { id: "fred-euro-dollar", title: "Euro to US Dollar", linkTo: "/fred/euro-dollar", component: (props) => <FredSeriesChart isDashboard={true} seriesId="DEXUSEU" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => value.toFixed(4)} {...props} />, description: "Daily exchange rate of Euro to US Dollar." },
  { id: "fred-crude-oil", title: "WTI Crude Oil Price", linkTo: "/fred/crude-oil", component: (props) => <FredSeriesChart isDashboard={true} seriesId="DCOILWTICO" enableTechnicalIndicators={true} chartType="area" scaleMode="logarithmic" valueFormatter={(value) => `$${value.toFixed(2)}`} {...props} />, description: "Daily West Texas Intermediate crude oil price." },
  { id: "fred-producer-price", title: "Producer Price Index", linkTo: "/fred/producer-price", component: (props) => <FredSeriesChart isDashboard={true} seriesId="PPIACO" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Monthly Producer Price Index for All Commodities." },
  { id: "fred-nonfarm-payrolls", title: "Nonfarm Payrolls", linkTo: "/fred/nonfarm-payrolls", component: (props) => <FredSeriesChart isDashboard={true} seriesId="PAYEMS" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Monthly total nonfarm payroll employment in the US." },
  { id: "fred-gdp", title: "US Real GDP", linkTo: "/fred/gdp", component: (props) => <FredSeriesChart isDashboard={true} seriesId="GDPC1" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Quarterly Real Gross Domestic Product in the US." },
  { id: "fred-gdp-growth", title: "US Real GDP Growth", linkTo: "/fred/gdp-growth", component: (props) => <FredSeriesChart isDashboard={true} seriesId="A191RL1Q225SBEA" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(2)}%`} {...props} />, description: "Quarterly Real GDP growth rate in the US." },
  { id: "fred-m1-money-supply", title: "M1 Money Supply", linkTo: "/fred/m1-money-supply", component: (props) => <FredSeriesChart isDashboard={true} seriesId="M1SL" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Monthly M1 money supply in the US." },
  { id: "fred-m2-money-supply", title: "M2 Money Supply", linkTo: "/fred/m2-money-supply", component: (props) => <FredSeriesChart isDashboard={true} seriesId="M2SL" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Monthly M2 money supply in the US." },
  { id: "fred-consumer-sentiment", title: "Consumer Sentiment", linkTo: "/fred/consumer-sentiment", component: (props) => <FredSeriesChart isDashboard={true} seriesId="UMCSENT" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Monthly University of Michigan Consumer Sentiment Index." },
  { id: "fred-vix", title: "VIX Volatility Index", linkTo: "/fred/vix", component: (props) => <FredSeriesChart isDashboard={true} seriesId="VIXCLS" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toFixed(2)} {...props} />, description: "Daily CBOE Volatility Index (VIX)." },
  { id: "fred-ted-spread", title: "TED Spread", linkTo: "/fred/ted-spread", component: (props) => <FredSeriesChart isDashboard={true} seriesId="TEDRATE" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(2)}%`} {...props} />, description: "Daily TED Spread between LIBOR and T-Bill rates." },
  { id: "fred-yen-dollar", title: "Yen to US Dollar", linkTo: "/fred/yen-dollar", component: (props) => <FredSeriesChart isDashboard={true} seriesId="DEXJPUS" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => value.toFixed(2)} {...props} />, description: "Daily exchange rate of Japanese Yen to US Dollar." },
  { id: "fred-pound-dollar", title: "Pound to US Dollar", linkTo: "/fred/pound-dollar", component: (props) => <FredSeriesChart isDashboard={true} seriesId="DEXUSUK" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => value.toFixed(4)} {...props} />, description: "Daily exchange rate of British Pound to US Dollar." },
  { id: "fred-cad-dollar", title: "CAD to US Dollar", linkTo: "/fred/cad-dollar", component: (props) => <FredSeriesChart isDashboard={true} seriesId="DEXCAUS" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => value.toFixed(4)} {...props} />, description: "Daily exchange rate of Canadian Dollar to US Dollar." },
  { id: "fred-chicago-fed-index", title: "Chicago Fed Index", linkTo: "/fred/chicago-fed-index", component: (props) => <FredSeriesChart isDashboard={true} seriesId="CFNAI" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toFixed(2)} {...props} />, description: "Monthly Chicago Fed National Activity Index." },
  { id: "fred-economic-policy-uncertainty", title: "Economic Policy Uncertainty", linkTo: "/fred/economic-policy-uncertainty", component: (props) => <FredSeriesChart isDashboard={true} seriesId="USEPUINDXD" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Daily US Economic Policy Uncertainty Index." },
  { id: "fred-housing-starts", title: "US Housing Starts", linkTo: "/fred/housing-starts", component: (props) => <FredSeriesChart isDashboard={true} seriesId="HOUST" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Monthly US Housing Starts." },
  { id: "fred-case-shiller", title: "Case-Shiller Home Price Index", linkTo: "/fred/case-shiller", component: (props) => <FredSeriesChart isDashboard={true} seriesId="CSUSHPINSA" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Monthly S&P/Case-Shiller US Home Price Index." },
  { id: "fred-nikkei-225", title: "Nikkei 225 Index", linkTo: "/fred/nikkei-225", component: (props) => <FredSeriesChart isDashboard={true} seriesId="NIKKEI225" chartType="area" scaleMode="logarithmic" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Stock market index for the 225 companies listed on the Tokyo stock exchange (TSE)." },
  { id: "fred-german-bond-yield", title: "German 10-Year Bond Yield", linkTo: "/fred/german-bond-yield", component: (props) => <FredSeriesChart isDashboard={true} seriesId="IRLTLT01DEM156N" chartType="line" scaleMode="logarithmic" valueFormatter={(value) => `${value.toFixed(2)}%`} {...props} />, description: "Monthly German 10-Year Government Bond Yield." },
  { id: "workbench", title: "Workbench Chart", linkTo: "/workbench", component: (props) => <WorkbenchChart isDashboard={true} seriesId="UMCSENT" chartType="area" valueFormatter={(value) => value.toLocaleString()} {...props} />, description: "Custom indicator chart for comparing data series." },
  { id: "sp500-roi", title: "S&P 500 ROI", linkTo: "/sp500-roi", component: (props) => <SP500ROI isDashboard={true} {...props} />, description: "Annualised ROI of the S&P 500." },
  { id: "tail-curvature", title: "Tail Curvature", linkTo: "/tail-curvature", component: (props) => <TailCurvature isDashboard={true} {...props} />, description: "Asymmetric Tail Curvature Quantile Model (Cowen 2026) — includes golden pocket / dislocation quantiles below 1%." },
  { id: "sahm-recession-indicator", title: "Sahm Recession Indicator", linkTo: "/fred/sahm-recession-indicator", component: (props) => <SahmRecessionIndicator isDashboard={true} {...props} />, description: "Sahm Rule recession indicator based on unemployment rate changes." },
];

const DashboardCard = memo(({ title, component, description, linkTo, chartId, isMobile, chartsVisible, colors, isFavorite, toggleFavorite }) => {
  const theme = useTheme();
  const wideMobile = theme.breakpoints.between('sm', 'lg');

  const dashboardStyles = {
    card: {
      aspectRatio: "4 / 3",
      minHeight: isMobile ? (wideMobile ? "400px" : "350px") : "400px",
      maxHeight: isMobile ? "550px" : "650px",
      display: "flex",
      flexDirection: "column",
      transition: "box-shadow 0.3s ease",
      width: "100%",
      position: "relative", // Added to support absolute positioning of IconButton
    },
    cardContent: {
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },
    chartContainer: {
      flex: 1,
      minHeight: isMobile ? (wideMobile ? "310px" : "260px") : "310px",
      marginTop: "10px",
      marginBottom: "10px",
    },
    infoText: {
      marginTop: "auto",
      fontSize: "0.875rem",
    },
  };

  const ChartPlaceholder = () => (
    <Box
      height="400px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      m="10px 0 0 0"
    >
      <Typography variant="h5" color={colors.grey[100]}>
        Close the sidebar to view the chart.
      </Typography>
    </Box>
  );

  return (
    <Grid item xs={12} lg={6}>
      <LazyLoad height={550} offset={100}>
        <Box sx={{ position: "relative" }}> {/* Wrapper for card and button */}
          <Link to={linkTo} style={{ textDecoration: "none" }}>
            <Card
              sx={{
                ...dashboardStyles.card,
                backgroundColor: colors.primary[500],
                border: `1px solid ${colors.greenAccent[500]}`,
                '&:hover': {
                  boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                  cursor: 'pointer',
                },
              }}
            >
              <CardContent sx={dashboardStyles.cardContent}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                    sx={{ maxWidth: 'calc(100% - 50px)' }}
                  >
                    {title}
                  </Typography>
                  {/* IconButton moved outside Link */}
                </Box>
                <Box sx={dashboardStyles.chartContainer}>
                  {chartsVisible ? component : <ChartPlaceholder />}
                </Box>
                <Typography
                  variant="body3"
                  color="textSecondary"
                  className="dashboard-info"
                  sx={dashboardStyles.infoText}
                >
                  {description}
                </Typography>
              </CardContent>
            </Card>
          </Link>
          <IconButton
            onClick={(e) => {
              e.stopPropagation(); // Kept as a safeguard
              toggleFavorite(chartId);
            }}
            sx={{
              color: isFavorite ? colors.greenAccent[500] : colors.grey[100],
              fontSize: '1.5rem',
              padding: '8px',
              width: '40px',
              height: '40px',
              position: 'absolute',
              top: '10px',
              right: '10px',
              '&:hover': {
                backgroundColor: colors.primary[700],
              },
            }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? <StarIcon fontSize="inherit" /> : <StarBorderIcon fontSize="inherit" />}
          </IconButton>
        </Box>
      </LazyLoad>
    </Grid>
  );
});

const Dashboard = memo(({ isMobile, isSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [chartsVisible, setChartsVisible] = useState(!isMobile || !isSidebar);
  const { btcData, ethData, riskData, marketCapData } = useContext(DataContext);
  const { favoriteCharts, addFavoriteChart, removeFavoriteChart, error, clearError } = useFavorites();

  useEffect(() => {
    if (!isMobile) {
      setChartsVisible(true);
      return;
    }

    if (isSidebar) {
      setChartsVisible(false);
    } else {
      const timer = setTimeout(() => {
        setChartsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isSidebar]);

  const toggleFavorite = (chartId) => {
    if (favoriteCharts.includes(chartId)) {
      removeFavoriteChart(chartId);
    } else {
      addFavoriteChart(chartId);
    }
  };

  const handleSnackbarClose = () => {
    clearError();
  };

  return (
    <Box m="20px">
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'right' }}
      >
        <Alert
          severity="error"
          action={
            error.includes('Max 1 chart') && (
              <Button
                color="inherit"
                size="small"
                component={Link}
                to="/subscription"
              >
                Upgrade Plan
              </Button>
            )
          }
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
      {favoriteCharts.length === 0 ? (
        <Box textAlign="center">
          <Typography variant="h5" color={colors.grey[100]} mb={2}>
            To populate your dashboard, use the sidebar to find your favourite charts and click the star in the top right corner.
          </Typography>
          <Link to="/charts" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                '&:hover': {
                  backgroundColor: colors.greenAccent[700],
                  color: colors.grey[100],
                },
              }}
            >
              Browse Charts Here
            </Button>
          </Link>

          {/* MODERN AGENT: free charts polish - surface free tier explicitly in dashboard (for users who haven't favorited yet).
              These match items from the "Free Charts" section in ChartsThumbnails + chartConfig ids (cross-ref: total-market-cap, bitcoin-dominance, logarithmic-regression, fear-and-greed, risk-bands, us-inflation etc).
              Always visible here promotes free tier value; no gating change (these routes are non-requirePaid).
              See also enhanced badges in /charts page. */}
          <Box mt={4}>
            <Typography variant="h6" color={colors.grey[100]} mb={1}>
              Free tier highlights (no subscription required):
            </Typography>
            <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1}>
              {[
                { id: 'total-market-cap', label: 'Total Market Cap' },
                { id: 'bitcoin-dominance', label: 'Bitcoin Dominance' },
                { id: 'logarithmic-regression', label: 'Log Regression' },
                { id: 'fear-and-greed', label: 'Fear & Greed' },
                { id: 'risk-bands', label: 'Risk Bands' },
                { id: 'us-inflation', label: 'US Inflation' },
              ].map(f => (
                <Button key={f.id} component={Link} to={chartConfig.find(c => c.id === f.id)?.linkTo || '/charts'} size="small" variant="outlined" sx={{ borderColor: colors.greenAccent[500], color: colors.greenAccent[500] }}>
                  {f.label} <Box component="span" sx={{ ml: 0.5, fontSize: '0.7em', bgcolor: colors.greenAccent[500], color: colors.grey[900], px: 0.5, borderRadius: 0.5 }}>FREE</Box>
                </Button>
              ))}
            </Box>
            <Typography variant="caption" color={colors.grey[400]}>More free charts on the Charts page (public access)</Typography>
          </Box>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {favoriteCharts
            .map((chartId) => chartConfig.find((chart) => chart.id === chartId))
            .filter((chart) => chart)
            .map(({ id, title, component, description, linkTo }) => (
              <DashboardCard
                key={id}
                chartId={id}
                title={title}
                component={component({ btcData, ethData, riskData, marketCapData })}
                description={description}
                linkTo={linkTo}
                isMobile={isMobile}
                chartsVisible={chartsVisible}
                colors={colors}
                isFavorite={favoriteCharts.includes(id)}
                toggleFavorite={toggleFavorite}
              />
            ))}
        </Grid>
      )}
    </Box>
  );
});

export default Dashboard;