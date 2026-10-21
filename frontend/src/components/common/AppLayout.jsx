import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RiHeartPulseLine, RiMenuLine, RiCloseLine, RiLogoutBoxRLine, RiMoonLine, RiSunLine } from "react-icons/ri";
import { FiUsers, FiGrid } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import Avatar from "./Avatar.jsx";
import styles from "./AppLayout.module.css";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function isActive(path) {
    return location.pathname.startsWith(path) ? styles.navLinkActive : "";
  }

  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        {/* Brand */}
        <Link to="/dashboard" className={styles.brand} onClick={() => setMenuOpen(false)}>
          <RiHeartPulseLine className={styles.brandIcon} />
          <span>SepsisGuard</span>
        </Link>

        {/* Hamburger toggle — mobile only */}
        <button
          className={styles.hamburger}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <RiCloseLine size={24} /> : <RiMenuLine size={24} />}
        </button>

        {/* Nav panel — collapses on mobile */}
        <div className={`${styles.navPanel} ${menuOpen ? styles.navPanelOpen : ""}`}>
          <nav className={styles.nav} aria-label="Main navigation">
            <Link
              to="/dashboard"
              className={`${styles.navLink} ${isActive("/dashboard")}`}
              onClick={() => setMenuOpen(false)}
            >
              <FiGrid size={16} />
              Dashboard
            </Link>
            <Link
              to="/patients"
              className={`${styles.navLink} ${isActive("/patients")}`}
              onClick={() => setMenuOpen(false)}
            >
              <FiUsers size={16} />
              Patients
            </Link>
          </nav>

          <div className={styles.userArea}>
            {user && (
              <Link
                to="/account"
                className={`${styles.userInfo} ${isActive("/account")}`}
                onClick={() => setMenuOpen(false)}
                title="Account"
              >
                <Avatar name={user.fullName} size="xs" />
                <span className={styles.userName} title={user.fullName}>
                  {user.fullName}
                </span>
              </Link>
            )}
            <button
              className={styles.themeButton}
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <RiSunLine size={17} /> : <RiMoonLine size={17} />}
            </button>
            <button className={styles.logoutButton} onClick={handleLogout} aria-label="Log out">
              <RiLogoutBoxRLine size={16} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
