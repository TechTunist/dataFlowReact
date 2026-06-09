import { createContext, useContext, useState } from 'react';
import { Box } from '@mui/material';

const ChartPageFooterContext = createContext(null);

export const ChartPageFooterProvider = ({ children }) => {
  const [footer, setFooter] = useState(null);

  return (
    <ChartPageFooterContext.Provider value={setFooter}>
      {children}
      {footer && (
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: '100%',
            maxWidth: '1400px',
            mx: 'auto',
          }}
        >
          {footer}
        </Box>
      )}
    </ChartPageFooterContext.Provider>
  );
};

export const useChartPageFooter = () => useContext(ChartPageFooterContext);