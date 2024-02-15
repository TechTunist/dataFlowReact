import { Box, Card, CardContent, Typography, Grid, useTheme } from "@mui/material";
import Header from "../../components/Header";
import BitcoinRisk from "../../components/BitcoinRisk"; 
import BitcoinPrice from "../../components/BitcoinPrice"; 
import '../../styling/bitcoinChart.css';
import { tokens } from "../../theme";


const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">
      <Header title="DASHBOARD" subtitle="Welcome to your dashboard" />

      <Grid container spacing={3}>
        {/* Bitcoin Price Card */}
        <Grid item xs={12} md={6}>
          <Card style={{backgroundColor: colors.blueAccent[900]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
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
          <Card style={{backgroundColor: colors.blueAccent[900]}}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
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
      </Grid>
    </Box>
  );
};

export default Dashboard;
