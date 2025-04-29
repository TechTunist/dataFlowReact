// src/scenes/subscription/index.jsx
import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";

const Subscription = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">
      <Header title="Subscription" subtitle="Manage your subscription" />
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="60vh"
        flexDirection="column"
      >
        <Typography variant="h4" color={colors.grey[100]}>
          Subscription Page - Coming Soon
        </Typography>
        <Typography variant="body1" color={colors.grey[300]} mt={2}>
          Here you will be able to manage your subscription plan.
        </Typography>
      </Box>
    </Box>
  );
};

export default Subscription;