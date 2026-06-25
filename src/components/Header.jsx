import { Typography, Box, useTheme, useMediaQuery } from "@mui/material";
import { tokens } from "../theme";

const Header = ({ title, subtitle }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isNarrow = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ mb: isNarrow ? "4px" : "17px", px: isNarrow ? 0.5 : 0, minWidth: 0 }}>
      <Typography
        variant={isNarrow ? "h5" : "h3"}
        color={colors.grey[100]}
        sx={{
          m: isNarrow ? "4px 0 2px 0" : "15px 0 5px 0",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        noWrap={isNarrow}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          color={colors.greenAccent[500]}
          sx={{
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          noWrap={isNarrow}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default Header;