import { useState, useEffect, createContext, memo, Suspense, lazy } from "react";
import LoadingFallback from "./components/LoadingFallback";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import BasicChart from "./scenes/ChartTemplates/BasicChart";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import SplashPage from "./scenes/splash";
import LoginSignup from "./scenes/LoginSignup";
import useIsMobile from "./hooks/useIsMobile";
import ProtectedRoute from "./components/ProtectedRoute";
import AccountNavBar from "./scenes/global/AccountNavBar";
import { loadStripe } from '@stripe/stripe-js';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { useMemo } from "react";
import { FavoritesProvider } from './contexts/FavoritesContext';
import restrictToPaidSubscription from './scenes/RestrictToPaid';

// Core components still directly referenced (kept minimal after route refactor)
import BitcoinPrice from "./components/BitcoinPrice";
import TotalMarketCap from "./components/TotalMarketCap";
import MarketCapDifference from "./components/TotalMarketCapDifference";
import BitcoinTransactionFees from "./components/BitcoinTransactionFees";
import BitcoinDominance from "./components/BitcoinDominance";
import Risk from "./components/BitcoinRisk";
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
import UsInterestChart from "./components/UsInterest";
import UsInitialClaimsChart from "./components/UsInitialClaims";
import UsCombinedMacroChart from "./components/UsCombinedMacro";
import FredSeriesChart from "./components/FredSeriesChart";
import FearAndGreedBinaryChart from "./components/FearAndGreedBinaryChart";
import SP500ROI from "./components/SP500ROI";
import Total2Chart from "./components/Total2Marketcap";
import Total3Chart from "./components/Total3Marketcap";

// Lazy load heavy charting components + scenes (code splitting for performance)
const Dashboard = lazy(() => import('./scenes/dashboard'));
const MarketOverview = lazy(() => import('./scenes/MarketOverview'));
const Subscription = lazy(() => import('./scenes/Subscription'));
const Profile = lazy(() => import('./scenes/Profile'));
const Settings = lazy(() => import('./scenes/Settings'));
const ChangePassword = lazy(() => import('./scenes/ChangePassword'));
const About = lazy(() => import('./scenes/About'));
const Charts = lazy(() => import('./components/ChartsThumbnails'));

const Bitcoin10YearChart = lazy(() => import('./components/Bitcoin10YearRecession'));
const BitcoinAddressBalancesChart = lazy(() => import('./components/BitcoinAddressBalance'));
const BitcoinROI = lazy(() => import('./components/BitcoinROI'));
const BitcoinTxCountChart = lazy(() => import('./components/BitcoinTxCount'));
const RunningROI = lazy(() => import('./components/RunningROI'));
const MonthlyAverageROI = lazy(() => import('./components/MonthlyAverageROI'));
const BitcoinMonthlyReturnsTable = lazy(() => import('./components/MonthlyReturnsTable'));
const Bitcoin20WeekExtension = lazy(() => import('./components/Bitcoin20WeekExtension'));
const SahmRecessionIndicator = lazy(() => import('./components/SahmRecessionIndicator'));
const MarketHeatIndex = lazy(() => import('./components/MarketHeatIndex'));

const MarketHeatIndexPlotly = lazy(() => import('./components/MarketHeatIndexPlotly'));
const FearAndGreed3D = lazy(() => import('./components/FearAndGreed3D'));
const WorkbenchChart = lazy(() => import('./components/Workbench'));
const BitcoinMvrvZScore = lazy(() => import('./components/BitcoinMvrvZScore'));
const SP500DivUnrateChart = lazy(() => import('./components/SP500DivUnrateChart'));
const HistoricalVolatility = lazy(() => import('./components/HistoricalVolatility'));
const PuellMultiple = lazy(() => import('./components/PuellMultiple'));
const AltcoinSeasonIndexChart = lazy(() => import('./components/AltcoinSeasonIndexChart'));
const OnChainHistoricalRisk = lazy(() => import('./components/OnChainHistoricalRisk'));
const BitcoinTxMvrvChart = lazy(() => import('./components/BitcoinTxMvrv'));
const TxCombinedChart = lazy(() => import('./components/TxMacroCombined'));

/**
 * Route Configuration for the entire app.
 * This replaces the previous 800+ lines of repetitive <Route> JSX.
 * Much easier to maintain, review, and extend.
 */
const appRoutes = [
  // Public routes (no auth required)
  { path: "/splash", element: <SplashPage />, public: true },
  { path: "/login-signup", element: <LoginSignup />, public: true },
  { path: "/charts", element: <Charts />, public: true },

  // Core protected scenes (not using BasicChart wrapper)
  { path: "/dashboard", component: Dashboard, protected: true, props: (ctx) => ({ isMobile: ctx.isMobile, isSidebar: ctx.isSidebar }) },
  { path: "/market-overview", component: MarketOverview, protected: true },
  { path: "/about", component: About, protected: true },
  { path: "/profile", component: Profile, protected: true },
  { path: "/subscription", component: Subscription, protected: true },
  { path: "/settings", component: Settings, protected: true },
  { path: "/change-password", component: ChangePassword, protected: true },

  // Simple protected chart routes using BasicChart
  { path: "/btc-20-ext", component: Bitcoin20WeekExtension, useBasicChart: true, protected: true },
  { path: "/bitcoin", component: BitcoinPrice, useBasicChart: true, protected: true },
  { path: "/market-heat-index", component: MarketHeatIndex, useBasicChart: true, protected: true },
  { path: "/total", component: TotalMarketCap, useBasicChart: true, protected: true },
  { path: "/total2", component: Total2Chart, useBasicChart: true, protected: true },
  { path: "/total3", component: Total3Chart, useBasicChart: true, protected: true },
  { path: "/total-difference", component: MarketCapDifference, useBasicChart: true, protected: true },
  { path: "/bitcoin-fees", component: BitcoinTransactionFees, useBasicChart: true, protected: true },
  { path: "/bitcoin-dominance", component: BitcoinDominance, useBasicChart: true, protected: true },
  { path: "/bitcoin-roi", component: BitcoinROI, useBasicChart: true, protected: true },
  { path: "/sp500-roi", component: SP500ROI, useBasicChart: true, protected: true },
  { path: "/running-roi", component: RunningROI, useBasicChart: true, protected: true },
  { path: "/historical-volatility", component: HistoricalVolatility, useBasicChart: true, protected: true },
  { path: "/monthly-returns", component: BitcoinMonthlyReturnsTable, useBasicChart: true, protected: true },
  { path: "/monthly-average-roi", component: MonthlyAverageROI, useBasicChart: true, protected: true },
  { path: "/btc-mvrv-z", component: BitcoinMvrvZScore, useBasicChart: true, protected: true },
  { path: "/btc-add-balance", component: BitcoinAddressBalancesChart, useBasicChart: true, protected: true },
  { path: "/puell-multiple", component: PuellMultiple, useBasicChart: true, protected: true },
  { path: "/risk", component: Risk, useBasicChart: true, protected: true },
  { path: "/risk-eth", component: EthereumRisk, useBasicChart: true, protected: true },
  { path: "/pi-cycle", component: PiCycleTop, useBasicChart: true, protected: true },
  { path: "/fear-and-greed", component: FearAndGreed, useBasicChart: true, protected: true },
  { path: "/fear-and-greed-3d", component: FearAndGreed3D, useBasicChart: true, protected: true },
  { path: "/logarithmic-regression", component: BitcoinLogRegression, useBasicChart: true, protected: true },
  { path: "/risk-color", component: BitcoinRiskColor, useBasicChart: true, protected: true },
  { path: "/risk-bands", component: AssetRiskBandDuration, useBasicChart: true, protected: true },
  { path: "/altcoin-price", component: AltcoinPrice, useBasicChart: true, protected: true },
  { path: "/altcoin-risk", component: AltcoinRisk, useBasicChart: true, protected: true },
  { path: "/market-cycles", component: MarketCycles, useBasicChart: true, protected: true },
  { path: "/fear-and-greed-chart", component: FearAndGreedChart, useBasicChart: true, protected: true },
  { path: "/fear-and-greed-binary-chart", component: FearAndGreedBinaryChart, useBasicChart: true, protected: true },
  { path: "/us-inflation", component: UsInflationChart, useBasicChart: true, protected: true },
  { path: "/us-interest", component: UsInterestChart, useBasicChart: true, protected: true },
  { path: "/us-combined-macro", component: UsCombinedMacroChart, useBasicChart: true, protected: true },
  { path: "/us-initial-claims", component: UsInitialClaimsChart, useBasicChart: true, protected: true },
  { path: "/tx-mvrv", component: BitcoinTxMvrvChart, useBasicChart: true, protected: true },
  { path: "/on-chain-historical-risk", component: OnChainHistoricalRisk, useBasicChart: true, protected: true },
  { path: "/altcoin-season-index", component: AltcoinSeasonIndexChart, useBasicChart: true, protected: true },
  { path: "/sp500unrate", component: SP500DivUnrateChart, useBasicChart: true, protected: true },

  // Premium-only routes (wrapped with restrictToPaidSubscription)
  { path: "/fred/sahm-recession-indicator", component: SahmRecessionIndicator, useBasicChart: true, requirePaid: true, protected: true },
  { path: "/workbench", component: WorkbenchChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "UMCSENT", chartType: "area", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true, explanation: "Create your own indicator by choosing your own data series' to compare." } },

  // Many Fred series premium routes - defined with props for clarity
  { path: "/fred/fed-funds-rate", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DFF", chartType: "line", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(2)}%`, explanation: "This chart shows the daily Effective Federal Funds Rate in the United States, set by the Federal Reserve.", showSP500Overlay: true } },
  { path: "/fred/sp500", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "SP500", chartType: "area", scaleMode: "linear", enableTechnicalIndicators: true, valueFormatter: (v) => v.toLocaleString() } },
  { path: "/fred/recession-indicator", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "USRECD", chartType: "histogram", valueFormatter: (v) => (v === 1 ? "Recession" : "No Recession"), defaultScaleMode: 0 } },
  { path: "/fred/cpi", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "CPIAUCSL", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), explanation: "The Consumer Price Index (CPI) for All Urban Consumers...", showSP500Overlay: true } },
  { path: "/fred/unemployment-rate", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "UNRATE", chartType: "area", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(1)}%`, showSP500Overlay: true } },
  { path: "/fred/10-year-treasury", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DGS10", chartType: "line", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(2)}%`, showSP500Overlay: true } },
  { path: "/fred/10y-2y-spread", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "T10Y2Y", chartType: "line", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(2)}%`, showSP500Overlay: true } },
  { path: "/fred/5y-inflation-expectation", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "T5YIE", chartType: "line", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(2)}%`, showSP500Overlay: true } },
  { path: "/fred/euro-dollar", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DEXUSEU", chartType: "line", scaleMode: "linear", valueFormatter: (v) => v.toFixed(4), showSP500Overlay: true } },
  { path: "/fred/crude-oil", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DCOILWTICO", chartType: "area", scaleMode: "linear", valueFormatter: (v) => `$${v.toFixed(2)}`, showSP500Overlay: true } },
  { path: "/fred/producer-price", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "PPIACO", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/nonfarm-payrolls", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "PAYEMS", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true, explanation: "The monthly total nonfarm payroll employment in the U.S...." } },
  { path: "/fred/gdp", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "GDPC1", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/gdp-growth", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "A191RL1Q225SBEA", chartType: "area", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(2)}%`, showSP500Overlay: true } },
  { path: "/fred/m1-money-supply", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "M1SL", chartType: "area", scaleMode: "logarithmic", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/m2-money-supply", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "M2SL", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/consumer-sentiment", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "UMCSENT", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/vix", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "VIXCLS", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toFixed(2), showSP500Overlay: true } },
  { path: "/fred/ted-spread", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "TEDRATE", chartType: "line", scaleMode: "logarithmic", valueFormatter: (v) => `${v.toFixed(2)}%`, showSP500Overlay: true } },
  { path: "/fred/yen-dollar", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DEXJPUS", chartType: "line", scaleMode: "logarithmic", valueFormatter: (v) => v.toFixed(2), showSP500Overlay: true } },
  { path: "/fred/pound-dollar", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DEXUSUK", chartType: "line", scaleMode: "logarithmic", valueFormatter: (v) => v.toFixed(4), showSP500Overlay: true } },
  { path: "/fred/cad-dollar", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DEXCAUS", chartType: "line", scaleMode: "logarithmic", valueFormatter: (v) => v.toFixed(4), showSP500Overlay: true } },
  { path: "/fred/chicago-fed-index", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "CFNAI", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toFixed(2), showSP500Overlay: true } },
  { path: "/fred/economic-policy-uncertainty", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "USEPUINDXD", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/housing-starts", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "HOUST", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/case-shiller", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "CSUSHPINSA", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/nikkei-225", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "NIKKEI225", chartType: "area", scaleMode: "linear", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true } },
  { path: "/fred/german-bond-yield", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "IRLTLT01DEM156N", chartType: "line", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(2)}%`, showSP500Overlay: true } },

  // Catch-all
  { path: "*", element: <Navigate to="/dashboard" replace /> },
];

// Helper to turn a route config entry into the correct React element with wrappers
function createRouteElement(route, context = {}) {
  let el;

  if (route.element) {
    el = route.element;
  } else if (route.component) {
    const Comp = route.component;
    const props = typeof route.props === "function" ? route.props(context) : (route.props || {});

    if (route.useBasicChart) {
      const ChartComp = route.requirePaid ? restrictToPaidSubscription(Comp) : Comp;
      el = <BasicChart ChartComponent={ChartComp} {...(route.basicChartProps || {})} {...props} />;
    } else {
      el = <Comp {...props} />;
    }
  }

  if (route.requirePaid && !route.useBasicChart) {
    el = restrictToPaidSubscription(el);
  }

  if (route.protected && !route.public) {
    el = <ProtectedRoute>{el}</ProtectedRoute>;
  }

  return el;
}

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
  return <AppContent />;
});

const AppContent = memo(() => {
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
  const fullScreenChartRoutes = ["/market-heat-index"];
  const isFullScreenChart = fullScreenChartRoutes.includes(location.pathname);
  const shouldHideTopbar = isFullScreenChart;
  const shouldRenderTopbarAndSidebar = !isSplashPage && !isLoginSignupPage && !isUserMenuPage && !isFullScreenChart;
  const shouldRenderTopbar = !isSplashPage && !isLoginSignupPage && !isUserMenuPage && !shouldHideTopbar;
  // Display Stripe initialization error if present
  if (stripeError) {
    return <div>Error loading Stripe: {stripeError}</div>;
  }
  return (
    <StripeContext.Provider value={stripe}>
      <ColorModeContext.Provider value={memoizedColorMode}>
        <ThemeProvider theme={memoizedTheme}>
          <SubscriptionProvider> {/* Removed user and isSignedIn props */}
            <FavoritesProvider> {/* Removed user and isSignedIn props */}
              <CssBaseline />
              <div className="app" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                {/* Render Topbar or AccountNavBar only if signed in */}
                {shouldRenderTopbar && (
                  <Topbar
                    setIsSidebar={setIsSidebar}
                    isSidebar={isSidebar}
                    isDashboardTopbar={isDashboardTopbar}
                  />
                )}
                {isUserMenuPage && <AccountNavBar />}
                <div style={{ display: "flex", flex: 1 }}>
                  {/* Render Sidebar only if signed in */}
                  {!isSplashPage && !isLoginSignupPage && !isUserMenuPage && (
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
                    {shouldRenderTopbar ? (
                      <div style={{ height: isMobile ? "65px" : "85px" }} />
                    ) : isFullScreenChart ? (
                      <div style={{ height: "32px" }} />   
                    ) : null}
                    {isUserMenuPage && <div style={{ height: "65px" }} />}
                    <Suspense fallback={<LoadingFallback message="Loading chart..." />}>
                    <Routes>
                      {/* All routes are now driven by the appRoutes config + createRouteElement helper above.
                          This replaced ~850 lines of repetitive manual <Route> definitions. */}
                      {appRoutes.map((route) => (
                        <Route
                          key={route.path}
                          path={route.path}
                          element={createRouteElement(route, { isMobile, isSidebar })}
                        />
                      ))}
                    </Routes>
                    </Suspense>
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
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} domain="clerk.cryptological.app">
      <AuthWrapper />
    </ClerkProvider>
  );
});

export default App;
export { StripeContext };