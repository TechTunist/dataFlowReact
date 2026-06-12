import React, { useContext, useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Snackbar,
  Alert,
  Button,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import { useClerk, useUser } from "@clerk/clerk-react";
import { ColorModeContext, tokens } from "../../theme";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useSubscription } from "../../contexts/SubscriptionContext";

const AppControls = ({
  showAbout = true,
  showFavorite = false,
  isFavorite = false,
  onToggleFavorite,
  favoriteLoading = false,
  justify = "flex-end",
  compact = false,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { error, clearError } = useFavorites();
  const { subscriptionStatus } = useSubscription();
  const [anchorEl, setAnchorEl] = useState(null);
  const [themeAnchorEl, setThemeAnchorEl] = useState(null);
  const userPlan = subscriptionStatus?.plan || "Free";
  const currentThemeName = colorMode?.themeName || "night";

  return (
    <>
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={clearError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          action={
            error?.includes?.("Max 1 chart") && (
              <Button color="inherit" size="small" component={Link} to="/subscription">
                Upgrade Plan
              </Button>
            )
          }
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
      <Box
        display="flex"
        alignItems="center"
        justifyContent={justify}
        gap={compact ? 0 : 0.5}
        sx={{
          width: justify === "space-around" ? "100%" : "auto",
          maxWidth: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
          px: compact ? 0.25 : 0,
        }}
      >
        {showAbout && (
          <Link to="/about">
            <IconButton
              aria-label="about"
              size="small"
              sx={{ color: colors.primary[100], p: compact ? "3px" : undefined, minWidth: compact ? 32 : undefined }}
            >
              <InfoOutlinedIcon sx={{ fontSize: compact ? 18 : undefined }} />
            </IconButton>
          </Link>
        )}
        {showFavorite && onToggleFavorite && (
          <IconButton
            onClick={onToggleFavorite}
            aria-label="favorite"
            size="small"
            sx={{
              color: isFavorite ? colors.greenAccent[500] : colors.grey[100],
              opacity: favoriteLoading ? 0.5 : 1,
              pointerEvents: favoriteLoading ? "none" : "auto",
              p: compact ? "3px" : undefined,
              minWidth: compact ? 32 : undefined,
            }}
          >
            {isFavorite ? <StarIcon sx={{ fontSize: compact ? 18 : undefined }} /> : <StarBorderIcon sx={{ fontSize: compact ? 18 : undefined }} />}
          </IconButton>
        )}
        <IconButton
          onClick={(e) => setThemeAnchorEl(e.currentTarget)}
          color="inherit"
          size="small"
          aria-label="choose theme"
          sx={{ p: compact ? "3px" : undefined, minWidth: compact ? 32 : undefined }}
        >
          <PaletteOutlinedIcon sx={{ fontSize: compact ? 18 : undefined }} />
        </IconButton>
        <Menu
          anchorEl={themeAnchorEl}
          open={Boolean(themeAnchorEl)}
          onClose={() => setThemeAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              backgroundColor: colors.primary[800],
              color: colors.grey[100],
              minWidth: "188px",
              py: 0.5,
            },
          }}
        >
          {[
            { id: "night", label: "Night" },
            { id: "black", label: "Black" },
            { id: "darkGrey", label: "Dark Grey" },
            { id: "day", label: "Day" },
            { id: "dawn", label: "Dawn" },
          ].map((t) => {
            const isSelected = currentThemeName === t.id;
            return (
              <MenuItem
                key={t.id}
                selected={isSelected}
                onClick={() => {
                  colorMode?.setTheme?.(t.id);
                  setThemeAnchorEl(null);
                }}
                sx={{
                  fontSize: "13.5px",
                  py: 0.6,
                  px: 1.5,
                  "&.Mui-selected": {
                    backgroundColor: colors.primary[700],
                    "&:hover": { backgroundColor: colors.primary[600] },
                  },
                  "&:hover": { backgroundColor: colors.primary[700] },
                }}
              >
                {t.label}
                {isSelected && (
                  <Box component="span" sx={{ ml: "auto", fontSize: 11, opacity: 0.6 }}>✓</Box>
                )}
              </MenuItem>
            );
          })}
        </Menu>
        {user && (
          <>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              aria-label="account menu"
              sx={{ p: compact ? "2px" : undefined, minWidth: compact ? 32 : undefined }}
            >
              <Avatar
                sx={{
                  bgcolor: colors.greenAccent[500],
                  width: compact ? 26 : 28,
                  height: compact ? 26 : 28,
                  fontSize: compact ? "0.75rem" : "0.85rem",
                }}
              >
                {user.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "bottom", horizontal: "right" }}
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
                  {user.emailAddresses[0]?.emailAddress}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                  Plan: {userPlan}
                </Typography>
              </Box>
              <MenuItem
                onClick={() => {
                  navigate("/profile");
                  setAnchorEl(null);
                }}
                sx={{ "&:hover": { backgroundColor: colors.primary[700] } }}
              >
                <PersonOutlinedIcon sx={{ mr: 1 }} />
                View Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  navigate("/subscription");
                  setAnchorEl(null);
                }}
                sx={{ "&:hover": { backgroundColor: colors.primary[700] } }}
              >
                <PaymentOutlinedIcon sx={{ mr: 1 }} />
                Manage Subscription
              </MenuItem>
              <MenuItem
                onClick={() => {
                  navigate("/settings");
                  setAnchorEl(null);
                }}
                sx={{ "&:hover": { backgroundColor: colors.primary[700] } }}
              >
                <SettingsOutlinedIcon sx={{ mr: 1 }} />
                Settings
              </MenuItem>
              <MenuItem
                onClick={() => {
                  navigate("/change-password");
                  setAnchorEl(null);
                }}
                sx={{ "&:hover": { backgroundColor: colors.primary[700] } }}
              >
                <LockOutlinedIcon sx={{ mr: 1 }} />
                Change Password
              </MenuItem>
              <MenuItem
                onClick={async () => {
                  await signOut();
                  setAnchorEl(null);
                }}
                sx={{ "&:hover": { backgroundColor: colors.primary[700] } }}
              >
                <LogoutOutlinedIcon sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
    </>
  );
};

export default AppControls;