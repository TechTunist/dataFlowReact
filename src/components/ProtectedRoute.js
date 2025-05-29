// src/components/ProtectedRoute.js
import { memo } from "react";

// Simplified ProtectedRoute (no useAuth needed)
const ProtectedRoute = memo(({ children }) => {
  // console.log('ProtectedRoute rendered'); // Log to confirm rerenders
  return children;
});

export default ProtectedRoute;