// src/scenes/Subscription.js
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Box, Typography, useTheme, Button, Alert } from "@mui/material";
import { tokens } from "../theme";
import Header from "../components/Header";
import { useUser } from "@clerk/clerk-react";

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const Subscription = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useUser();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Placeholder for current plan (to be updated with Clerk metadata later)
  const currentPlan = "Free";

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");

    try {
      // Call your Django backend to create a Stripe Checkout session
      const response = await fetch("https://vercel-dataflow.vercel.app/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: "price_xxxxxxxxxx", // Replace with your Premium plan Price ID
          successUrl: `${window.location.origin}/subscription?success=true`,
          cancelUrl: `${window.location.origin}/subscription?canceled=true`,
          userId: user.id, // Pass the Clerk user ID to associate with the subscription
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create Checkout session");
      }

      const session = await response.json();
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: session.id });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("Failed to initiate checkout. Please try again.");
    } finally {
      setLoading(false);
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
      <Header title="Subscription" subtitle="Manage your plan" />
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Current Plan
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: colors.grey[300], mb: 1 }}>
            <strong>Plan:</strong> {currentPlan}
          </Typography>
          {currentPlan === "Free" && (
            <>
              <Typography variant="body1" sx={{ color: colors.grey[300], mb: 2 }}>
                Upgrade to Premium for access to exclusive charts and features.
              </Typography>
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                sx={{
                  backgroundColor: colors.greenAccent[500],
                  color: colors.grey[900],
                  "&:hover": { backgroundColor: colors.greenAccent[600] },
                }}
              >
                {loading ? "Processing..." : "Upgrade to Premium"}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Subscription;