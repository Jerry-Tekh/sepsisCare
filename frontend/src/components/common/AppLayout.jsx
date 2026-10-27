import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RiHeartPulseLine, RiMenuLine, RiCloseLine, RiLogoutBoxRLine } from "react-icons/ri";
import { FiUsers, FiGrid, FiBookOpen, FiActivity, FiMoon, FiSun } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import styles from "./AppLayout.module.css";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const isOrganizationAdmin = user?.role === "ORGANIZATION_ADMIN";
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // "/dashboard" only redirects to a role-specific URL, so match those too.
  function isActive(...paths) {
    return paths.some((path) => location.pathname.startsWith(path)) ? styles.navLinkActive : "";
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
            {isOrganizationAdmin ? (
              // The organization dashboard *is* guide management — one link, not two.
              <Link to="/organization/dashboard" className={`${styles.navLink} ${isActive("/organization")}`} onClick={() => setMenuOpen(false)}>
                <FiBookOpen size={16} /> Guide management
              </Link>
            ) : (
              <>
                <Link
                  to="/caregiver/dashboard"
                  className={`${styles.navLink} ${isActive("/caregiver/dashboard", "/dashboard")}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <FiGrid size={16} /> Dashboard
                </Link>
                <Link to="/patients" className={`${styles.navLink} ${isActive("/patients")}`} onClick={() => setMenuOpen(false)}>
                  <FiUsers size={16} /> Patients
                </Link>
                <Link to="/learning-guides" className={`${styles.navLink} ${isActive("/learning-guides")}`} onClick={() => setMenuOpen(false)}>
                  <FiBookOpen size={16} /> Learning guides
                </Link>
                <Link to="/microlearning" className={`${styles.navLink} ${isActive("/microlearning")}`} onClick={() => setMenuOpen(false)}>
                  <FiActivity size={16} /> Microlearning
                </Link>
              </>
            )}
          </nav>

          <div className={styles.userArea}>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={themeLabel}
              title={themeLabel}
            >
              {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
              <span className={styles.themeToggleText}>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            {user && (
              <span className={styles.userName} title={user.fullName}>
                {user.fullName}
              </span>
            )}
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
