// src/scenes/dashboard/index.js
import { useState, useEffect, useContext, memo } from "react";
import { Box, Card, CardContent, Typography, Grid, useTheme, Button } from "@mui/material";
import { tokens } from "../../theme";
import { Link } from "react-router-dom";
import { DataContext } from "../../DataContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import LazyLoad from "react-lazyload";
import BitcoinPrice from "../../components/BitcoinPrice";
import BitcoinRisk from "../../components/BitcoinRisk";
import BitcoinDominance from "../../components/BitcoinDominance";
import TotalMarketCap from "../../components/TotalMarketCap";
import AltcoinPrice from "../../components/AltcoinPrice";
import AltcoinRisk from "../../components/AltcoinRisk";
import EthereumRisk from "../../components/EthereumRisk";
import EthereumPrice from "../../components/EthereumPrice";
import MarketCycles from "../../components/MarketCycles";
import PiCycleTop from "../../components/PiCycleTop";
import FearandGreed from "../../components/FearAndGreed";
import BitcoinLogRegression from "../../components/BitcoinLogRegression";
import BitcoinRiskColor from "../../components/BitcoinRiskColor";
import AssetRiskTimeInBands from "../../components/RiskTimeInBands";
import BitcoinROI from "../../components/BitcoinROI";

const chartConfig = [
  { id: "bitcoin-price", title: "Bitcoin Price", linkTo: "/bitcoin", component: (props) => <BitcoinPrice isDashboard={true} {...props} />, description: "A simple chart of the entire bitcoin daily close price history." },
  { id: "bitcoin-risk", title: "Bitcoin Risk Metric", linkTo: "/risk", component: (props) => <BitcoinRisk isDashboard={true} {...props} />, description: "The risk metric demonstrates the risk of holding bitcoin at any given time. The closer to 1, the higher the risk." },
  { id: "total-market-cap", title: "Total Crypto Market Cap", linkTo: "/total", component: (props) => <TotalMarketCap isDashboard={true} {...props} />, description: "The market cap of the entire crypto market." },
  { id: "ethereum-price", title: "Ethereum Price", linkTo: "/ethereum", component: (props) => <EthereumPrice isDashboard={true} {...props} />, description: "A simple chart of the entire Ethereum daily close price history." },
  { id: "ethereum-risk", title: "Ethereum Risk Metric", linkTo: "/risk-eth", component: (props) => <EthereumRisk isDashboard={true} {...props} />, description: "The risk metric demonstrates the risk of holding Eth at any given time. The closer to 1, the higher the risk." },
  { id: "bitcoin-dominance", title: "Bitcoin Dominance", linkTo: "/bitcoin-dominance", component: (props) => <BitcoinDominance isDashboard={true} {...props} />, description: "Bitcoin Dominance chart over all crypto assets." },
  { id: "pi-cycle-top", title: "PiCycle Top Indicator", linkTo: "/pi-cycle", component: (props) => <PiCycleTop isDashboard={true} {...props} />, description: "The PiCycle Top Indicator was created by Philip Swift and is used to identify the top of the bitcoin market to within 3 days." },
  { id: "fear-and-greed", title: "Fear and Greed Indicator", linkTo: "/fear-and-greed", component: (props) => <FearandGreed isDashboard={true} {...props} />, description: "The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data." },
  { id: "bitcoin-log-regression", title: "Bitcoin Logarithmic Regression", linkTo: "/logarithmic-regression", component: (props) => <BitcoinLogRegression isDashboard={true} {...props} />, description: "Logarithmic Regression trend lines fit to the lower, upper and mid-range of Bitcoin's price history." },
  { id: "bitcoin-risk-color", title: "Bitcoin Risk Colour Chart", linkTo: "/risk-color", component: (props) => <BitcoinRiskColor isDashboard={true} {...props} />, description: "Colour coded bitcoin risk levels." },
  { id: "bitcoin-risk-bands", title: "Time Spent in Bitcoin Risk Bands", linkTo: "/risk-bands", component: (props) => <AssetRiskTimeInBands isDashboard={true} {...props} />, description: "Time Spent as a percentage in each defined Bitcoin risk band." },
  { id: "altcoin-price", title: "Altcoin Charts", linkTo: "/altcoin-price", component: (props) => <AltcoinPrice isDashboard={true} {...props} />, description: "Simple price chart for a selection of altcoins and their USD / BTC pairs." },
  { id: "market-cycles", title: "Bitcoin Market Cycles", linkTo: "/market-cycles", component: (props) => <MarketCycles isDashboard={true} {...props} />, description: "Compare the previous crypto market cycles, either from the bear-market bottom or from the halving event." },
  { id: "bitcoin-roi", title: "Bitcoin ROI", linkTo: "/bitcoin-roi", component: (props) => <BitcoinROI isDashboard={true} {...props} />, description: "Annualised ROI for Bitcoin." },
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
              <Link to={linkTo} style={{ textDecoration: "none" }}>
                <Typography
                  variant="h4"
                  gutterBottom
                  style={{ color: colors.grey[100] }}
                >
                  {title}
                </Typography>
              </Link>
              <Button
                onClick={() => toggleFavorite(chartId)}
                sx={{
                  color: isFavorite ? colors.yellowAccent[500] : colors.grey[100],
                  minWidth: 'auto',
                  padding: '4px',
                }}
              >
                {isFavorite ? '★' : '☆'}
              </Button>
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
      </LazyLoad>
    </Grid>
  );
});

const Dashboard = memo(({ isMobile, isSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [chartsVisible, setChartsVisible] = useState(!isMobile || !isSidebar);
  const { btcData, ethData, riskData, marketCapData } = useContext(DataContext);
  const { favoriteCharts, addFavoriteChart, removeFavoriteChart } = useFavorites();

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

  // Filter charts based on favorites; show all if none are favorited
  const displayedCharts = favoriteCharts.length > 0
    ? chartConfig.filter(chart => favoriteCharts.includes(chart.id))
    : chartConfig;

  return (
    <Box m="20px">
      {favoriteCharts.length === 0 && (
        <Typography variant="h5" color={colors.grey[100]} mb={2}>
          No favorite charts selected. Showing all charts. Click the star on a chart to add it to your favorites.
        </Typography>
      )}
      <Grid container spacing={4}>
        {displayedCharts.map(({ id, title, component, description, linkTo }) => (
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
    </Box>
  );
});

export default Dashboard;