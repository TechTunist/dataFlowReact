import { Box, useTheme } from "@mui/material";
import EthereumPrice from "../../components/EthereumPrice";
import Header from "../../components/Header";
import { tokens } from "../../theme";

const Ethereum = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Box m="20px">
      <Box
        height="75vh"
        // border={`1px solid ${colors.grey[100]}`}
        // borderRadius="4px"
      >
        <EthereumPrice />
      </Box>
    </Box>
  );
};

export default Ethereum;