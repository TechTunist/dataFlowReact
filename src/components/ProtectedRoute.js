// src/components/ProtectedRoute.js
import { memo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";
import AppBootScreen from "./AppBootScreen";
import { useClerkLoadRecovery } from "../hooks/useClerkLoadRecovery";

const DEV_BYPASS_AUTH = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

/**
 * Proper ProtectedRoute.
 * Centralizes auth protection so individual routes stay clean.
 * 
 * - Waits for Clerk to load
 * - Redirects unauthenticated users to /login-signup (or splash)
 * - Can be extended later for paid subscription checks
 *
 * In development you can set REACT_APP_DEV_BYPASS_AUTH=true in .env.local
 * (or .env) to work on charts without needing Clerk sign-in at all.
 */
const ProtectedRoute = memo(({ children }) => {
  // Hooks must be called unconditionally at the top (rules-of-hooks).
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const { stuck: clerkLoadStuck, hardReload } = useClerkLoadRecovery(DEV_BYPASS_AUTH || isLoaded);

  if (DEV_BYPASS_AUTH) {
    return children;
  }

  if (!isLoaded) {
    return (
      <AppBootScreen
        message="Verifying session..."
        stuck={clerkLoadStuck}
        onReload={hardReload}
      />
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login-signup" replace state={{ from: location }} />;
  }

  return children;
});

export default ProtectedRoute;