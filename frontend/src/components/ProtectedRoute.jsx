import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role || "CAREGIVER";
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;

  return children;
}
