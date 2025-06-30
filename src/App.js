// src/App.js
import { useState, useEffect, createContext, memo } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import BasicChart from "./scenes/ChartTemplates/BasicChart";
import Dashboard from "./scenes/dashboard";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import BitcoinPrice from "./components/BitcoinPrice";
import TotalMarketCap from "./components/TotalMarketCap";
import MarketCapDifference from "./components/TotalMarketCapDifference";
import BitcoinTransactionFees from "./components/BitcoinTransactionFees";
import BitcoinDominance from "./components/BitcoinDominance";
import Risk from "./components/BitcoinRisk";
import EthereumPrice from "./components/EthereumPrice";
import EthereumRisk from "./components/EthereumRisk";
import PiCycleTop from "./components/PiCycleTop";
import FearAndGreed from "./components/FearAndGreed";
import BitcoinLogRegression from "./components/BitcoinLogRegression";
import BitcoinRiskColor from "./components/BitcoinRiskColor";
import AssetRiskBandDuration from "./components/RiskTimeInBands";
import AltcoinPrice from "./components/AltcoinPrice";
import AltcoinRisk from "./components/AltcoinRisk";
import MarketCycles from "./components/MarketCycles";
import FearAndGreedChart from "./components/FearAndGreedChart";
import UsInflationChart from "./components/UsInflation";
import UsUnemploymentChart from "./components/UsUnemployment";
import UsInterestChart from "./components/UsInterest";
import UsInitialClaimsChart from "./components/UsInitialClaims";
import UsCombinedMacroChart from "./components/UsCombinedMacro";
import SplashPage from "./scenes/splash";
import About from "./scenes/About";
import LoginSignup from "./scenes/LoginSignup";
import useIsMobile from "./hooks/useIsMobile";
import BitcoinROI from "./components/BitcoinROI";
import BitcoinTxCountChart from "./components/BitcoinTxCount";
import TxCombinedChart from "./components/TxMacroCombined";
import BitcoinTxMvrvChart from "./components/BitcoinTxMvrv";
import FredSeriesChart from "./components/FredSeriesChart";
import Bitcoin10YearChart from "./components/Bitcoin10YearRecession";
import WorkbenchChart from "./components/Workbench";
import OnChainHistoricalRisk from "./components/OnChainHistoricalRisk";
import TestAPI from "./components/TestAPI";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePassword from "./scenes/ChangePassword";
import Profile from "./scenes/Profile";
import Settings from "./scenes/Settings";
import AccountNavBar from "./scenes/global/AccountNavBar";
import Subscription from "./scenes/Subscription";
import { loadStripe } from '@stripe/stripe-js';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import FearAndGreedBinaryChart from "./components/FearAndGreedBinaryChart"; 
import { FearAndGreedBinaryProvider } from "./FearAndGreedBinaryContext";
import MarketOverview from "./scenes/MarketOverview";
import { useMemo } from "react";
import FearAndGreed3D from "./components/FearAndGreed3D";
import BitcoinAddressBalancesChart from "./components/BitcoinAddressBalance";
import RunningROI from "./components/RunningROI";
import BitcoinMonthlyReturnsTable from "./components/MonthlyReturnsTable";
import MonthlyAverageROI from "./components/MonthlyAverageROI";
import Bitcoin20WeekExtension from "./components/Bitcoin20WeekExtension";
import HistoricalVolatility from "./components/HistoricalVolatility";
import PuellMultiple from "./components/PuellMultiple";
import AltcoinSeasonIndexChart from "./components/AltcoinSeasonIndexChart";
import { FavoritesProvider } from './contexts/FavoritesContext';
import Charts from "./components/ChartsThumbnails";

// Stripe Context
const StripeContext = createContext(null);

const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  throw new Error("Missing Stripe Publishable Key");
}

const PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// New AuthWrapper to isolate useAuth and useUser
const AuthWrapper = memo(() => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Redirect to splash if not signed in and trying to access a protected route
  if (!isSignedIn && location.pathname !== "/splash" && location.pathname !== "/login-signup") {
    return <Navigate to="/splash" replace state={{ from: location }} />;
  }

  return <AppContent isSignedIn={isSignedIn} user={user} />;
});

const AppContent = memo(({ isSignedIn, user }) => {
  const [theme, colorMode] = useMode();
  const isMobile = useIsMobile();
  const [isSidebar, setIsSidebar] = useState(!isMobile);
  const location = useLocation();
  const isDashboardTopbar = location.pathname === "/dashboard";
  const isSplashPage = location.pathname === "/splash";
  const isLoginSignupPage = location.pathname === "/login-signup";

  // Memoize theme and colorMode to prevent unnecessary updates
  const memoizedTheme = useMemo(() => theme, [theme]);
  const memoizedColorMode = useMemo(() => colorMode, [colorMode]);

  // Initialize stripePromise and handle loading/error states
  const [stripe, setStripe] = useState(null);
  const [stripeError, setStripeError] = useState(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripeInstance = await loadStripe(stripePublishableKey);
        setStripe(stripeInstance);
      } catch (error) {
        setStripeError(error.message);
      }
    };
    initializeStripe();
  }, []);

  useEffect(() => {
    setIsSidebar(!isMobile);
  }, [isMobile]);

  // Determine if sidebar and topbar should be rendered
  const userMenuRoutes = ["/profile", "/subscription", "/settings", "/change-password"];
  const isUserMenuPage = userMenuRoutes.includes(location.pathname);
  const shouldRenderTopbarAndSidebar = isSignedIn && !isSplashPage && !isLoginSignupPage && !isUserMenuPage;

  // Display Stripe initialization error if present
  if (stripeError) {
    return <div>Error loading Stripe: {stripeError}</div>;
  }

  return (
    <StripeContext.Provider value={stripe}>
      <ColorModeContext.Provider value={memoizedColorMode}>
        <ThemeProvider theme={memoizedTheme}>
          <SubscriptionProvider user={user} isSignedIn={isSignedIn}>
            <FavoritesProvider user={user} isSignedIn={isSignedIn}>
            <CssBaseline />
            <div className="app" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              {/* Render Topbar or AccountNavBar only if signed in */}
              {shouldRenderTopbarAndSidebar && (
                <Topbar
                  setIsSidebar={setIsSidebar}
                  isSidebar={isSidebar}
                  isDashboardTopbar={isDashboardTopbar}
                />
              )}
              {isSignedIn && isUserMenuPage && <AccountNavBar />}

              <div style={{ display: "flex", flex: 1 }}>
                {/* Render Sidebar only if signed in */}
                {shouldRenderTopbarAndSidebar && (
                  <div
                    className="sidebar"
                    style={{
                      position: isMobile ? "fixed" : "sticky",
                      top: 0,
                      zIndex: 1100,
                      width: isMobile ? (isSidebar ? "270px" : "0") : "270px",
                    }}
                  >
                    <Sidebar isSidebar={isSidebar} setIsSidebar={setIsSidebar} />
                  </div>
                )}

                <main className="content" style={{ flex: 1 }}>
                  {/* Adjust spacing for Topbar or AccountNavBar */}
                  {shouldRenderTopbarAndSidebar && (
                    <div style={{ height: isMobile ? "65px" : "85px" }} />
                  )}
                  {isSignedIn && isUserMenuPage && <div style={{ height: "65px" }} />}
                  <Routes>
                    {/* Public routes */}
                    <Route path="/splash" element={<SplashPage />} />
                    <Route path="/login-signup" element={<LoginSignup />} />

                    {/* thumbnails of all charts */}
                    <Route path="/charts" element={<Charts />} />

                    {/* Protected routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard isMobile={isMobile} isSidebar={isSidebar} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/about"
                      element={
                        <ProtectedRoute>
                          <About />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/subscription"
                      element={
                        <ProtectedRoute>
                          <Subscription />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/change-password"
                      element={
                        <ProtectedRoute>
                          <ChangePassword />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/btc-20-ext"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={Bitcoin20WeekExtension} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bitcoin"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinPrice} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/total"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={TotalMarketCap} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/total-difference"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={MarketCapDifference} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bitcoin-fees"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinTransactionFees} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bitcoin-dominance"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinDominance} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/market-overview"
                      element={
                        <ProtectedRoute>
                          <MarketOverview />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bitcoin-roi"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinROI} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/running-roi"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={RunningROI} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/historical-volatility"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={HistoricalVolatility} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/monthly-returns"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinMonthlyReturnsTable} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/monthly-average-roi"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={MonthlyAverageROI} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/btc-add-balance"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinAddressBalancesChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ethereum"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={EthereumPrice} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/puell-multiple"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={PuellMultiple} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/risk"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={Risk} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/risk-eth"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={EthereumRisk} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pi-cycle"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={PiCycleTop} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fear-and-greed"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={FearAndGreed} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fear-and-greed-3d"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={FearAndGreed3D} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/logarithmic-regression"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinLogRegression} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/risk-color"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinRiskColor} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/risk-bands"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={AssetRiskBandDuration} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/altcoin-price"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={AltcoinPrice} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/altcoin-risk"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={AltcoinRisk} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/market-cycles"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={MarketCycles} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fear-and-greed-chart"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={FearAndGreedChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fear-and-greed-binary-chart"
                      element={
                        <ProtectedRoute>
                          <FearAndGreedBinaryProvider>
                            <BasicChart ChartComponent={FearAndGreedBinaryChart} />
                          </FearAndGreedBinaryProvider>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/us-inflation"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={UsInflationChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/us-unemployment"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={UsUnemploymentChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/us-interest"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={UsInterestChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/us-combined-macro"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={UsCombinedMacroChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/us-initial-claims"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={UsInitialClaimsChart} />
                        </ProtectedRoute>
                      }
                    />
                    {/* <Route
                      path="/tx-combined"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={TxCombinedChart} />
                        </ProtectedRoute>
                      }
                    /> */}
                    <Route
                      path="/tx-mvrv"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={BitcoinTxMvrvChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/on-chain-historical-risk"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={OnChainHistoricalRisk} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/altcoin-season-index"
                      element={
                        <ProtectedRoute>
                          <BasicChart ChartComponent={AltcoinSeasonIndexChart} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/fed-funds-rate"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DFF"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={(value) => `${value.toFixed(2)}%`}
                            explanation="This chart shows the daily Effective Federal Funds Rate in the United States, set by the Federal Reserve."
                            showSP500Overlay={true}
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/sp500"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="SP500"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="This chart displays the daily closing values of the S&P 500 Index."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/recession-indicator"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="USRECD"
                            chartType="histogram"
                            valueFormatter={(value) => (value === 1 ? "Recession" : "No Recession")}
                            explanation="This chart indicates periods of recession in the US."
                            defaultScaleMode={0}
                            showSP500Overlay={true}
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/cpi"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="CPIAUCSL"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The Consumer Price Index (CPI) for All Urban Consumers, often referred to as CPI-U, is a widely used economic indicator that measures the average change over time in the prices paid by urban consumers for a market basket of goods and services. These include essentials like food, housing, transportation, medical care, clothing, and recreation, among others. The CPI is calculated by the U.S. Bureau of Labor Statistics (BLS) and serves as a critical tool for assessing inflation or deflation in the economy."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/unemployment-rate"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="UNRATE"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => `${value.toFixed(1)}%`}
                            explanation="The monthly U.S. unemployment rate is a key economic indicator that measures the percentage of the labor force that is jobless, actively seeking work, and available to work. It is calculated and reported by the U.S. Bureau of Labor Statistics (BLS) through the Current Population Survey (CPS), typically released on the first Friday of each month as part of the Employment Situation report."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/10-year-treasury"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DGS10"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={(value) => `${value.toFixed(2)}%`}
                            explanation="The daily 10-Year Treasury Note yield represents the annualized return investors receive for holding a U.S. 10-Year Treasury Note, a key benchmark for interest rates in the global economy. The yield is determined by the note’s price in the bond market, which fluctuates based on supply, demand, and economic conditions. Data is typically reported by the U.S. Department of the Treasury or financial platforms like the Federal Reserve’s FRED database."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/10y-2y-spread"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="T10Y2Y"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={(value) => `${value.toFixed(2)}%`}
                            explanation="The daily spread between the 10-Year and 2-Year Treasury yields measures the difference between the yields of the U.S. 10-Year Treasury Note and the 2-Year Treasury Note. This spread, often referred to as the 10-2 yield spread, is a key component of the Treasury yield curve and a widely watched indicator of economic health, particularly for predicting recessions. The data is typically sourced from the U.S. Department of the Treasury or platforms like the Federal Reserve’s FRED database."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/5y-inflation-expectation"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="T5YIE"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={(value) => `${value.toFixed(2)}%`}
                            explanation="The daily 5-Year Breakeven Inflation Rate represents the market's expected average annual inflation rate over the next five years, derived from the difference between the yields of the 5-Year U.S. Treasury Note and the 5-Year Treasury Inflation-Protected Securities (TIPS). This metric, often reported by the Federal Reserve (e.g., via FRED) or financial platforms, reflects investor inflation expectations and is a key gauge of anticipated price pressures in the economy."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/euro-dollar"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXUSEU"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toFixed(4)}
                            explanation="This chart shows the daily exchange rate of Euro to US Dollar."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/crude-oil"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DCOILWTICO"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => `$${value.toFixed(2)}`}
                            explanation="This chart shows the daily West Texas Intermediate (WTI) crude oil price."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/producer-price"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="PPIACO"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The monthly Producer Price Index (PPI) for All Commodities measures the average change over time in the selling prices received by domestic producers for their output, specifically for a broad basket of commodities. Calculated by the U.S. Bureau of Labor Statistics (BLS), the PPI is a key indicator of wholesale price trends and serves as an early signal of inflationary pressures in the economy, complementing metrics like the Consumer Price Index (CPI)."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/nonfarm-payrolls"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="PAYEMS"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The monthly total nonfarm payroll employment in the U.S. represents the total number of paid workers in the U.S. economy, excluding farm workers, private household employees, nonprofit employees, and unincorporated self-employed individuals. This data, compiled by the U.S. Bureau of Labor Statistics (BLS) through the Current Employment Statistics (CES) survey, is a critical indicator of labor market health and economic activity. It is released monthly, typically on the first Friday of the following month, as part of the Employment Situation report."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/gdp"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="GDPC1"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The quarterly Real Gross Domestic Product (GDP) in the U.S. measures the inflation-adjusted value of all final goods and services produced within the U.S. economy over a three-month period. Reported by the Bureau of Economic Analysis (BEA), Real GDP is a key indicator of economic growth, expressed in constant dollars (e.g., chained 2017 dollars) to remove the effects of price changes. It is typically presented as an annualized growth rate (e.g., 2.5% annualized) or as a total dollar value, released in three estimates (advance, second, third) per quarter."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/gdp-growth"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="A191RL1Q225SBEA"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => `${value.toFixed(2)}%`}
                            explanation="The quarterly Real GDP growth rate in the U.S. represents the annualized percentage change in inflation-adjusted Gross Domestic Product (GDP) from one quarter to the next. Real GDP, reported by the U.S. Bureau of Economic Analysis (BEA), measures the value of all final goods and services produced within the U.S., adjusted for inflation using a price deflator (e.g., chained 2017 dollars). The growth rate, expressed as an annualized figure, is a key indicator of economic momentum, released in three estimates (advance, second, third) per quarter."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/m1-money-supply"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="M1SL"
                            chartType="area"
                            scaleMode="logarithmic"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The monthly M1 money supply in the U.S. measures the most liquid components of the money supply, including physical currency, demand deposits, and other highly liquid deposits. Reported by the Federal Reserve through the H.6 Money Stock Measures, M1 reflects the money readily available for spending and is a key indicator of monetary policy, liquidity, and potential inflationary pressures. Data is typically presented in billions of dollars, seasonally adjusted, and updated monthly via sources like the Federal Reserve’s FRED database."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/m2-money-supply"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="M2SL"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The monthly M2 money supply in the U.S. measures a broader definition of the money supply compared to M1, encompassing all components of M1 plus less liquid assets such as savings deposits, small-denomination time deposits, and retail money market mutual funds (MMFs). Reported by the Federal Reserve through the H.6 Money Stock Measures, M2 reflects money available for spending and short-term saving, serving as a key indicator of monetary policy, economic liquidity, and potential inflationary pressures. Data is presented in billions of dollars, seasonally adjusted, and updated monthly via sources like the Federal Reserve’s FRED database."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/consumer-sentiment"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="UMCSENT"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The monthly University of Michigan Consumer Sentiment Index (UMCSI) measures U.S. consumer confidence based on their perceptions of current economic conditions and expectations for the future. Compiled by the University of Michigan through its Surveys of Consumers, the UMCSI is a leading indicator of consumer spending, which drives ~70% of U.S. economic activity. The index is reported monthly, with preliminary and final readings, and is expressed relative to a base period (1966 = 100)."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/vix"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="VIXCLS"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toFixed(2)}
                            explanation="The daily CBOE Volatility Index (VIX) measures the market's expectation of 30-day forward-looking volatility in the S&P 500 Index, often referred to as the 'fear gauge.' Calculated by the Chicago Board Options Exchange (CBOE), the VIX is derived from the prices of S&P 500 index options and reflects investor sentiment about near-term market uncertainty. It is reported daily in real-time during market hours, expressed as an annualized percentage."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/ted-spread"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="TEDRATE"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={(value) => `${value.toFixed(2)}%`}
                            explanation="The daily TED Spread measures the difference between the 3-Month London Interbank Offered Rate (LIBOR) and the 3-Month U.S. Treasury Bill (T-Bill) rate. It serves as an indicator of perceived credit risk and liquidity in the interbank lending market. The spread is expressed in percentage points (or basis points, where 1% = 100 bps) and is calculated daily using data from financial markets, typically reported via platforms like the Federal Reserve’s FRED database or Bloomberg."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/yen-dollar"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXJPUS"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={(value) => value.toFixed(2)}
                            explanation="This chart shows the daily exchange rate of Japanese Yen to US Dollar."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/pound-dollar"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXUSUK"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={(value) => value.toFixed(4)}
                            explanation="This chart shows the daily exchange rate of British Pound to US Dollar."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/cad-dollar"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXCAUS"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={(value) => value.toFixed(4)}
                            explanation="This chart shows the daily exchange rate of Canadian Dollar to US Dollar."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/chicago-fed-index"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="CFNAI"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toFixed(2)}
                            explanation="The monthly Chicago Fed National Activity Index (CFNAI) is a weighted average of 85 economic indicators that provides a single, comprehensive measure of U.S. economic activity. Produced by the Federal Reserve Bank of Chicago, the CFNAI tracks the economy’s overall health, with values above zero indicating above-average growth and values below zero signaling below-average growth. It is reported monthly, typically three weeks after the month ends, and is a key tool for assessing economic trends and recession risks."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/economic-policy-uncertainty"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="USEPUINDXD"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The daily U.S. Economic Policy Uncertainty (EPU) Index measures uncertainty related to economic policy based on newspaper coverage, tax code provisions, and forecaster disagreement. Developed by economists Scott R. Baker, Nicholas Bloom, and Steven J. Davis, the EPU Index quantifies how uncertainty about fiscal, monetary, regulatory, or trade policies affects economic decision-making. It is reported daily, expressed as an index with a long-term average of 100, and is available via sources like policyuncertainty.com or FRED."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/housing-starts"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="HOUST"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The monthly U.S. Housing Starts measures the number of new residential construction projects (privately owned housing units) that began during a given month, expressed as a seasonally adjusted annualized rate (SAAR) in thousands of units. Reported by the U.S. Census Bureau and the Department of Housing and Urban Development (HUD) as part of the New Residential Construction report, housing starts are a leading indicator of economic strength, reflecting activity in the housing sector, consumer confidence, and broader economic conditions. Data is released around the 17th of each month for the prior month and is available via sources like FRED, Census.gov, or tradingeconomics.com."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/case-shiller"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="CSUSHPINSA"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The monthly S&P/Case-Shiller U.S. National Home Price Index measures changes in the value of single-family homes across the U.S., adjusted for inflation and seasonal variations. Produced by S&P Dow Jones Indices and CoreLogic, the index uses a repeat-sales methodology, tracking price changes of the same properties over time to provide a consistent measure of home price trends. Reported monthly with a two-month lag (e.g., March 2025 data released in May 2025), it is expressed relative to a base value (January 2000 = 100) and is a key indicator of housing market health, consumer wealth, and economic conditions."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/nikkei-225"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="NIKKEI225"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="The daily Nikkei 225 Index tracks the performance of 225 major, highly liquid, publicly owned companies listed on the Prime Market of the Tokyo Stock Exchange (TSE). Calculated by the Nihon Keizai Shimbun (Nikkei) newspaper, the Nikkei 225 is a price-weighted index, denominated in Japanese Yen (JPY), and serves as a leading indicator of the Japanese equity market and broader economic conditions. The index is updated every five seconds during trading hours (9:00 AM–3:00 PM JST, with a lunch break from 11:30 AM–12:30 PM) and is reported daily via platforms like Yahoo Finance, FRED, or TradingView."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fred/german-bond-yield"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="IRLTLT01DEM156N"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={(value) => `${value.toFixed(2)}%`}
                            explanation="This chart shows the monthly German 10-Year Government Bond Yield."
                          />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/workbench"
                      element={
                        <ProtectedRoute>
                          <BasicChart
                            ChartComponent={WorkbenchChart}
                            seriesId="UMCSENT"
                            chartType="area"
                            valueFormatter={(value) => value.toLocaleString()}
                            explanation="Create your own indicator by choosing your own data series' to compare."
                          />
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch-all route: redirect based on auth state */}
                    <Route
                      path="*"
                      element={
                        isSignedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/splash" replace />
                      }
                    />
                  </Routes>
                </main>
              </div>
            </div>
            </FavoritesProvider>
          </SubscriptionProvider>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </StripeContext.Provider>
  );
});

const App = memo(() => {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AuthWrapper />
    </ClerkProvider>
  );
});

export default App;
export { StripeContext };