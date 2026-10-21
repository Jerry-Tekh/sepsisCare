import { FiMail, FiLogOut, FiSun, FiMoon } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/common/AppLayout.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import styles from "./AccountPage.module.css";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1>Account</h1>
        <p className={styles.subtitle}>Your profile and app preferences.</p>
      </div>

      <Card title="Profile">
        <div className={styles.profileRow}>
          <Avatar name={user.fullName} size="lg" />
          <div>
            <p className={styles.name}>{user.fullName}</p>
            <p className={styles.email}>
              <FiMail size={13} /> {user.email}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Appearance">
        <p className={styles.sectionHint}>Choose how SepsisGuard looks on this device.</p>
        <div className={styles.themeToggleRow}>
          <button
            className={`${styles.themeOption} ${theme === "light" ? styles.themeOptionActive : ""}`}
            onClick={() => setTheme("light")}
          >
            <FiSun size={16} /> Light
          </button>
          <button
            className={`${styles.themeOption} ${theme === "dark" ? styles.themeOptionActive : ""}`}
            onClick={() => setTheme("dark")}
          >
            <FiMoon size={16} /> Dark
          </button>
        </div>
      </Card>

      <Card title="Session">
        <p className={styles.sectionHint}>Sign out of SepsisGuard on this device.</p>
        <Button variant="secondary" icon={<FiLogOut size={14} />} onClick={handleLogout}>
          Log out
        </Button>
      </Card>
    </AppLayout>
  );
}
