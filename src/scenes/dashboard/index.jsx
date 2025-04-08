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

  return (
    <Box m="20px">
      <Grid container spacing={4}>
        {/* Bitcoin Price Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/bitcoin" style={{ textDecoration: "none" }}>
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
                    Bitcoin Price
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <BitcoinPrice isDashboard={true} priceData={btcData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    A simple chart of the entire bitcoin daily close price history.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Bitcoin Risk Metric Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/risk" style={{ textDecoration: "none" }}>
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
                    Bitcoin Risk Metric
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <BitcoinRisk isDashboard={true} riskData={riskData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    The risk metric demonstrates the risk of holding bitcoin at any given time.
                    The closer to 1, the higher the risk.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Total Market Cap Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/total" style={{ textDecoration: "none" }}>
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
                    Total Crypto Market Cap
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <TotalMarketCap isDashboard={true} marketCapData={marketCapData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    The market cap of the entire crypto market.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Ethereum Price Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/ethereum" style={{ textDecoration: "none" }}>
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
                    Ethereum Price
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <EthereumPrice isDashboard={true} priceData={ethData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    A simple chart of the entire Ethereum daily close price history.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Ethereum Risk Metric Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/risk-eth" style={{ textDecoration: "none" }}>
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
                    Ethereum Risk Metric
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <EthereumRisk isDashboard={true} riskData={riskData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    The risk metric demonstrates the risk of holding Eth at any given time.
                    The closer to 1, the higher the risk.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Bitcoin Dominance */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/bitcoin-dominance" style={{ textDecoration: "none" }}>
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
                    Bitcoin Dominance
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <BitcoinDominance isDashboard={true} dominanceData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Bitcoin Dominance chart over all crypto assets.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* PiCycle Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/pi-cycle" style={{ textDecoration: "none" }}>
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
                    PiCycle Top Indicator
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <PiCycleTop isDashboard={true} priceData={btcData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    The PiCycle Top Indicator was created by Philip Swift and is used to identify the top of the bitcoin market to within 3 days.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Fear and Greed Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/fear-and-greed" style={{ textDecoration: "none" }}>
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
                    Fear and Greed Indicator
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <FearandGreed isDashboard={true} fearGreedData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Bitcoin Log Regression Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/logarithmic-regression" style={{ textDecoration: "none" }}>
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
                    Bitcoin Logarithmic Regression
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <BitcoinLogRegression isDashboard={true} priceData={btcData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Logarithmic Regression trend lines fit to the lower, upper and mid-range of Bitcoin's price history.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Bitcoin Risk Colour Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/risk-color" style={{ textDecoration: "none" }}>
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
                    Bitcoin Risk Colour Chart
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <BitcoinRiskColor isDashboard={true} riskData={riskData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Colour coded bitcoin risk levels.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Bitcoin Risk Time In Bands */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/risk-bands" style={{ textDecoration: "none" }}>
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
                    Time Spent in Bitcoin Risk Bands
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <BitcoinRiskTimeInBands isDashboard={true} riskData={riskData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Time Spent as a percentage in each defined Bitcoin risk band.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Altcoin Price Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/altcoin-price" style={{ textDecoration: "none" }}>
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
                    Altcoin Charts
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <AltcoinPrice isDashboard={true} altcoinData={null} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Simple price chart for a selection of altcoins and their USD / BTC pairs.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Market Cycles Card */}
        <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/market-cycles" style={{ textDecoration: "none" }}>
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
                    Bitcoin Market Cycles
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <MarketCycles isDashboard={true} priceData={btcData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Compare the previous crypto market cycles, either from the bear-market bottom or from the halving event.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

                {/* Market Cycles Card */}
                <Grid item xs={12} lg={6}>
          <LazyLoad height={400} offset={100}>
            <Link to="/market-cycles" style={{ textDecoration: "none" }}>
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
                    Bitcoin ROI
                  </Typography>
                  {chartsVisible ? (
                    <Box height="400px" m="10px 0 0 0">
                      <BitcoinROI isDashboard={true} priceData={btcData} />
                    </Box>
                  ) : (
                    <ChartPlaceholder />
                  )}
                  <Typography variant="body3" color="textSecondary" className="dashboard-info">
                    Annualised ROI for Bitcoin.
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </LazyLoad>
        </Grid>

        {/* Fear And Greed Chart Card */}
        <Grid item xs={12} lg={6}>
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
        </Grid>

        {/* Altcoin Risk Chart */}
        <Grid item xs={12} lg={6}>
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
        </Grid>

        {/* Inflation Chart */}
        <Grid item xs={12} lg={6}>
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
        </Grid>

        {/* Unemployment Chart */}
        <Grid item xs={12} lg={6}>
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
        </Grid>

        {/* Interest Chart */}
        <Grid item xs={12} lg={6}>
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
        </Grid>

        {/* Combined US Macro Chart */}
        <Grid item xs={12} lg={6}>
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
        </Grid>

        {/* US Initial Claims Chart */}
        <Grid item xs={12} lg={6}>
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;