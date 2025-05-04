// src/scenes/Profile.js
import { useUser } from "@clerk/clerk-react";
import { Box, Typography, useTheme, Button } from "@mui/material";
import { tokens } from "../theme";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const Profile = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useUser();
  const navigate = useNavigate();

  // Placeholder for subscription plan (to be updated with Stripe integration)
  const subscriptionPlan = "Free"; // Replace with actual plan from Clerk metadata or backend

  // Format the account creation date
  const creationDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "N/A";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: colors.primary[900],
        padding: "20px",
      }}
    >
      <Header title="Profile" subtitle="Manage your account details" />
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
          Account Information
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ color: colors.grey[300] }}>
            <strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress || "N/A"}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300] }}>
            <strong>User ID:</strong> {user?.id || "N/A"}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300] }}>
            <strong>Account Created:</strong> {creationDate}
          </Typography>
        </Box>

        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Subscription
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ color: colors.grey[300] }}>
            <strong>Current Plan:</strong> {subscriptionPlan}
          </Typography>
          <Button
            onClick={() => navigate("/subscription")}
            sx={{
              mt: 1,
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              "&:hover": { backgroundColor: colors.greenAccent[600] },
            }}
          >
            Manage Subscription
          </Button>
        </Box>

        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Usage Stats
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ color: colors.grey[300] }}>
            <strong>Charts Viewed:</strong> Coming soon...
          </Typography>
          <Typography variant="body1" sx={{ color: colors.grey[300] }}>
            <strong>API Calls:</strong> Coming soon...
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
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
          <Button
            onClick={() => navigate("/settings")}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              "&:hover": { backgroundColor: colors.greenAccent[600] },
            }}
          >
            Edit Settings
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;