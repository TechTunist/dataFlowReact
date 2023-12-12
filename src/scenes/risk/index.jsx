import { Box, useTheme } from "@mui/material";
import BitcoinRisk from "../../components/BitcoinRisk";
import Header from "../../components/Header";
import { tokens } from "../../theme";

const Risk = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Box m="20px">
      <Header title="Bitcoin" subtitle="Risk Chart" />

      <Box
        height="75vh"
        border={`1px solid ${colors.grey[100]}`}
        borderRadius="4px"
      >
        <BitcoinRisk />
      </Box>
    </Box>
  );
};

export default Risk;