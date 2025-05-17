// src/scenes/global/AccountNavBar.js
import { useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Box, Typography, Button, Menu, MenuItem, Avatar, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import useIsMobile from "../../hooks/useIsMobile"; // Import the hook

const AccountNavBar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [anchorEl, setAnchorEl] = useState(null);
  const isMobile = useIsMobile(); // Use the hook to determine if on mobile

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut();
    handleMenuClose();
  };

  // Define the menu items with their paths and icons
  const menuItems = [
    { label: "Profile", path: "/profile", icon: <PersonOutlinedIcon sx={{ mr: 1 }} /> },
    { label: "Subscription", path: "/subscription", icon: <PaymentOutlinedIcon sx={{ mr: 1 }} /> },
    { label: "Settings", path: "/settings", icon: <SettingsOutlinedIcon sx={{ mr: 1 }} /> },
    { label: "Password", path: "/change-password", icon: <LockOutlinedIcon sx={{ mr: 1 }} /> },
  ];

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "65px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        backgroundColor: colors.primary[800],
        borderBottom: `1px solid ${colors.grey[700]}`,
        zIndex: 1000,
      }}
    >
      {/* Back to Dashboard Button */}
      <Button
        onClick={() => navigate("/dashboard")}
        startIcon={<ArrowBackIcon />}
        sx={{
          color: colors.grey[100],
          "&:hover": { backgroundColor: colors.primary[700] },
          minWidth: isMobile ? "40px" : "auto", // Reduce button width on mobile
          padding: isMobile ? "0" : "6px 16px", // Adjust padding on mobile
        }}
      >
        {!isMobile && "Back to Dashboard"} {/* Hide text on mobile */}
      </Button>

      {/* Navigation Links */}
      <Box sx={{ display: "flex", gap: 2 }}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{ textDecoration: "none" }}
          >
            <Typography
              sx={{
                color:
                  location.pathname === item.path
                    ? colors.greenAccent[500]
                    : colors.grey[100],
                fontWeight: location.pathname === item.path ? "bold" : "normal",
                "&:hover": { color: colors.grey[100] },
                fontSize: isMobile ? "0.9rem" : "1rem", // Slightly smaller text on mobile
              }}
            >
              {item.label}
            </Typography>
          </Link>
        ))}
      </Box>

      {/* User Avatar and Logout Menu */}
      <Box>
        <Button onClick={handleMenuOpen}>
          <Avatar
            sx={{
              bgcolor: colors.greenAccent[500],
              width: 32,
              height: 32,
              fontSize: "1rem",
            }}
          >
            {user?.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase()}
          </Avatar>
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              backgroundColor: colors.primary[800],
              color: colors.grey[100],
              minWidth: "200px",
            },
          }}
        >
          <Box
            sx={{
              padding: "8px 16px",
              borderBottom: `1px solid ${colors.grey[700]}`,
              backgroundColor: colors.primary[900],
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              {user?.emailAddresses[0]?.emailAddress}
            </Typography>
          </Box>
          <MenuItem
            onClick={handleLogout}
            sx={{
              "&:hover": { backgroundColor: colors.primary[700] },
            }}
          >
            <LogoutOutlinedIcon sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default AccountNavBar;