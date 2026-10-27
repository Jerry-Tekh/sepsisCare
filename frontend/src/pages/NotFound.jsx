import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiHome } from "react-icons/fi";
import Button from "../components/common/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./NotFound.module.css";

// A heartbeat that goes flat partway across, for the "nothing here" page.
const FLATLINE = "M0,30 L30,30 Q35,22 40,30 L48,30 L52,36 L58,4 L64,54 L68,30 L80,30 Q88,18 96,30 L240,30";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { document.title = "Page not found · SepsisGuard"; }, []);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <svg className={styles.monitor} viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.trace} d={FLATLINE} pathLength="100" />
        </svg>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>We couldn't find that page</h1>
        <p className={styles.text}>
          The link may be broken, or the page may have been moved or deleted.
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" icon={<FiArrowLeft size={15} />} onClick={() => navigate(-1)}>Go back</Button>
          <Button to={user ? "/dashboard" : "/login"} icon={<FiHome size={15} />}>
            {user ? "Go to dashboard" : "Go to sign in"}
          </Button>
        </div>
      </div>
    </main>
  );
}
