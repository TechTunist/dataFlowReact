import React from 'react';
import { Box, IconButton } from '@mui/material';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import { useTheme } from '@mui/material';
import { tokens } from '../../theme';
import AppControls from './AppControls';

/**
 * Slim fixed bar on mobile chart pages (no main Topbar): menu + theme/account.
 * Desktop chart pages are unchanged (no chrome bar).
 */
const MobileChartChrome = ({ setIsSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      className="mobile-chart-chrome"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
        px: 0.5,
        pt: 'env(safe-area-inset-top, 0px)',
        backgroundColor: colors.primary[400],
        borderBottom: `1px solid ${colors.greenAccent[500]}`,
        boxSizing: 'border-box',
      }}
    >
      <IconButton
        onClick={() => setIsSidebar(true)}
        aria-label="open navigation"
        size="small"
        sx={{ color: colors.primary[100] }}
      >
        <MenuOutlinedIcon />
      </IconButton>
      <AppControls showAbout compact justify="flex-end" />
    </Box>
  );
};

export default MobileChartChrome;