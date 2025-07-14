import { Box, Typography, Grid, Card, CardContent, CardMedia, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "../theme";

// Placeholder image (replace with actual chart images later)
const placeholderImage = "https://via.placeholder.com/300x200?text=Chart+Image";

const Charts = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Organized chart data by sections
  const chartSections = {
    Price: [
      {
        path: "/bitcoin",
        title: "Bitcoin Price",
        description: "A simple chart of the entire Bitcoin daily close price history.",
        image: '../../assets/btcPrice.png',
      },
      {
        path: "/total",
        title: "Total Crypto Market Cap",
        description: "The market cap of the entire crypto market.",
        image: '../../assets/total.png',
      },
      {
        path: "/total-difference",
        title: "Market Cap Difference",
        description: "Difference in market cap across assets.",
        image: '../../assets/totalDifference.png',
      },
      {
        path: "/bitcoin-dominance",
        title: "Bitcoin Dominance",
        description: "Bitcoin Dominance chart over all crypto assets.",
        image: '../../assets/btcDominance.png',
      },
      {
        path: "/altcoin-price",
        title: "Altcoin Charts",
        description: "Simple price chart for a selection of altcoins.",
        image: '../../assets/altcoin.png',
      },
    ],
    Risk: [
      {
        path: "/btc-20-ext",
        title: "Bitcoin 20 Week Extension",
        description: "Bitcoin price with 20-week extension analysis.",
        image: '../../assets/btcBubble.png',
      },
      {
        path: "/risk",
        title: "Bitcoin Risk Metric",
        description: "The risk metric demonstrates the risk of holding Bitcoin at any given time.",
        image: '../../assets/btcRisk.png',
      },
      {
        path: "/risk-eth",
        title: "Ethereum Risk Metric",
        description: "The risk metric demonstrates the risk of holding Ethereum at any given time.",
        image: '../../assets/ethRisk.png',
      },
      {
        path: "/historical-volatility",
        title: "Historical Volatility",
        description: "Historical volatility of Bitcoin.",
        image: '../../assets/volatility.png',
      },
      {
        path: "/risk-color",
        title: "Bitcoin Risk Colour Chart",
        description: "Colour coded Bitcoin risk levels.",
        image: '../../assets/colorRisk.png',
      },
      {
        path: "/risk-bands",
        title: "Time Spent in Bitcoin Risk Bands",
        description: "Time spent in each defined Bitcoin risk band.",
        image: '../../assets/bandsRisk.png',
      },
      {
        path: "/altcoin-risk",
        title: "Altcoin Risk",
        description: "Risk metrics for altcoins.",
        image: '../../assets/altRisk.png',
      },
    ],
    OnChain: [
      {
        path: "/btc-add-balance",
        title: "Bitcoin Address Balances",
        description: "Bitcoin address balances over time.",
        image: '../../assets/addresses.png',
      },
      {
        path: "/puell-multiple",
        title: "Puell Multiple",
        description: "Puell Multiple indicator for Bitcoin mining.",
        image: '../../assets/puellMultiple.png',
      },
      {
        path: "/tx-mvrv",
        title: "Bitcoin Transaction MVRV",
        description: "Bitcoin MVRV ratio for transactions.",
        image: '../../assets/txMvrv.png',
      },
      {
        path: "/on-chain-historical-risk",
        title: "On-Chain Historical Risk",
        description: "Historical risk based on on-chain data.",
        image: '../../assets/onchainRisk.png',
      },
    ],
    Indicators: [
      {
        path: "/bitcoin-roi",
        title: "Bitcoin ROI",
        description: "Annualised ROI for Bitcoin.",
        image: '../../assets/btcRoi.png',
      },
      {
        path: "/running-roi",
        title: "Running ROI",
        description: "Running return on investment for Bitcoin.",
        image: '../../assets/runningRoi.png',
      },
      {
        path: "/monthly-returns",
        title: "Bitcoin Monthly Returns",
        description: "Monthly returns for Bitcoin.",
        image: '../../assets/monthlyReturns.png',
      },
      {
        path: "/monthly-average-roi",
        title: "Monthly Average ROI",
        description: "Average monthly ROI for Bitcoin.",
        image: '../../assets/avgRoi.png',
      },
      {
        path: "/pi-cycle",
        title: "PiCycle Top Indicator",
        description: "The PiCycle Top Indicator for Bitcoin market tops.",
        image: '../../assets/piCycle.png',
      },
      {
        path: "/fear-and-greed",
        title: "Fear and Greed Indicator",
        description: "The Fear and Greed index measures market sentiment.",
        image: '../../assets/fngIndicator.png',
      },
      {
        path: "/fear-and-greed-chart",
        title: "Fear and Greed Chart",
        description: "Chart of Fear and Greed index over time.",
        image: '../../assets/fngChart.png',
      },
      {
        path: "/logarithmic-regression",
        title: "Bitcoin Logarithmic Regression",
        description: "Logarithmic Regression trend lines for Bitcoin.",
        image: '../../assets/logRegression.png',
      },
      {
        path: "/market-cycles",
        title: "Bitcoin Market Cycles",
        description: "Compare previous crypto market cycles.",
        image: '../../assets/cycles.png',
      },
      {
        path: "/altcoin-season-index",
        title: "Altcoin Season Index",
        description: "Index indicating altcoin season trends.",
        image: '../../assets/altSeason.png',
      },
      {
        path: "/sp500-roi",
        title: "S&P 500 ROI",
        description: "Annualised ROI of the S&P 500.",
        image: '../../assets/spxRoi.png',
      },
    ],
    Macro: [
      {
        path: "/us-inflation",
        title: "US Inflation",
        description: "US inflation rates over time.",
        image: '../../assets/inflation.png',
      },
      {
        path: "/us-interest",
        title: "US Interest Rates",
        description: "US interest rates over time.",
        image: '../../assets/interest.png',
      },
      // {
      //   path: "/us-combined-macro",
      //   title: "US Combined Macro",
      //   description: "Combined US macroeconomic indicators.",
      //   image: placeholderImage,
      // },
      {
        path: "/us-initial-claims",
        title: "US Initial Claims",
        description: "US initial jobless claims.",
        image: '../../assets/initialClaims.png',
      },
      {
        path: "/fred/fed-funds-rate",
        title: "Federal Funds Rate",
        description: "Daily Effective Federal Funds Rate in the US.",
        image: '../../assets/effFedFunds.png',
      },
      {
        path: "/fred/sp500",
        title: "S&P 500 Index",
        description: "Daily closing values of the S&P 500 Index.",
        image: '../../assets/spx.png',
      },
      {
        path: "/fred/recession-indicator",
        title: "US Recession Indicator",
        description: "Periods of recession in the US.",
        image: '../../assets/recindicator.png',
      },
      {
        path: "/fred/cpi",
        title: "US Consumer Price Index",
        description: "Consumer Price Index for All Urban Consumers.",
        image: '../../assets/cpi.png',
      },
      {
        path: "/fred/unemployment-rate",
        title: "US Unemployment Rate",
        description: "Monthly US unemployment rate.",
        image: '../../assets/unemployment.png',
      },
      {
        path: "/fred/10-year-treasury",
        title: "10-Year Treasury Yield",
        description: "Daily 10-Year Treasury Note yield.",
        image: '../../assets/10year.png',
      },
      {
        path: "/fred/10y-2y-spread",
        title: "10Y-2Y Treasury Spread",
        description: "Spread between 10-Year and 2-Year Treasury yields.",
        image: '../../assets/10year2year.png',
      },
      {
        path: "/fred/5y-inflation-expectation",
        title: "5-Year Inflation Expectation",
        description: "Market's expected average annual inflation rate over 5 years.",
        image: '../../assets/inflationExpectation.png',
      },
      {
        path: "/fred/euro-dollar",
        title: "Euro to US Dollar",
        description: "Daily exchange rate of Euro to US Dollar.",
        image: '../../assets/euroUsd.png',
      },
      {
        path: "/fred/crude-oil",
        title: "WTI Crude Oil Price",
        description: "Daily West Texas Intermediate crude oil price.",
        image: '../../assets/oil.png',
      },
      {
        path: "/fred/producer-price",
        title: "Producer Price Index",
        description: "Monthly Producer Price Index for All Commodities.",
        image: '../../assets/ppi.png',
      },
      {
        path: "/fred/nonfarm-payrolls",
        title: "Nonfarm Payrolls",
        description: "Monthly total nonfarm payroll employment in the US.",
        image: '../../assets/nonfarmPayrolls.png',
      },
      {
        path: "/fred/gdp",
        title: "US Real GDP",
        description: "Quarterly Real Gross Domestic Product in the US.",
        image: '../../assets/gdp.png',
      },
      {
        path: "/fred/gdp-growth",
        title: "US Real GDP Growth",
        description: "Quarterly Real GDP growth rate in the US.",
        image: '../../assets/gdpGrowth.png',
      },
      {
        path: "/fred/m1-money-supply",
        title: "M1 Money Supply",
        description: "Monthly M1 money supply in the US.",
        image: '../../assets/m1.png',
      },
      {
        path: "/fred/m2-money-supply",
        title: "M2 Money Supply",
        description: "Monthly M2 money supply in the US.",
        image: '../../assets/m2.png',
      },
      {
        path: "/fred/consumer-sentiment",
        title: "Consumer Sentiment",
        description: "Monthly University of Michigan Consumer Sentiment Index.",
        image: '../../assets/consumerSentiment.png',
      },
      {
        path: "/fred/vix",
        title: "VIX Volatility Index",
        description: "Daily CBOE Volatility Index (VIX).",
        image: '../../assets/vix.png',
      },
      {
        path: "/fred/ted-spread",
        title: "TED Spread",
        description: "Daily TED Spread between LIBOR and T-Bill rates.",
        image: '../../assets/ted.png',
      },
      {
        path: "/fred/yen-dollar",
        title: "Yen to US Dollar",
        description: "Daily exchange rate of Japanese Yen to US Dollar.",
        image: '../../assets/yen.png',
      },
      {
        path: "/fred/pound-dollar",
        title: "Pound to US Dollar",
        description: "Daily exchange rate of British Pound to US Dollar.",
        image: '../../assets/pound.png',
      },
      {
        path: "/fred/cad-dollar",
        title: "CAD to US Dollar",
        description: "Daily exchange rate of Canadian Dollar to US Dollar.",
        image: '../../assets/cad.png',
      },
      {
        path: "/fred/chicago-fed-index",
        title: "Chicago Fed Index",
        description: "Monthly Chicago Fed National Activity Index.",
        image: '../../assets/chicagoFed.png',
      },
      {
        path: "/fred/economic-policy-uncertainty",
        title: "Economic Policy Uncertainty",
        description: "Daily US Economic Policy Uncertainty Index.",
        image: '../../assets/uncertainty.png',
      },
      {
        path: "/fred/housing-starts",
        title: "US Housing Starts",
        description: "Monthly US Housing Starts.",
        image: '../../assets/housingStarts.png',
      },
      {
        path: "/fred/case-shiller",
        title: "Case-Shiller Home Price Index",
        description: "Monthly S&P/Case-Shiller US Home Price Index.",
        image: '../../assets/homePriceIndex.png',
      },
      {
        path: "/fred/nikkei-225",
        title: "Nikkei 225 Index",
        description: "Daily Nikkei 225 Index.",
        image: '../../assets/nikkei.png',
      },
      {
        path: "/fred/german-bond-yield",
        title: "German 10-Year Bond Yield",
        description: "Monthly German 10-Year Government Bond Yield.",
        image: '../../assets/german10year.png',
      },
    ],
    Workbench: [
      {
        path: "/workbench",
        title: "Workbench Chart",
        description: "Custom indicator chart for comparing data series.",
        image: '../../assets/workbench.png',
      },
    ],
  };

  return (
    <Box m="20px" maxWidth="1200px" mx="auto">
      <Typography variant="h2" color={colors.grey[100]} mb={4} textAlign="center">
        Available Charts
      </Typography>
      {Object.entries(chartSections).map(([section, charts]) => (
        <Box key={section} mb={6}>
          <Typography variant="h4" color={colors.grey[100]} mb={3} textAlign="center">
            {section}
          </Typography>
          <Grid
            container
            spacing={3}
            justifyContent="center"
            sx={{ maxWidth: "100%", margin: "0 auto" }}
          >
            {charts.map(({ path, title, description, image }) => (
              <Grid item xs={12} sm={4} key={path} sx={{ display: "flex", justifyContent: "center" }}>
                <Card
                  component={Link}
                  to={path}
                  sx={{
                    textDecoration: "none",
                    backgroundColor: colors.primary[400],
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "scale(1.05)",
                      boxShadow: `0 4px 20px ${colors.greenAccent[500]}`,
                    },
                    width: "100%",
                    maxWidth: "360px",
                  }}
                >
                  {/* Title Section */}
                  <CardContent>
                    <Typography
                      variant="h5"
                      color={colors.grey[100]}
                      textAlign="center"
                    >
                      {title}
                    </Typography>
                  </CardContent>
                  {/* Image Section with Padding */}
                  <CardMedia
                    sx={{
                      padding: "7px", // Padding around the image container
                      height: 200, // Maintain height for layout consistency
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      component="img"
                      src={image}
                      alt={`${title} chart`}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        border: `2px solid ${colors.greenAccent[500]}`, // Border tight around the image
                      }}
                      loading="lazy"
                    />
                  </CardMedia>
                  {/* Description Section */}
                  <CardContent>
                    <Typography
                      variant="body2"
                      color={colors.grey[300]}
                      textAlign="center"
                    >
                      {description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default Charts;