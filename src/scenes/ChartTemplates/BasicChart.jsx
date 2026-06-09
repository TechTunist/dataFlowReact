import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import useIsMobile from "../../hooks/useIsMobile";
import ChartCardShell from "./ChartCardShell";
import { ChartPageFooterProvider } from "./ChartPageFooterContext";
import { getTitleAndSubtitle, routeToChartId } from "./chartPageMeta";

const BasicChart = ({
  ChartComponent,
  seriesId,
  indicatorId,
  chartType,
  explanation,
  chartMinHeight,
  ...props
}) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { title, subtitle } = getTitleAndSubtitle(location.pathname, isMobile);
  const chartId = routeToChartId[location.pathname];

  const chartAreaMinHeight = chartMinHeight || "clamp(400px, 62vh, 780px)";

  return (
    <Box m="20px" mt="10px">
      <ChartPageFooterProvider>
        <ChartCardShell title={title} subtitle={subtitle} chartId={chartId}>
          <Box
            className="chart-page-content"
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              "--chart-area-min-height": chartAreaMinHeight,
            }}
          >
            <ChartComponent
              seriesId={seriesId}
              indicatorId={indicatorId}
              chartType={chartType}
              explanation={explanation}
              isChartPage
              {...props}
            />
          </Box>
        </ChartCardShell>
      </ChartPageFooterProvider>
    </Box>
  );
};

export default BasicChart;