// src/scenes/ChangePassword.js
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Box, Typography, useTheme, TextField, Button, Alert } from "@mui/material";
import { tokens } from "../theme";
import Header from "../components/Header";

const ChangePassword = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.errors?.[0]?.message || "Failed to update password.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: colors.primary[900],
        padding: "20px",
      }}
    >
      <Header title="Change Password" subtitle="Update your account password" />
      <Box
        sx={{
          maxWidth: "500px",
          margin: "0 auto",
          backgroundColor: colors.primary[800],
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <form onSubmit={handleChangePassword}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              type="password"
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              variant="outlined"
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
              }}
            />
            <TextField
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              variant="outlined"
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
              }}
            />
            <TextField
              type="password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              variant="outlined"
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
              }}
            />
            <Button
              type="submit"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                "&:hover": { backgroundColor: colors.greenAccent[600] },
              }}
            >
              Update Password
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
};

export default ChangePassword;