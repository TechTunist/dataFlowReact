import { useState, useEffect } from "react";
import { useSignUp, useSignIn } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, TextField, Button, useTheme, IconButton, InputAdornment } from "@mui/material";
import { tokens } from "../../theme";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function LoginSignup() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const navigate = useNavigate();

  // Google auth handler
  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams(location.search);
      const plan = query.get('plan');
      const redirectUrlComplete = plan === 'premium' ? '/subscription' : '/dashboard';
      if (isSignUp) {
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete,
        });
      } else {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/dashboard',
        });
      }
    } catch (err) {
      console.error("Google auth error:", JSON.stringify(err, null, 2));
      alert("Google auth failed: " + (err.errors?.[0]?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Read query parameters
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const mode = query.get('mode');
    setIsSignUp(mode !== 'signin');
  }, [location.search]);

  // Handle Sign-Up
  const onSignUpPress = async () => {
    if (!signUp) return;
    const trimmedEmail = emailAddress.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    if (trimmedPassword !== trimmedConfirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      await signUp.create({
        emailAddress: trimmedEmail,
        password: trimmedPassword,
      });
      await signUp.prepareEmailAddressVerification();
      setPendingVerification(true);
    } catch (err) {
      console.error("Sign-up error:", JSON.stringify(err, null, 2));
      alert("Sign-up failed: " + (err.errors?.[0]?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Verification
  const onVerifyPress = async () => {
    if (!signUp) return;
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        const query = new URLSearchParams(location.search);
        const plan = query.get('plan');
        if (plan === 'premium') {
          navigate("/subscription");
        } else {
          navigate("/dashboard");
        }
      } else {
        alert("Verification incomplete. Please try again.");
      }
    } catch (err) {
      console.error("Verification error:", JSON.stringify(err, null, 2));
      alert("Verification failed: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign-In
  const onSignInPress = async () => {
    if (!signIn) return;
    const trimmedEmail = emailAddress.trim();
    const trimmedPassword = password.trim();
    setIsLoading(true);
    try {
      const result = await signIn.create({
        identifier: trimmedEmail,
        password: trimmedPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      } else if (result.status === "needs_first_factor") {
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
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const onForgotPasswordPress = async () => {
    if (!signIn) return;
    const trimmedEmail = emailAddress.trim();
    setIsLoading(true);
    try {
      await signIn.create({
        identifier: trimmedEmail,
      });
      await signIn.prepareFirstFactor({
        strategy: "reset_password_email_code",
        emailAddressId: signIn.supportedFirstFactors.find(
          (factor) => factor.strategy === "reset_password_email_code"
        ).emailAddressId,
      });
      setIsPasswordReset(true);
      setPendingVerification(true);
    } catch (err) {
      console.error("Password reset error:", JSON.stringify(err, null, 2));
      alert("Password reset failed: (email field is empty) " + (err.errors?.[0]?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Reset Verification
  const onResetPasswordPress = async () => {
    if (!signIn) return;
    const trimmedNewPassword = newPassword.trim();
    setIsLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: trimmedNewPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      } else {
        alert("Password reset incomplete. Please try again.");
      }
    } catch (err) {
      console.error("Password reset verification error:", JSON.stringify(err, null, 2));
      alert("Password reset failed: " + (err.errors?.[0]?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      onSignUpPress();
    } else {
      onSignInPress();
    }
  };

  const handleVerificationSubmit = (e) => {
    e.preventDefault();
    if (isPasswordReset) {
      onResetPasswordPress();
    } else {
      onVerifyPress();
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
          <form onSubmit={handleVerificationSubmit}>
            <Typography
              variant="h2"
              sx={{
                color: colors.grey[100],
                marginBottom: "30px",
                fontSize: { xs: "2rem", md: "3rem" },
              }}
            >
              {isPasswordReset ? "Reset Your Password" : "Verify Your Email"}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: colors.grey[300], marginBottom: "20px" }}
            >
              {isPasswordReset
                ? "Enter the verification code sent to your email and your new password."
                : "Please enter the verification code sent to your email."}
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
            {isPasswordReset && (
              <TextField
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                placeholder="Enter new password"
                onChange={(e) => setNewPassword(e.target.value)}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
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
            )}
            <Button
              type="submit"
              disabled={isLoading}
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
              {isLoading ? "Processing..." : (isPasswordReset ? "Reset Password" : "Verify")}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit}>
            <Typography
              variant="h2"
              sx={{
                color: colors.grey[100],
                marginBottom: "30px",
                fontSize: { xs: "2rem", md: "3rem" },
              }}
            >
              {isSignUp ? "Create an Account" : "Sign In"}
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
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="Enter password"
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
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
            {isSignUp && (
              <TextField
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                placeholder="Confirm password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
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
            )}
            <Button
              type="submit"
              disabled={isLoading}
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
              {isLoading ? "Processing..." : (isSignUp ? "Continue" : "Sign In")}
            </Button>
            <Typography
              variant="h3"
              sx={{ color: colors.grey[300], marginTop: "10px" }}
            >
              {isSignUp ? "Have an account?" : "Don't have an account?"}{" "}
              <Button
                onClick={() => setIsSignUp(!isSignUp)}
                sx={{ color: colors.greenAccent[500], textTransform: "none", fontSize: "1.2rem" }}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </Button>
              {!isSignUp && (
                <>
                  {" | "}
                  <Button
                    onClick={onForgotPasswordPress}
                    sx={{ color: colors.greenAccent[500], textTransform: "none", fontSize: "1.2rem" }}
                  >
                    Forgot Password?
                  </Button>
                </>
              )}
            </Typography>
            <Typography
              variant="h3"
              sx={{ color: colors.grey[300], marginTop: "10px" }}
            >
              Or{" "}
              <Button
                onClick={handleGoogle}
                disabled={isLoading}
                sx={{ color: colors.greenAccent[500], textTransform: "none", fontSize: "1.2rem" }}
              >
                {isSignUp ? "Sign Up with Google" : "Sign In with Google"}
              </Button>
            </Typography>
          </form>
        )}
      </Box>
    </Box>
  );
}