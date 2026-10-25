import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "ORGANIZATION_ADMIN" ? "/organization/dashboard" : "/caregiver/dashboard"} replace />;
}
