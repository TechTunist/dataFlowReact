import { Box, Card, CardContent, Typography, Grid } from "@mui/material";
import Header from "../../components/Header";
import BitcoinRisk from "../../components/BitcoinRisk"; // Thumbnail component
import BitcoinPrice from "../../components/BitcoinPrice"; // Thumbnail component
import BitcoinCycles from "../../components/BitcoinCycles"; // Thumbnail component

const Dashboard = () => {
  return (
    <Box m="20px">
      <Header title="DASHBOARD" subtitle="Welcome to your dashboard" />

      <Grid container spacing={3}>
        {/* Bitcoin Price Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Bitcoin Historical Price
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Log or linear
              </Typography>
              <Box height="250px" m="20px 0 0 0">
                <BitcoinPrice isDashboard={true} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bitcoin Risk Metric Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Bitcoin Risk Metric
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Measured between 0 and 1
              </Typography>
              <Box height="250px" m="20px 0 0 0">
                <BitcoinRisk isDashboard={true} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bitcoin Cycles Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Bitcoin Cycles
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Measured from bottom to top
              </Typography>

              <Box height="250px" m="20px 0 0 0">
                <BitcoinCycles isDashboard={true} />
              </Box>

              {/* <BitcoinCycles /> */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
