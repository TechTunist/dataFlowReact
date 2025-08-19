// src/scenes/Settings.js
import { Box, Typography, useTheme, Button, FormControlLabel, Switch } from "@mui/material";
import { tokens } from "../theme";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useState } from "react";

const Settings = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const [emailNotifications, setEmailNotifications] = useState(true);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: colors.primary[900],
        padding: "20px",
      }}
    >
      <Header title="Settings" subtitle="Customize your preferences" />
      <Box
        sx={{
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: colors.primary[800],
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Preferences
        </Typography>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: colors.greenAccent[500],
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: colors.greenAccent[500],
                  },
                }}
              />
            }
            label="Email Notifications"
            sx={{ color: colors.grey[100] }}
          />
          <Typography variant="body2" sx={{ color: colors.grey[100], ml: 4 }}>
            Receive email updates about new features and subscription changes.
          </Typography>
        </Box>

        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Account
        </Typography>
        <Box>
          <Button
            onClick={() => navigate("/change-password")}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              "&:hover": { backgroundColor: colors.greenAccent[600] },
            }}
          >
            Change Password
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;