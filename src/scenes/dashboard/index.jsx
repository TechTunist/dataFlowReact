import { Box, Card, CardContent, Typography, Grid, useTheme } from "@mui/material";
import Header from "../../components/Header";
import BitcoinRisk from "../../components/BitcoinRisk"; 
import BitcoinPrice from "../../components/BitcoinPrice";
import EthereumRisk from "../../components/EthereumRisk"; 
import EthereumPrice from "../../components/EthereumPrice";
import PiCycleTop from "../../components/PiCycleTop";
import FearandGreed from "../../components/FearAndGreed";
import BitcoinLogRegression from "../../components/BitcoinLogRegression";
import BitcoinRiskColor from "../../components/BitcoinRiskColor";
import '../../styling/bitcoinChart.css';
import { tokens } from "../../theme";
import { Link } from "react-router-dom";


const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">

      <Grid container spacing={4}>
        
        {/* Bitcoin Price Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/bitcoin" style={{ textDecoration: 'none', color: 'inherit' }}>
                Bitcoin Historical Price
              </Typography>
              <Box height="350px" m="20px 0 0 0" style={{ margin: "0 0 20px 0" }}>
                <BitcoinPrice isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary" >
                A simple chart of the entire bitcoin daily close price history.
              </Typography>

            </CardContent>
          </Card>
        </Grid>

        {/* Bitcoin Risk Metric Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/risk" style={{ textDecoration: 'none', color: 'inherit' }}>
                Bitcoin Risk Metric
              </Typography>
              <Box height="350px" m="20px 0 0 0" style={{ margin: "0 0 20px 0" }}>
                <BitcoinRisk isDashboard={true} />
              </Box>
              <Typography
                variant="body3" color="textSecondary">
                The risk metric demonstrates the risk of holding bitcoin at any given time.
                The closer to 1, the higher the risk.
              </Typography>

            </CardContent>
          </Card>
        </Grid>


        {/* Ethereum Price Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/ethereum" style={{ textDecoration: 'none', color: 'inherit' }}>
                Ethereum Historical Price
              </Typography>
              <Box height="350px" m="20px 0 20px 0">
                <EthereumPrice isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary">
                A simple chart of the entire Ethereum daily close price history.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Ethereum Risk Metric Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/risk-eth" style={{ textDecoration: 'none', color: 'inherit' }}>
                Ethereum Risk Metric
              </Typography>
              <Box height="350px" m="20px 0 20px 0">
                <EthereumRisk isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary">
                The risk metric demonstrates the risk of holding Ethereum at any given time.
                The closer to 1, the higher the risk.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* PiCycle Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/pi-cycle" style={{ textDecoration: 'none', color: 'inherit' }}>
                PiCycle Top Indicator
              </Typography>
              <Box height="350px" m="20px 0 0 0" style={{ margin: "0 0 20px 0" }}>
                <PiCycleTop isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary" >
                The PiCycle Top Indicator was created by Philip Swift and is used to identify the top of the bitcoin market to within 3 days.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Fear and Greed Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/fear-and-greed" style={{ textDecoration: 'none', color: 'inherit' }}>
                Fear and Greed Indicator
              </Typography>
              <Box height="350px" m="20px 0 0 0" style={{ margin: "0 0 20px 0" }}>
                <FearandGreed isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary" >
                The Feed and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Bitcoin Log Regression Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/logarithmic-regression" style={{ textDecoration: 'none', color: 'inherit' }}>
                Bitcoin Logarithmic Regression
              </Typography>
              <Box height="350px" m="20px 0 0 0" style={{ margin: "0 0 20px 0" }}>
                <BitcoinLogRegression isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary" >
                Logarithmic Regression trend lines fit to the lower, upper and mid-range of Bitcoin's price history.
              </Typography>

            </CardContent>
          </Card>
        </Grid>

        {/* Bitcoin Risk Colour Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.primary[500]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom component={Link} to="/risk-color" style={{ textDecoration: 'none', color: 'inherit' }}>
                Bitcoin Risk Colour Chart
              </Typography>
              <Box height="350px" m="20px 0 0 0" style={{ margin: "0 0 20px 0" }}>
                <BitcoinRiskColor isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary" >
                Colour coded bitcoin risk levels.
              </Typography>

            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;
