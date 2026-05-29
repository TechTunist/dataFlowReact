// src/components/ProtectedRoute.js
import { memo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Proper ProtectedRoute.
 * Centralizes auth protection so individual routes stay clean.
 * 
 * - Waits for Clerk to load
 * - Redirects unauthenticated users to /login-signup (or splash)
 * - Can be extended later for paid subscription checks
 */
const ProtectedRoute = memo(({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading authentication...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/login-signup" replace state={{ from: location }} />;
  }

  return children;
});

export default ProtectedRoute;