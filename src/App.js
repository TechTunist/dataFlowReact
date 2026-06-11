import { useState, useEffect, createContext, memo, Suspense, lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingFallback from "./components/LoadingFallback";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import Topbar from "./scenes/global/Topbar";
import { isChartPageRoute } from "./scenes/ChartTemplates/chartPageMeta";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import { IconButton, useTheme } from "@mui/material";
import { tokens } from "./theme";
import Sidebar from "./scenes/global/Sidebar";
import BasicChart from "./scenes/ChartTemplates/BasicChart";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import SplashPage from "./scenes/splash";
import LoginSignup from "./scenes/LoginSignup";
import useIsMobile from "./hooks/useIsMobile";
import ProtectedRoute from "./components/ProtectedRoute";
import AccountNavBar from "./scenes/global/AccountNavBar";
import { setClerkTokenGetter } from "./utils/clerkAuth";
import { loadStripe } from '@stripe/stripe-js';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { useMemo } from "react";
import { FavoritesProvider } from './contexts/FavoritesContext';
import restrictToPaidSubscription from './scenes/RestrictToPaid';

// Core components still directly referenced (kept minimal after route refactor)
import BitcoinPrice from "./components/BitcoinPrice";
import TotalMarketCap from "./components/TotalMarketCap";
import MarketCapDifference from "./components/TotalMarketCapDifference";
import TailCurvature from "./components/TailCurvature";
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
import { FearAndGreedBinaryProvider } from "./FearAndGreedBinaryContext";
import SP500ROI from "./components/SP500ROI";
import Total2Chart from "./components/Total2Marketcap";
import Total3Chart from "./components/Total3Marketcap";

// Dev escape hatch - set REACT_APP_DEV_BYPASS_AUTH=true in .env.local
// (or .env) to develop charts and data features without any Clerk authentication.
const DEV_BYPASS_AUTH = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

// Lazy load heavy charting components + scenes (code splitting for performance)
const Dashboard = lazy(() => import('./scenes/dashboard'));
const MarketOverview = lazy(() => import('./scenes/MarketOverview'));
const Subscription = lazy(() => import('./scenes/Subscription'));
const Profile = lazy(() => import('./scenes/Profile'));
const Settings = lazy(() => import('./scenes/Settings'));
const ChangePassword = lazy(() => import('./scenes/ChangePassword'));
const About = lazy(() => import('./scenes/About'));
const Charts = lazy(() => import('./components/ChartsThumbnails'));

const BitcoinAddressBalancesChart = lazy(() => import('./components/BitcoinAddressBalance'));
const BitcoinROI = lazy(() => import('./components/BitcoinROI'));
const RunningROI = lazy(() => import('./components/RunningROI'));
const MonthlyAverageROI = lazy(() => import('./components/MonthlyAverageROI'));
const BitcoinMonthlyReturnsTable = lazy(() => import('./components/MonthlyReturnsTable'));
const Bitcoin20WeekExtension = lazy(() => import('./components/Bitcoin20WeekExtension'));
const SahmRecessionIndicator = lazy(() => import('./components/SahmRecessionIndicator'));
const MarketHeatIndex = lazy(() => import('./components/MarketHeatIndex'));

const FearAndGreed3D = lazy(() => import('./components/FearAndGreed3D'));
const WorkbenchChart = lazy(() => import('./components/Workbench'));
const BitcoinMvrvZScore = lazy(() => import('./components/BitcoinMvrvZScore'));
const SP500DivUnrateChart = lazy(() => import('./components/SP500DivUnrateChart'));
const HistoricalVolatility = lazy(() => import('./components/HistoricalVolatility'));
const PuellMultiple = lazy(() => import('./components/PuellMultiple'));
const AltcoinSeasonIndexChart = lazy(() => import('./components/AltcoinSeasonIndexChart'));
const OnChainHistoricalRisk = lazy(() => import('./components/OnChainHistoricalRisk'));
const BitcoinTxMvrvChart = lazy(() => import('./components/BitcoinTxMvrv'));
const DynamicDCASimulator = lazy(() => import('./components/DynamicDCASimulator'));
const UKUnemploymentChart = lazy(() => import('./components/UKUnemployment'));
const UKClaimantCountChart = lazy(() => import('./components/UKClaimantCount'));
const UKEarningsChart = lazy(() => import('./components/UKEarnings'));
const UKPopulationChart = lazy(() => import('./components/UKPopulation'));
const UKWorkforceJobsChart = lazy(() => import('./components/UKWorkforceJobs'));
const UKBusinessCountsChart = lazy(() => import('./components/UKBusinessCounts'));
const UKJSAByAgeChart = lazy(() => import('./components/UKJSAByAge'));
const UKJSAByEthnicityChart = lazy(() => import('./components/UKJSAByEthnicity'));
const UKLabourByAgeChart = lazy(() => import('./components/UKLabourByAge'));
const UKPublicPrivateChart = lazy(() => import('./components/UKPublicPrivateEmployment'));
const UKAPSWorkplaceChart = lazy(() => import('./components/UKApsWorkplace'));
const UKEsaClaimantsChart = lazy(() => import('./components/UKEsaClaimants'));

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
  // MarketOverview is a premium (paid) page. requirePaid ensures the restrictToPaidSubscription HOC
  // is applied at route level (consistent with workbench + premium FRED routes). The individual
  // data fetches it triggers (mvrv, altcoin-season-index, sp500-div-unrate) are also premium-only.
  { path: "/market-overview", component: MarketOverview, protected: true, requirePaid: true },
  { path: "/about", component: About, protected: true },
  { path: "/profile", component: Profile, protected: true },
  { path: "/subscription", component: Subscription, protected: true },
  { path: "/settings", component: Settings, protected: true },
  { path: "/change-password", component: ChangePassword, protected: true },

  // Simple protected chart routes using BasicChart
  { path: "/btc-20-ext", component: Bitcoin20WeekExtension, useBasicChart: true, protected: true },
  { path: "/bitcoin", component: BitcoinPrice, useBasicChart: true, protected: true },
  { path: "/market-heat-index", component: MarketHeatIndex, useBasicChart: true, protected: true, basicChartProps: { chartMinHeight: "660px" } },
  { path: "/total", component: TotalMarketCap, useBasicChart: true, protected: true },
  { path: "/total2", component: Total2Chart, useBasicChart: true, protected: true },
  { path: "/total3", component: Total3Chart, useBasicChart: true, protected: true },
  { path: "/total-difference", component: MarketCapDifference, useBasicChart: true, protected: true },
  { 
    path: "/tail-curvature", 
    component: TailCurvature, 
    useBasicChart: true, 
    protected: true,
    basicChartProps: { chartMinHeight: "clamp(420px, 68vh, 860px)" }
  },
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
  { path: "/uk-unemployment", component: UKUnemploymentChart, useBasicChart: true, protected: true },
  { path: "/uk-claimants", component: UKClaimantCountChart, useBasicChart: true, protected: true },
  { path: "/uk-earnings", component: UKEarningsChart, useBasicChart: true, protected: true },
  { path: "/uk-population", component: UKPopulationChart, useBasicChart: true, protected: true },
  { path: "/uk-workforce-jobs", component: UKWorkforceJobsChart, useBasicChart: true, protected: true },
  { path: "/uk-business-counts", component: UKBusinessCountsChart, useBasicChart: true, protected: true },
  { path: "/uk-jsa-age", component: UKJSAByAgeChart, useBasicChart: true, protected: true },
  { path: "/uk-jsa-ethnicity", component: UKJSAByEthnicityChart, useBasicChart: true, protected: true },
  { path: "/uk-labour-by-age", component: UKLabourByAgeChart, useBasicChart: true, protected: true },
  { path: "/uk-public-private", component: UKPublicPrivateChart, useBasicChart: true, protected: true },
  { path: "/uk-aps-workplace", component: UKAPSWorkplaceChart, useBasicChart: true, protected: true },
  { path: "/uk-esa-claimants", component: UKEsaClaimantsChart, useBasicChart: true, protected: true },
  { path: "/tx-mvrv", component: BitcoinTxMvrvChart, useBasicChart: true, protected: true, basicChartProps: { chartMinHeight: "660px" } },
  { path: "/on-chain-historical-risk", component: OnChainHistoricalRisk, useBasicChart: true, protected: true },
  { path: "/altcoin-season-index", component: AltcoinSeasonIndexChart, useBasicChart: true, protected: true },
  { path: "/sp500unrate", component: SP500DivUnrateChart, useBasicChart: true, protected: true },

  // Premium-only routes (wrapped with restrictToPaidSubscription)
  { path: "/fred/sahm-recession-indicator", component: SahmRecessionIndicator, useBasicChart: true, requirePaid: true, protected: true },
  { path: "/workbench", component: WorkbenchChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "UMCSENT", chartType: "area", valueFormatter: (v) => v.toLocaleString(), showSP500Overlay: true, explanation: "Create your own indicator by choosing your own data series' to compare." } },
  { path: "/dynamic-dca", component: DynamicDCASimulator, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { chartMinHeight: "auto" } },

  // Many Fred series premium routes - defined with props for clarity
  { path: "/fred/fed-funds-rate", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "DFF", chartType: "line", scaleMode: "linear", valueFormatter: (v) => `${v.toFixed(2)}%`, explanation: "This chart shows the daily Effective Federal Funds Rate in the United States, set by the Federal Reserve.", showSP500Overlay: true } },
  { path: "/fred/sp500", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "SP500", chartType: "area", scaleMode: "linear", enableTechnicalIndicators: true, enableAssetOverlay: true, defaultOverlaySeriesId: "BTC", valueFormatter: (v) => v.toLocaleString() } },
  { path: "/fred/recession-indicator", component: FredSeriesChart, useBasicChart: true, requirePaid: true, protected: true, basicChartProps: { seriesId: "USRECD", chartType: "histogram", enableAssetOverlay: true, defaultOverlaySeriesId: "SP500", valueFormatter: (v) => (v === 1 ? "Recession" : "No Recession"), defaultScaleMode: 0 } },
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
      // For non-basic-chart routes, apply paid restriction (if any) to the *component*
      // before creating the element. This fixes the previous bug where we were
      // passing an already-created element to restrictToPaidSubscription().
      let CompToUse = Comp;
      if (route.requirePaid) {
        CompToUse = restrictToPaidSubscription(Comp);
      }
      el = <CompToUse {...props} />;
    }
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
  // Hooks must always be called unconditionally (top of component, same order every render)
  // to satisfy react-hooks/rules-of-hooks. We call them first, then decide what to render.
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  // Register token getter once on mount (reads live Clerk session each call).
  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    setClerkTokenGetter(async () => {
      if (window.Clerk?.session) {
        return window.Clerk.session.getToken();
      }
      return null;
    });
  }, []);

  if (DEV_BYPASS_AUTH) {
    // Dev escape hatch: run the entire app (including all protected charts)
    // without any Clerk authentication. Perfect for local chart/data work.
    return <AppContent />;
  }

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
  const shouldHideTopbar = isChartPageRoute(location.pathname);
  const shouldRenderTopbar = !isSplashPage && !isLoginSignupPage && !isUserMenuPage && !shouldHideTopbar;
  const navColors = tokens(memoizedTheme.palette.mode);
  // Display Stripe initialization error if present
  // In dev bypass mode we don't want Stripe failures (e.g. tracking blockers in Firefox private mode)
  // to prevent the rest of the app from working.
  if (stripeError && !DEV_BYPASS_AUTH) {
    return <div>Error loading Stripe: {stripeError}</div>;
  }
  return (
    <StripeContext.Provider value={stripe}>
      <ColorModeContext.Provider value={memoizedColorMode}>
        <ThemeProvider theme={memoizedTheme}>
          <SubscriptionProvider> {/* Removed user and isSignedIn props */}
            <FavoritesProvider> {/* Removed user and isSignedIn props */}
              <CssBaseline />
              {DEV_BYPASS_AUTH && (
                <div style={{
                  background: '#1e3a2f',
                  color: '#4ade80',
                  textAlign: 'center',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  borderBottom: '1px solid #166534'
                }}>
                  DEV MODE: Clerk + subscription checks bypassed (REACT_APP_DEV_BYPASS_AUTH=true). All charts (including premium) available locally.
                </div>
              )}
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
                {shouldHideTopbar && isMobile && !isSplashPage && !isLoginSignupPage && !isUserMenuPage && !isSidebar && (
                  <IconButton
                    onClick={() => setIsSidebar(true)}
                    aria-label="open navigation"
                    size="small"
                    sx={{
                      position: "fixed",
                      top: 10,
                      left: 10,
                      zIndex: 1200,
                      bgcolor: navColors.primary[500],
                      color: navColors.grey[100],
                      boxShadow: 2,
                      "&:hover": { bgcolor: navColors.primary[600] },
                    }}
                  >
                    <MenuOutlinedIcon fontSize="small" />
                  </IconButton>
                )}
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
                    ) : shouldHideTopbar ? (
                      <div style={{ height: "16px" }} />
                    ) : null}
                    {isUserMenuPage && <div style={{ height: "65px" }} />}
                    <ErrorBoundary fallbackMessage="The main application area failed to load.">
                      <Suspense fallback={<LoadingFallback message="Loading chart..." />}>
                      <FearAndGreedBinaryProvider>
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
                      </FearAndGreedBinaryProvider>
                      </Suspense>
                    </ErrorBoundary>
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
  // Only pass the custom domain prop when using a production/live Clerk key.
  // Dev/test keys (pk_test_*) work better without it (or with their accounts.dev domain).
  const isProdKey = PUBLISHABLE_KEY && PUBLISHABLE_KEY.startsWith('pk_live_');
  const clerkProps = {
    publishableKey: PUBLISHABLE_KEY,
    ...(isProdKey ? { domain: 'clerk.cryptological.app' } : {}),
  };
  return (
    <ClerkProvider {...clerkProps}>
      <AuthWrapper />
    </ClerkProvider>
  );
});

export default App;
export { StripeContext };