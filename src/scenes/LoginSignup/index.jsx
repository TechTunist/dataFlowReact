// src/scenes/LoginSignup.js
import { useState } from "react";
import { useSignUp, useSignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, Button, useTheme } from "@mui/material";
import { tokens } from "../../theme";

export default function LoginSignup() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isSignUp, setIsSignUp] = useState(true); // Toggle between sign-up and sign-in
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const { signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const navigate = useNavigate();

  // Handle Sign-Up
  const onSignUpPress = async () => {
    if (!signUp) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification();
      setPendingVerification(true);
    } catch (err) {
      console.error("Sign-up error:", JSON.stringify(err, null, 2));
      alert("Sign-up failed: " + (err.errors?.[0]?.message || "Unknown error"));
    }
  };

  // Handle Email Verification
  const onVerifyPress = async () => {
    if (!signUp) return;

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      } else {
        console.log("Verification incomplete:", result);
        alert("Verification incomplete. Please try again.");
      }
    } catch (err) {
      console.error("Verification error:", JSON.stringify(err, null, 2));
      alert("Verification failed: " + (err.errors?.[0]?.message || "Unknown error"));
    }
  };

  // Handle Sign-In
  const onSignInPress = async () => {
    if (!signIn) return;

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      } else if (result.status === "needs_first_factor") {
        // If email verification is required during sign-in
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: result.supportedFirstFactors.find(
            (factor) => factor.strategy === "email_code"
          ).emailAddressId,
        });
        setPendingVerification(true);
      }
    } catch (err) {
      console.error("Sign-in error:", JSON.stringify(err, null, 2));
      alert("Sign-in failed: " + (err.errors?.[0]?.message || "Unknown error"));
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.primary[900],
        padding: "0 20px",
      }}
    >
      <Box
        sx={{
          maxWidth: "800px",
          textAlign: "center",
          padding: "40px",
          backgroundColor: colors.primary[800],
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(141, 53, 53, 0.1)",
        }}
      >
        {pendingVerification ? (
          <Box>
            <Typography
              variant="h2"
              sx={{
                color: colors.grey[100],
                marginBottom: "30px",
                fontSize: { xs: "2rem", md: "3rem" },
              }}
            >
              Verify Your Email
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: colors.grey[300], marginBottom: "20px" }}
            >
              Please enter the verification code sent to your email.
            </Typography>
            <TextField
              type="text"
              value={code}
              placeholder="Enter your verification code"
              onChange={(e) => setCode(e.target.value)}
              variant="outlined"
              sx={{
                marginBottom: "20px",
                width: "100%",
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                },
              }}
            />
            <Button
              onClick={onVerifyPress}
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                padding: "10px 20px",
                fontWeight: "bold",
                "&:hover": {
                  backgroundColor: colors.greenAccent[600],
                },
              }}
            >
              Verify
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography
              variant="h2"
              sx={{
                color: colors.grey[100],
                marginBottom: "30px",
                fontSize: { xs: "2rem", md: "3rem" },
              }}
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </Typography>
            <TextField
              type="email"
              value={emailAddress}
              placeholder="Enter email"
              onChange={(e) => setEmailAddress(e.target.value)}
              variant="outlined"
              sx={{
                marginBottom: "20px",
                width: "100%",
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                },
              }}
            />
            <TextField
              type="password"
              value={password}
              placeholder="Enter password"
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              sx={{
                marginBottom: "20px",
                width: "100%",
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                },
              }}
            />
            <Button
              onClick={isSignUp ? onSignUpPress : onSignInPress}
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                padding: "10px 20px",
                fontWeight: "bold",
                marginBottom: "20px",
                "&:hover": {
                  backgroundColor: colors.greenAccent[600],
                },
              }}
            >
              {isSignUp ? "Continue" : "Sign In"}
            </Button>
            <Typography
              variant="body1"
              sx={{ color: colors.grey[300], marginTop: "10px" }}
            >
              {isSignUp ? "Have an account?" : "Don't have an account?"}{" "}
              <Button
                onClick={() => setIsSignUp(!isSignUp)}
                sx={{ color: colors.greenAccent[500], textTransform: "none" }}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </Button>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}