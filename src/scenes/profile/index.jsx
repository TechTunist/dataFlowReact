// src/scenes/profile/index.jsx
import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";

const Profile = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">
      <Header title="Profile" subtitle="Manage your account" />
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="60vh"
        flexDirection="column"
      >
        <Typography variant="h4" color={colors.grey[100]}>
          Profile Page - Coming Soon
        </Typography>
        <Typography variant="body1" color={colors.grey[300]} mt={2}>
          Here you will be able to view and edit your profile details.
        </Typography>
      </Box>
    </Box>
  );
};

export default Profile;