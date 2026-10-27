import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { RiHeartPulseLine } from "react-icons/ri";
import { FiShield, FiMessageCircle, FiBookOpen, FiMoon, FiSun } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { ECG_PATH } from "../../components/common/HeartbeatLoader.jsx";
import styles from "./AuthPages.module.css";

const HIGHLIGHTS = [
  { icon: FiShield,        text: "Spot early warning signs of sepsis with a personalised risk assessment." },
  { icon: FiMessageCircle, text: "Ask safety questions any time and get alerted to red flags." },
  { icon: FiBookOpen,      text: "Get simple care guides made for the person you look after." },
];

/** Split-screen frame for the login and register pages. */
export default function AuthLayout({ title, heading, subheading, children }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  useEffect(() => { document.title = `${title} · SepsisGuard`; }, [title]);

  // Already signed in (e.g. opened /login in a new tab): go straight in.
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className={styles.page}>
      {/* ── Brand panel (hidden on small screens) ─────────── */}
      <aside className={styles.brandPanel}>
        <div className={styles.brandRow}>
          <span className={styles.brandMark}><RiHeartPulseLine /></span>
          <span className={styles.brandName}>SepsisGuard</span>
        </div>

        <div className={styles.pitch}>
          <h2>Caring for someone at home?</h2>
          <p>SepsisGuard helps caregivers recognise sepsis early and act fast. Every hour counts.</p>
          <ul className={styles.highlights}>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text}><Icon size={18} aria-hidden="true" /> <span>{text}</span></li>
            ))}
          </ul>
        </div>

        <svg className={styles.ecg} viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.ecgTrace} d={ECG_PATH} pathLength="100" />
          <path className={styles.ecgPulse} d={ECG_PATH} pathLength="100" />
        </svg>
      </aside>

      {/* ── Form side ──────────────────────────────────────── */}
      <main className={styles.formSide}>
        <button type="button" className={styles.themeToggle} onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
          {theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>

        <div className={styles.card}>
          {/* Compact brand for phones, where the panel is hidden */}
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark}><RiHeartPulseLine /></span>
            <span className={styles.brandNameDark}>SepsisGuard</span>
          </div>

          <h1 className={styles.formTitle}>{heading}</h1>
          {subheading && <p className={styles.formSubtitle}>{subheading}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
