import { Box, Card, CardContent, Typography, Grid, useTheme } from "@mui/material";
import Header from "../../components/Header";
import BitcoinRisk from "../../components/BitcoinRisk"; 
import BitcoinPrice from "../../components/BitcoinPrice";
import EthereumRisk from "../../components/EthereumRisk"; 
import EthereumPrice from "../../components/EthereumPrice";
import PiCycleTop from "../../components/PiCycleTop";
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
              <Box m="20px 0 0 0" style={{ margin: "0 0 10px 0" }}>
                <Typography variant="body1" color="textSecondary">
                  Log or linear
                </Typography>
              </Box>
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
              <Box m="20px 0 0 0" style={{ margin: "0 0 10px 0" }}>
                <Typography variant="body1" color="textSecondary">
                    Measured between 0 and 1
                </Typography>
              </Box>
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
              <Box m="20px 0 0 0">
                <Typography variant="body1" color="textSecondary">
                  Log or linear
                </Typography>
              </Box>
              <Box height="350px" m="20px 0 20px 0">
                <EthereumPrice isDashboard={true} />
              </Box>
              <Typography variant="body2" color="textSecondary">
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
              <Box m="20px 0 0 0">
                <Typography variant="body1" color="textSecondary">
                    Measured between 0 and 1
                </Typography>
              </Box>
              <Box height="350px" m="20px 0 20px 0">
                <EthereumRisk isDashboard={true} />
              </Box>
              <Typography variant="body2" color="textSecondary">
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
              <Box m="20px 0 0 0" style={{ margin: "0 0 10px 0" }}>
                <Typography variant="body1" color="textSecondary">
                  Log or linear
                </Typography>
              </Box>
              <Box height="350px" m="20px 0 0 0" style={{ margin: "0 0 20px 0" }}>
                <PiCycleTop isDashboard={true} />
              </Box>
              <Typography variant="body3" color="textSecondary" >
                The PiCycle Top Indicator was created by Philip Swift and is used to identify the top of the bitcoin market to within 3 days.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;
