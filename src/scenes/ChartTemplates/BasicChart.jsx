import { Box } from "@mui/material";

const BasicChart = ({ ChartComponent, ...props }) => {
  return (
    <Box m="20px" mt="10px">
      <Box
        height="75vh"
        sx={{
          height: "75vh",
          maxHeight: {
            xs: "35vh",
            sm: "70vh",
          },
          zIndex: 1, // Ensure the chart container is below the sidebar (zIndex: 5000)
        }}
      >
        <ChartComponent {...props} />
      </Box>
    </Box>
  );
};

export default BasicChart;