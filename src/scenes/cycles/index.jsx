import { Box, useTheme } from "@mui/material";
import BitcoinCycles from "../../components/BitcoinCycles";
import Header from "../../components/Header";
import { tokens } from "../../theme";

const Cycles = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Box m="20px">
      <Header title="Bitcoin Cycles" subtitle="Bitcoin from Cycle Bottom" />

      <Box
        height="75vh"
        // border={`1px solid ${colors.grey[100]}`}
        // borderRadius="4px"
      >
        <BitcoinCycles />
      </Box>
    </Box>
  );
};

export default Cycles;