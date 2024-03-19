import { Box, useTheme } from "@mui/material";
import BitcoinPrice from "../../components/BitcoinPrice";
import Header from "../../components/Header";
import { tokens } from "../../theme";

const Bitcoin = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Box m="20px">
      <Box
        height="75vh"
        // border={`1px solid ${colors.grey[100]}`}
        // borderRadius="4px"
      >
        <BitcoinPrice />
      </Box>
    </Box>
  );
};

export default Bitcoin;