import { useState, useEffect, useContext } from "react";
import { Box, Card, CardContent, Typography, Grid, useTheme } from "@mui/material";
import BitcoinRisk from "../../components/BitcoinRisk";
import BitcoinPrice from "../../components/BitcoinPrice";
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
import BitcoinRiskTimeInBands from "../../components/BitcoinRiskTimeInBands";
import "../../styling/bitcoinChart.css";
import { tokens } from "../../theme";
import { Link } from "react-router-dom";
import FearAndGreedChart from "../../components/FearAndGreedChart";
import UsInflationChart from "../../components/UsInflation";
import UsUnemploymentChart from "../../components/UsUnemployment";
import UsInterestChart from "../../components/UsInterest";
import UsInitialClaimsChart from "../../components/UsInitialClaims";
import UsCombinedMacroChart from "../../components/UsCombinedMacro";
import { DataContext } from "../../DataContext";
import LazyLoad from "react-lazyload";
import BitcoinROI from "../../components/BitcoinROI";

// Add this new CSS to ensure card uniformity
const dashboardStyles = {
  card: {
    height: "550px",
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow 0.3s ease",
  },
  cardContent: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  chartContainer: {
    flex: 1,
    minHeight: "400px",
    marginTop: "10px",
    marginBottom: "10px",
  },
  infoText: {
    marginTop: "auto",
    fontSize: "0.875rem",
  },
};

const Dashboard = ({ isMobile, isSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [chartsVisible, setChartsVisible] = useState(!isMobile || !isSidebar);
  const { btcData, ethData, riskData, marketCapData } = useContext(DataContext);

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

  // Create a reusable card component with consistent styling
  const DashboardCard = ({ title, component, description, linkTo }) => (
    <Grid item xs={12} lg={6}>
      <LazyLoad height={550} offset={100}>
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
              <Typography
                variant="h4"
                gutterBottom
                style={{ color: colors.grey[100] }}
              >
                {title}
              </Typography>
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
      </LazyLoad>
    </Grid>
  );

  return (
    <Box m="20px">
      <Grid container spacing={4}>
        {/* Bitcoin Price Card */}
        <DashboardCard
          title="Bitcoin Price"
          component={<BitcoinPrice isDashboard={true} priceData={btcData} />}
          description="A simple chart of the entire bitcoin daily close price history."
          linkTo="/bitcoin"
        />

        {/* Bitcoin Risk Metric Card */}
        <DashboardCard
          title="Bitcoin Risk Metric"
          component={<BitcoinRisk isDashboard={true} riskData={riskData} />}
          description="The risk metric demonstrates the risk of holding bitcoin at any given time. The closer to 1, the higher the risk."
          linkTo="/risk"
        />

        {/* Total Market Cap Card */}
        <DashboardCard
          title="Total Crypto Market Cap"
          component={<TotalMarketCap isDashboard={true} marketCapData={marketCapData} />}
          description="The market cap of the entire crypto market."
          linkTo="/total"
        />

        {/* Ethereum Price Card */}
        <DashboardCard
          title="Ethereum Price"
          component={<EthereumPrice isDashboard={true} priceData={ethData} />}
          description="A simple chart of the entire Ethereum daily close price history."
          linkTo="/ethereum"
        />

        {/* Ethereum Risk Metric Card */}
        <DashboardCard
          title="Ethereum Risk Metric"
          component={<EthereumRisk isDashboard={true} riskData={riskData} />}
          description="The risk metric demonstrates the risk of holding Eth at any given time. The closer to 1, the higher the risk."
          linkTo="/risk-eth"
        />

        {/* Bitcoin Dominance */}
        <DashboardCard
          title="Bitcoin Dominance"
          component={<BitcoinDominance isDashboard={true} dominanceData={null} />}
          description="Bitcoin Dominance chart over all crypto assets."
          linkTo="/bitcoin-dominance"
        />

        {/* PiCycle Card */}
        <DashboardCard
          title="PiCycle Top Indicator"
          component={<PiCycleTop isDashboard={true} priceData={btcData} />}
          description="The PiCycle Top Indicator was created by Philip Swift and is used to identify the top of the bitcoin market to within 3 days."
          linkTo="/pi-cycle"
        />

        {/* Fear and Greed Card */}
        <DashboardCard
          title="Fear and Greed Indicator"
          component={<FearandGreed isDashboard={true} fearGreedData={null} />}
          description="The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data."
          linkTo="/fear-and-greed"
        />

        {/* Bitcoin Log Regression Card */}
        <DashboardCard
          title="Bitcoin Logarithmic Regression"
          component={<BitcoinLogRegression isDashboard={true} priceData={btcData} />}
          description="Logarithmic Regression trend lines fit to the lower, upper and mid-range of Bitcoin's price history."
          linkTo="/logarithmic-regression"
        />

        {/* Bitcoin Risk Colour Card */}
        <DashboardCard
          title="Bitcoin Risk Colour Chart"
          component={<BitcoinRiskColor isDashboard={true} riskData={riskData} />}
          description="Colour coded bitcoin risk levels."
          linkTo="/risk-color"
        />

        {/* Bitcoin Risk Time In Bands */}
        <DashboardCard
          title="Time Spent in Bitcoin Risk Bands"
          component={<BitcoinRiskTimeInBands isDashboard={true} riskData={riskData} />}
          description="Time Spent as a percentage in each defined Bitcoin risk band."
          linkTo="/risk-bands"
        />

        {/* Altcoin Price Card */}
        <DashboardCard
          title="Altcoin Charts"
          component={<AltcoinPrice isDashboard={true} altcoinData={null} />}
          description="Simple price chart for a selection of altcoins and their USD / BTC pairs."
          linkTo="/altcoin-price"
        />

        {/* Market Cycles Card */}
        <DashboardCard
          title="Bitcoin Market Cycles"
          component={<MarketCycles isDashboard={true} priceData={btcData} />}
          description="Compare the previous crypto market cycles, either from the bear-market bottom or from the halving event."
          linkTo="/market-cycles"
        />

        {/* Bitcion ROI Card */}
        <DashboardCard
          title="Bitcoin ROI"
          component={<BitcoinROI isDashboard={true} priceData={btcData} />}
          description="Annualised ROI for Bitcoin."
          linkTo="/bitcoin-roi"
        />

                {/* Fear And Greed Chart Card */}
        {/* <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/fear-and-greed-chart" style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  backgroundColor: colors.primary[500],
                  border: `1px solid ${colors.greenAccent[500]}`,
                  '&:hover': {
                    boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                    cursor: 'pointer',
                  },
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                  >
                    Fear And Greed Colour Chart
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <FearAndGreedChart isDashboard={true} fearGreedData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Colour coded fear and greed levels.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid> */}

        {/* Altcoin Risk Chart */}
        {/* <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/altcoin-risk" style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  backgroundColor: colors.primary[500],
                  border: `1px solid ${colors.greenAccent[500]}`,
                  '&:hover': {
                    boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                    cursor: 'pointer',
                  },
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                  >
                    Altcoin Risk Metric
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <AltcoinRisk isDashboard={true} riskData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Risk Metric applied to a selection of altcoins.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid> */}

        {/* Inflation Chart */}
        {/* <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/us-inflation" style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  backgroundColor: colors.primary[500],
                  border: `1px solid ${colors.greenAccent[500]}`,
                  '&:hover': {
                    boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                    cursor: 'pointer',
                  },
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                  >
                    US Historical Annualised Inflation
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <UsInflationChart isDashboard={true} inflationData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Entire history of inflation rates in the United States.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid> */}

        {/* Unemployment Chart */}
        {/* <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/us-unemployment" style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  backgroundColor: colors.primary[500],
                  border: `1px solid ${colors.greenAccent[500]}`,
                  '&:hover': {
                    boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                    cursor: 'pointer',
                  },
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                  >
                    US Historical Unemployment
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <UsUnemploymentChart isDashboard={true} unemploymentData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Historical unemployment rates in the United States.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid> */}

        {/* Interest Chart */}
        {/* <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/us-interest" style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  backgroundColor: colors.primary[500],
                  border: `1px solid ${colors.greenAccent[500]}`,
                  '&:hover': {
                    boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                    cursor: 'pointer',
                  },
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                  >
                    US Historical Interest Rates
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <UsInterestChart isDashboard={true} interestData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Historical interest rates in the United States.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid> */}

        {/* Combined US Macro Chart */}
        {/* <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/us-combined-macro" style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  backgroundColor: colors.primary[500],
                  border: `1px solid ${colors.greenAccent[500]}`,
                  '&:hover': {
                    boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                    cursor: 'pointer',
                  },
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                  >
                    US Macro Information
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <UsCombinedMacroChart isDashboard={true} macroData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Compare historical US macro information.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid> */}

        {/* US Initial Claims Chart */}
        {/* <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/us-initial-claims" style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  backgroundColor: colors.primary[500],
                  border: `1px solid ${colors.greenAccent[500]}`,
                  '&:hover': {
                    boxShadow: `0 0 10px ${colors.greenAccent[500]}`,
                    cursor: 'pointer',
                  },
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    gutterBottom
                    style={{ color: colors.grey[100] }}
                  >
                    US Initial Claims
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <UsInitialClaimsChart isDashboard={true} initialClaimsData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Jobless claims in the US.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid> */}
      </Grid>
    </Box>
  );
};

export default Dashboard;