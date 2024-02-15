import { Box, useTheme } from "@mui/material";
import EthereumRisk from "../../components/EthereumRisk";
import Header from "../../components/Header";
import { tokens } from "../../theme";

const RiskEthereum = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Box m="20px">
      <Header title="Ethereum" subtitle="Ethereum Risk Chart" />

      <Box
        height="75vh"
        // border={`1px solid ${colors.grey[100]}`}
        // borderRadius="4px"
      >
        <EthereumRisk />
      </Box>
    </Box>
  );
};

export default RiskEthereum;