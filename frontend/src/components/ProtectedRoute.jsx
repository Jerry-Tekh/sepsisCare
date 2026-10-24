import { Navigate } from "react-router-dom";
import { RiHeartPulseLine } from "react-icons/ri";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "./common/Spinner.jsx";

// Shown while the session check is in flight. The backend can take up to a
// minute to wake from a cold start, so never leave the page blank.
function SessionLoader() {
  return (
    <div
      role="status"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "1rem",
        textAlign: "center",
        color: "var(--color-text-muted)",
      }}
    >
      <RiHeartPulseLine size={40} color="var(--color-primary)" />
      <Spinner size="md" />
      <p style={{ margin: 0, fontSize: "0.9rem" }}>
        Connecting to SepsisGuard…
        <br />
        This can take up to a minute if the server has been idle.
      </p>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <SessionLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
