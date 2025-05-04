// src/components/ProtectedRoute.js
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for Clerk to load authentication state
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Redirect to /splash if not authenticated
  if (!isSignedIn) {
    return <Navigate to="/splash" replace />;
  }

  return children;
};

export default ProtectedRoute;