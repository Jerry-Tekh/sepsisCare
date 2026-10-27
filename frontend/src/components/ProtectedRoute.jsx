import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import HeartbeatLoader from "./common/HeartbeatLoader.jsx";

// Shown while the session check is in flight. The backend can take a while
// to wake from a cold start, so never leave the page blank.
function SessionLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <HeartbeatLoader size="lg" label="Connecting to SepsisGuard…">
        <p style={{ margin: 0, fontSize: "0.82rem", maxWidth: 320 }}>
          This can take up to a minute if the server has been idle.
        </p>
      </HeartbeatLoader>
    </div>
  );
}

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <SessionLoader />;
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role || "CAREGIVER";
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;

  return children;
}
