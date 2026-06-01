import { Box } from "@mui/material";

const BasicChart = ({ ChartComponent, seriesId, indicatorId, chartType, explanation, height, ...props }) => {
  // Allow individual charts (especially those with tall under-chart explanations
  // like TailCurvature) to request more vertical space.
  const chartHeight = height || "75vh";
  const responsiveMax = height
    ? { xs: "50vh", sm: "80vh" } // when a custom taller height is requested, be a bit more generous on mobile
    : { xs: "35vh", sm: "70vh" };

  return (
    <Box m="20px" mt="10px">
      <Box
        height={chartHeight}
        sx={{
          height: chartHeight,
          maxHeight: responsiveMax,
          zIndex: 1,
        }}
      >
        <ChartComponent seriesId={seriesId} indicatorId={indicatorId} explanation={explanation} {...props} />
      </Box>
    </Box>
  );
};

export default BasicChart;