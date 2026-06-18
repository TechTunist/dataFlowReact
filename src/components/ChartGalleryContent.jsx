import { Box, Typography, Grid, Card, CardContent, CardMedia, useTheme, Chip } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "../theme";
import { chartSections } from "../config/chartGalleryData";

const ChartCard = ({ chart, colors, linkable, showFreeBadge }) => {
  const { path, title, description, image } = chart;
  const cardSx = {
    textDecoration: "none",
    backgroundColor: colors.primary[400],
    width: "100%",
    maxWidth: "360px",
    ...(linkable
      ? {
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: `0 4px 20px ${colors.greenAccent[500]}`,
          },
        }
      : {
          cursor: "default",
        }),
  };

  const content = (
    <>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
          <Typography variant="h5" color={colors.grey[100]} textAlign="center">
            {title}
          </Typography>
          {showFreeBadge && (
            <Chip
              label="FREE"
              size="small"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                fontWeight: "bold",
                fontSize: "0.65rem",
                height: 20,
              }}
            />
          )}
        </Box>
      </CardContent>
      {image && (
        <CardMedia
          sx={{
            padding: "7px",
            height: 200,
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
              border: `2px solid ${colors.greenAccent[500]}`,
            }}
            loading="lazy"
          />
        </CardMedia>
      )}
      <CardContent>
        <Typography variant="body2" color={colors.grey[300]} textAlign="center">
          {description}
        </Typography>
      </CardContent>
    </>
  );

  if (linkable) {
    return (
      <Card component={Link} to={path} sx={cardSx}>
        {content}
      </Card>
    );
  }

  return <Card sx={cardSx}>{content}</Card>;
};

const ChartGalleryContent = ({ linkable = true }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px" maxWidth="1200px" mx="auto">
      {Object.entries(chartSections)
        .filter(([section]) => section === "Free Charts")
        .map(([section, charts]) => (
          <Box key={section} mb={6}>
            <Typography variant="h3" color={colors.grey[100]} mb={1} mt={10} textAlign="left" ml="45%">
              {section}{" "}
              <Typography component="span" variant="body2" sx={{ color: colors.greenAccent[500], ml: 1 }}>
                (always free for all users)
              </Typography>
            </Typography>
            <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: "100%", margin: "0 auto" }}>
              {charts.map((chart) => (
                <Grid item xs={12} sm={4} key={chart.path} sx={{ display: "flex", justifyContent: "center" }}>
                  <ChartCard chart={chart} colors={colors} linkable={linkable} showFreeBadge />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      <Box mb={6}>
        <Typography variant="h3" color={colors.grey[100]} mb={3} mt={12} textAlign="left" ml="43%">
          Premium Charts
        </Typography>
        {Object.entries(chartSections)
          .filter(([section]) => section !== "Free Charts")
          .map(([subSection, charts]) => (
            <Box key={subSection} mb={4}>
              <Typography variant="h4" color={colors.grey[100]} mb={1} textAlign="left" ml={3.5}>
                {subSection}
              </Typography>
              <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: "100%", margin: "0 auto" }}>
                {charts.map((chart) => (
                  <Grid item xs={12} sm={4} key={chart.path} sx={{ display: "flex", justifyContent: "center" }}>
                    <ChartCard chart={chart} colors={colors} linkable={linkable} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

export default ChartGalleryContent;