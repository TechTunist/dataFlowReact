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
    "Free Charts": [
      {
        path: "/total",
        title: "Total Crypto Market Cap",
        description: "The market cap of the entire crypto market, with upper, lower and fair value logarithmic regression curves.",
        image: '../../assets/total.png',
      },
      {
        path: "/total-difference",
        title: "Market Cap Difference",
        description: "The percentage of the total market cap relative to the Fair Value of all crypto assets combined.",
        image: '../../assets/totalDifference.png',
      },
      {
        path: "/bitcoin-dominance",
        title: "Bitcoin Dominance",
        description: "Bitcoin Dominance, the percentage of the total cryptocurrency market value that Bitcoin represents.",
        image: '../../assets/btcDominance.png',
      },
      {
        path: "/logarithmic-regression",
        title: "Bitcoin Logarithmic Regression",
        description: "Logarithmic Regression trend lines for Bitcoin.",
        image: '../../assets/logRegression.png',
      },
      {
        path: "/fear-and-greed",
        title: "Fear and Greed Indicator",
        description: "The Fear and Greed index measures market sentiment.",
        image: '../../assets/fngIndicator.png',
      },
      {
        path: "/risk-bands",
        title: "Time Spent in Bitcoin Risk Bands",
        description: "Time spent in each defined risk band for Bitcoin and a selection of altcoins.",
        image: '../../assets/bandsRisk.png',
      },
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
      {
        path: "/us-initial-claims",
        title: "US Initial Claims",
        description: "US initial jobless claims.",
        image: '../../assets/initialClaims.png',
      },
    ],
    Price: [
      {
        path: "/bitcoin",
        title: "Bitcoin Price",
        description: "A simple chart of the entire Bitcoin daily close price history, with optional indicators and moving averages.",
        image: '../../assets/btcPrice.png',
      },
      {
        path: "/total",
        title: "Total Crypto Market Cap",
        description: "The market cap of the entire crypto market, with upper, lower and fair value logarithmic regression curves.",
        image: '../../assets/total.png',
      },
      {
        path: "/total-difference",
        title: "Market Cap Difference",
        description: "The percentage of the total market cap relative to the Fair Value of all crypto assets combined.",
        image: '../../assets/totalDifference.png',
      },
      {
        path: "/bitcoin-dominance",
        title: "Bitcoin Dominance",
        description: "Bitcoin Dominance, the percentage of the total cryptocurrency market value that Bitcoin represents.",
        image: '../../assets/btcDominance.png',
      },
      {
        path: "/altcoin-price",
        title: "Altcoin Charts",
        description: "Simple price chart for a selection of altcoins, with optional indicators and moving averages.",
        image: '../../assets/altcoin.png',
      },
    ],
    Risk: [
      {
        path: "/btc-20-ext",
        title: "Bitcoin Bubble Indicator",
        description: "The Bitcoin 20-Week Extension chart shows the percentage difference between the current price and the 20-week moving average, which can help to identify price bubbles.",
        image: '../../assets/btcBubble.png',
      },
      {
        path: "/risk",
        title: "Bitcoin Risk Metric and Investment Strategy Simulator",
        description: "The risk metric demonstrates the risk of holding Bitcoin at any given time, with values close to 0 indicating low risk, and values close to 1 indicating high risk. Backtest risk based investment strategies with the DCA (dollar cost average) simulation tool.",
        image: '../../assets/btcRisk.png',
      },
      {
        path: "/risk-eth",
        title: "Ethereum Risk Metric and Investment Strategy Simulator",
        description: "The risk metric demonstrates the risk of holding Ethereum at any given time, with values close to 0 indicating low risk, and values close to 1 indicating high risk. Backtest risk based investment strategies with the DCA (dollar cost average) simulation tool.",
        image: '../../assets/ethRisk.png',
      },
      {
        path: "/historical-volatility",
        title: "Historical Volatility",
        description: "The visual spikes in volatility indicate periods of significant price fluctuations, which can be useful for understanding market behavior and potential changes in price momentum after volatility peaks and changes direction.",
        image: '../../assets/volatility.png',
      },
      {
        path: "/risk-color",
        title: "Bitcoin Risk Colour Chart",
        description: "Colour coded risk levels for Bitcoin and a selection of altcoins.",
        image: '../../assets/colorRisk.png',
      },
      {
        path: "/risk-bands",
        title: "Time Spent in Bitcoin Risk Bands",
        description: "Time spent in each defined risk band for Bitcoin and a selection of altcoins.",
        image: '../../assets/bandsRisk.png',
      },
      {
        path: "/altcoin-risk",
        title: "Altcoin Risk",
        description: "Risk metric for a selection of altcoins. Values closer to 0 indicates low risk, values closer to 1 indicates high risk.",
        image: '../../assets/altRisk.png',
      },
    ],
    OnChain: [
      {
        path: "/btc-add-balance",
        title: "Bitcoin Address Balances",
        description: "This chart displays the number of Bitcoin addresses holding various levels of Bitcoin over time. This metric gives an indication of the distribution of Bitcoin wealth among holders.",
        image: '../../assets/addresses.png',
      },
      {
        path: "/puell-multiple",
        title: "Puell Multiple",
        description: "Tthe Puell Multiple compares current miner revenue to its historical average, indicating periods of high or low profitability for miners.",
        image: '../../assets/puellMultiple.png',
      },
      {
        path: "/tx-mvrv",
        title: "Bitcoin Transaction MVRV",
        description: "The relationship between Bitcoin's transactions and MVRV (market value to realised value) ratio. The ratio of the normalised transaction count and MVRV data can indicate potential market tops and bottoms.",
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
        description: "Annualised return on investment for Bitcoin, with the ability to compare the current cycle to the average of selected years.",
        image: '../../assets/btcRoi.png',
      },
      {
        path: "/running-roi",
        title: "Running ROI",
        description: "Running return on investment for Bitcoin or selected crypto assets.",
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
        description: "Average monthly ROI for Bitcoin and selected crypto assets.",
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
        description: "Colour coded chart of Fear and Greed index over time.",
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
        description: "Index indicating whether it is altseason or Bitcoin season.",
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
      // path: "/us-combined-macro",
      // title: "US Combined Macro",
      // description: "Combined US macroeconomic indicators.",
      // image: placeholderImage,
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
      {Object.entries(chartSections).map(([section, charts]) => (
        <Box key={section} mb={6}>
          <Typography variant="h3" color={colors.grey[100]} mb={1} mt={10} textAlign="left" ml={3.5} >
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