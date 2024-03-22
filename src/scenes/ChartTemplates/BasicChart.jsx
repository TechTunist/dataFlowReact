import { Box } from "@mui/material";

const BasicChart = ({ ChartComponent }) => {

  return (
    <Box m="20px">
      <Box
        height="75vh"
        sx={{
          height: "75vh", // Default height
          maxHeight: {
            xs: "55vh", // On extra-small devices (mobile)
            sm: "75vh", // On small devices and up, use the default height
          },
        }}
      >
        {/* Render the passed chart component */}
        <ChartComponent />
      </Box>
    </Box>
  );
};

export default BasicChart;