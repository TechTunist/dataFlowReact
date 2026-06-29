import { useEffect, useState } from "react";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import { Box, Typography, Button, CircularProgress, useTheme } from "@mui/material";
import { tokens } from "../theme";
import { apiUrl } from "../config/api";

export default function NewsletterUnsubscribe() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("This unsubscribe link is missing a token. Use the link from your email.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          apiUrl(`/api/newsletter/unsubscribe/?token=${encodeURIComponent(token)}`)
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Could not unsubscribe");
        }
        if (!cancelled) setStatus("success");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err.message || "Something went wrong. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary[900],
        padding: "24px",
      }}
    >
      <Box
        sx={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          padding: { xs: "28px", md: "40px" },
          backgroundColor: colors.primary[800],
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.15)",
        }}
      >
        {status === "loading" && (
          <>
            <CircularProgress sx={{ color: colors.greenAccent[500], mb: 2 }} />
            <Typography variant="h5" sx={{ color: colors.grey[100] }}>
              Updating your preferences...
            </Typography>
          </>
        )}

        {status === "success" && (
          <>
            <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
              You are unsubscribed
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 3, lineHeight: 1.6 }}>
              You will no longer receive the Cryptological weekly newsletter. You can turn it back on
              any time in Settings.
            </Typography>
            <Button
              component={RouterLink}
              to="/settings"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                "&:hover": { backgroundColor: colors.greenAccent[400] },
              }}
            >
              Email preferences
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
              Unsubscribe failed
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300], mb: 3, lineHeight: 1.6 }}>
              {errorMessage}
            </Typography>
            <Button
              component={RouterLink}
              to="/settings"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                "&:hover": { backgroundColor: colors.greenAccent[400] },
              }}
            >
              Manage in Settings
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}