import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Box, Typography, useTheme, FormControlLabel, Switch, Button } from "@mui/material";
import { tokens } from "../theme";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch initial emailNotifications
  useEffect(() => {
    const fetchSettings = async () => {
      if (!isSignedIn || !user) return;
      setLoading(true);
      try {
        const token = await getToken();
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/user-settings/get/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();
        setEmailNotifications(data.emailNotifications);
      } catch (err) {
        setError("Failed to load settings: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isSignedIn, user, getToken]);

  const handleEmailNotificationsChange = async (e) => {
    const newValue = e.target.checked;
    setEmailNotifications(newValue);
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/user-settings/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailNotifications: newValue }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
    } catch (err) {
      setError("Failed to save settings: " + err.message);
      setEmailNotifications(!newValue); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: colors.primary[900], padding: "20px" }}>
      <Header title="Settings" subtitle="Customize your preferences" />
      <Box sx={{ maxWidth: "800px", margin: "0 auto", backgroundColor: colors.primary[800], borderRadius: "8px", padding: "20px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
        {error && <Typography variant="body1" sx={{ color: colors.redAccent[500], mb: 2 }}>{error}</Typography>}
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>Preferences</Typography>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={emailNotifications}
                onChange={handleEmailNotificationsChange}
                disabled={loading}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: colors.greenAccent[500] },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: colors.greenAccent[500] },
                }}
              />
            }
            label="Weekly Newsletter"
            sx={{ color: colors.grey[100] }}
          />
          <Typography variant="body2" sx={{ color: colors.grey[100], ml: 4 }}>
            Receive our weekly newsletter with market insights and updates.
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>Account</Typography>
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