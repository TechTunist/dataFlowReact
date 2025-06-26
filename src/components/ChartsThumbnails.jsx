import { Box, Typography, List, ListItem, ListItemText, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "../theme";

const Charts = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const chartList = [
    { path: "/btc-20-ext", title: "Bitcoin 20 Week Extension" },
    { path: "/bitcoin", title: "Bitcoin Price" },
    { path: "/total", title: "Total Crypto Market Cap" },
    // ... add all chartConfig entries ...
    { path: "/fred/german-bond-yield", title: "German 10-Year Bond Yield" },
    { path: "/workbench", title: "Workbench Chart" },
  ];

  return (
    <Box m="20px">
      <Typography variant="h2" color={colors.grey[100]} mb={4}>
        Available Charts
      </Typography>
      <List>
        {chartList.map(({ path, title }) => (
          <ListItem key={path} component={Link} to={path} sx={{ color: colors.grey[100], '&:hover': { color: colors.greenAccent[500] } }}>
            <ListItemText primary={title} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Charts;