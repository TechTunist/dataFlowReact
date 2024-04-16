import { Typography, Box, useTheme, useMediaQuery } from "@mui/material";
import { tokens } from "../theme";

const Header = ({ title, subtitle }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // This checks if the current viewport is small.

  return (
    <Box mb="30px" style={{ paddingTop: '10%' }}>
      <Typography
        variant={isMobile ? 'h4' : 'h2'} // Smaller size for mobile
        color={colors.grey[100]}
        fontWeight="bold"
        sx={{ m: "0 0 5px 0" }}
      >
        {title}
      </Typography>
      <Typography
        variant={isMobile ? 'h6' : 'h5'} // Smaller size for mobile
        color={colors.greenAccent[500]}>
        {subtitle}
      </Typography>
    </Box>
  );
};

export default Header;
