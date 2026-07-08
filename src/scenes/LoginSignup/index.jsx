import { useState, useEffect, useMemo } from "react";
import { useSignUp, useSignIn, useAuth } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import AppBootScreen from "../../components/AppBootScreen";
import {
  Box,
  Typography,
  TextField,
  Button,
  useTheme,
  IconButton,
  InputAdornment,
  Chip,
  Divider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { tokens } from "../../theme";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { trackSignupCompleted, trackSignupStarted } from "../../utils/plausibleEvents";
import {
  applyNewsletterOptIn,
  setPendingNewsletterOptIn,
} from "../../utils/newsletterOptIn";
import {
  getSignupChipLabel,
  getSignupHelperText,
  isOpenAccessPromoActive,
} from "../../config/openAccessPromo";

const PREMIUM_DEST = "/subscription?checkout=1";
const FREE_DEST = "/dashboard?welcome=1";

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
  const [passwordError, setPasswordError] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const { signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  const plan = useMemo(() => new URLSearchParams(location.search).get("plan"), [location.search]);
  const isPremiumIntent = plan === "premium";
  const promoActive = isOpenAccessPromoActive();

  const postSignupDestination = isPremiumIntent ? PREMIUM_DEST : FREE_DEST;

  const planChipLabel = isSignUp
    ? getSignupChipLabel(promoActive, isPremiumIntent)
    : null;

  const planHelperText = isSignUp
    ? getSignupHelperText(promoActive, isPremiumIntent)
    : null;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate(postSignupDestination, { replace: true });
    }
  }, [isLoaded, isSignedIn, postSignupDestination, navigate]);

  const handleGoogle = async () => {
    setIsLoading(true);
    trackSignupStarted("google", isPremiumIntent ? "premium" : "free");
    if (isSignUp) {
      setPendingNewsletterOptIn(newsletterOptIn);
    }
    try {
      const redirectUrlComplete = isSignUp
        ? isPremiumIntent
          ? PREMIUM_DEST
          : FREE_DEST
        : FREE_DEST;
      if (isSignUp) {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete,
        });
      } else {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: FREE_DEST,
        });
      }
    } catch (err) {
      console.error("Google auth error:", JSON.stringify(err, null, 2));
      alert("Google auth failed: " + (err.errors?.[0]?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const mode = query.get("mode");
    setIsSignUp(mode !== "signin");
  }, [location.search]);

  const onSignUpPress = async () => {
    if (!signUp) return;
    const trimmedEmail = emailAddress.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    if (trimmedPassword !== trimmedConfirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordError("");
    setIsLoading(true);
    trackSignupStarted("email", isPremiumIntent ? "premium" : "free");
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

  const onVerifyPress = async () => {
    if (!signUp) return;
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        if (newsletterOptIn) {
          try {
            await applyNewsletterOptIn(getToken, true);
          } catch (optInErr) {
            console.error("Newsletter opt-in failed:", optInErr);
          }
        }
        trackSignupCompleted(isPremiumIntent ? "premium" : "free");
        navigate(postSignupDestination);
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
        navigate(FREE_DEST);
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
        navigate(FREE_DEST);
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

  const toggleAuthMode = () => {
    const query = new URLSearchParams(location.search);
    const nextMode = isSignUp ? "signin" : "signup";
    query.set("mode", nextMode);
    navigate(`/login-signup?${query.toString()}`, { replace: true });
  };

  const fieldSx = {
    marginBottom: "20px",
    width: "100%",
    "& .MuiInputBase-input": { color: colors.grey[100] },
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: colors.grey[500] },
      "&:hover fieldset": { borderColor: colors.grey[300] },
    },
  };

  const primaryButtonSx = {
    backgroundColor: colors.greenAccent[500],
    color: colors.grey[900],
    padding: "10px 20px",
    fontWeight: "bold",
    "&:hover": { backgroundColor: colors.greenAccent[400] },
  };

  if (isLoaded && isSignedIn) {
    return (
      <AppBootScreen
        message={isPremiumIntent ? "Taking you to checkout..." : "You're in, loading your dashboard..."}
      />
    );
  }

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
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          padding: { xs: "28px", md: "40px" },
          backgroundColor: colors.primary[800],
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.15)",
        }}
      >
        {pendingVerification ? (
          <form onSubmit={handleVerificationSubmit}>
            <Typography
              variant="h2"
              sx={{
                color: colors.grey[100],
                marginBottom: "16px",
                fontSize: { xs: "1.75rem", md: "2.25rem" },
              }}
            >
              {isPasswordReset ? "Reset Your Password" : "Verify Your Email"}
            </Typography>
            <Typography variant="body1" sx={{ color: colors.grey[300], marginBottom: "20px" }}>
              {isPasswordReset
                ? "Enter the verification code sent to your email and your new password."
                : "Enter the code we sent to your email to finish creating your account."}
            </Typography>
            <TextField
              type="text"
              value={code}
              placeholder="Verification code"
              onChange={(e) => setCode(e.target.value)}
              variant="outlined"
              sx={fieldSx}
            />
            {isPasswordReset && (
              <TextField
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                placeholder="New password"
                onChange={(e) => setNewPassword(e.target.value)}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={fieldSx}
              />
            )}
            <Button type="submit" disabled={isLoading} sx={primaryButtonSx}>
              {isLoading ? "Processing..." : isPasswordReset ? "Reset Password" : "Verify & continue"}
            </Button>
          </form>
        ) : (
          <>
            {planChipLabel && (
              <Chip
                label={planChipLabel}
                sx={{
                  mb: 2,
                  backgroundColor: isPremiumIntent ? colors.blueAccent[800] : colors.greenAccent[800],
                  color: isPremiumIntent ? colors.blueAccent[300] : colors.greenAccent[300],
                  fontWeight: 600,
                }}
              />
            )}
            <Typography
              variant="h2"
              sx={{
                color: colors.grey[100],
                marginBottom: "12px",
                fontSize: { xs: "1.75rem", md: "2.25rem" },
              }}
            >
              {isSignUp ? "Create your account" : "Welcome back"}
            </Typography>
            {planHelperText && (
              <Typography variant="body1" sx={{ color: colors.grey[300], marginBottom: "24px", lineHeight: 1.6 }}>
                {planHelperText}
              </Typography>
            )}

            {isSignUp && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    sx={{
                      color: colors.grey[400],
                      "&.Mui-checked": { color: colors.greenAccent[500] },
                    }}
                  />
                }
                label="Send me the weekly newsletter (optional)"
                sx={{ color: colors.grey[300], mb: 2, display: "flex", alignItems: "flex-start" }}
              />
            )}

            {isSignUp && (
              <>
                <Button
                  onClick={handleGoogle}
                  disabled={isLoading}
                  fullWidth
                  sx={{
                    ...primaryButtonSx,
                    marginBottom: "16px",
                    textTransform: "none",
                    fontSize: "1rem",
                  }}
                >
                  Continue with Google
                </Button>
                <Divider sx={{ color: colors.grey[500], marginBottom: "20px" }}>or use email</Divider>
              </>
            )}

            <form onSubmit={handleLoginSubmit}>
              <TextField
                type="email"
                value={emailAddress}
                placeholder="Email address"
                onChange={(e) => setEmailAddress(e.target.value)}
                variant="outlined"
                sx={fieldSx}
              />
              <TextField
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={fieldSx}
              />
              {isSignUp && (
                <TextField
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  placeholder="Confirm password"
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  error={!!passwordError}
                  helperText={passwordError}
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
                  sx={fieldSx}
                />
              )}
              <Button type="submit" disabled={isLoading} fullWidth sx={{ ...primaryButtonSx, marginBottom: "16px" }}>
                {isLoading ? "Processing..." : isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>

            <Typography sx={{ color: colors.grey[300], fontSize: "0.95rem" }}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <Button
                onClick={toggleAuthMode}
                sx={{ color: colors.greenAccent[500], textTransform: "none", fontSize: "0.95rem", p: 0, minWidth: 0 }}
              >
                {isSignUp ? "Sign in" : "Sign up free"}
              </Button>
              {!isSignUp && (
                <>
                  {" · "}
                  <Button
                    onClick={onForgotPasswordPress}
                    sx={{ color: colors.greenAccent[500], textTransform: "none", fontSize: "0.95rem", p: 0, minWidth: 0 }}
                  >
                    Forgot password?
                  </Button>
                </>
              )}
            </Typography>

            {!isSignUp && (
              <Typography sx={{ color: colors.grey[300], marginTop: "16px", fontSize: "0.95rem" }}>
                <Button
                  onClick={handleGoogle}
                  disabled={isLoading}
                  sx={{ color: colors.greenAccent[500], textTransform: "none", fontSize: "0.95rem" }}
                >
                  Sign in with Google
                </Button>
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}