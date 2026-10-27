import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RiHeartPulseLine, RiMenuLine, RiCloseLine, RiLogoutBoxRLine } from "react-icons/ri";
import { FiUsers, FiGrid, FiBookOpen, FiActivity, FiMoon, FiSun, FiUserPlus } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import Avatar from "./Avatar.jsx";
import styles from "./AppLayout.module.css";

const CAREGIVER_NAV = [
  {
    heading: "Overview",
    links: [
      // "/dashboard" only redirects to the role-specific URL, so match both.
      { to: "/caregiver/dashboard", label: "Dashboard", icon: FiGrid, match: ["/caregiver/dashboard", "/dashboard"] },
      { to: "/patients", label: "Patients", icon: FiUsers, match: ["/patients"], exclude: ["/patients/new"] },
      { to: "/patients/new", label: "Add patient", icon: FiUserPlus, match: ["/patients/new"] },
    ],
  },
  {
    heading: "Learning",
    links: [
      { to: "/learning-guides", label: "Learning guides", icon: FiBookOpen, match: ["/learning-guides"] },
      { to: "/microlearning", label: "Microlearning", icon: FiActivity, match: ["/microlearning"] },
    ],
  },
];

const ORGANIZATION_NAV = [
  {
    heading: "Organization",
    links: [
      { to: "/organization/dashboard", label: "Guide management", icon: FiBookOpen, match: ["/organization"] },
    ],
  },
];

const APP_NAME = "SepsisGuard";

/**
 * App shell: sidebar navigation on desktop, slide-in drawer on mobile.
 * `title` sets the browser tab title, e.g. "Patients · SepsisGuard".
 */
export default function AppLayout({ children, title }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOrganizationAdmin = user?.role === "ORGANIZATION_ADMIN";
  const sections = isOrganizationAdmin ? ORGANIZATION_NAV : CAREGIVER_NAV;
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);

  // Close the drawer on navigation, and on Esc while it's open.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function isActive({ match, exclude = [] }) {
    const path = location.pathname;
    return match.some((m) => path.startsWith(m)) && !exclude.some((x) => path.startsWith(x));
  }

  return (
    <div className={styles.shell}>
      {/* ── Mobile top bar ─────────────────────────────────── */}
      <header className={styles.topbar}>
        <button
          className={styles.iconButton}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen(true)}
        >
          <RiMenuLine size={22} />
        </button>
        <Link to="/dashboard" className={styles.brand}>
          <span className={styles.brandMark}><RiHeartPulseLine /></span>
          <span className={styles.brandName}>{APP_NAME}</span>
        </Link>
        <button className={styles.iconButton} onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
          {theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
      </header>

      {/* ── Sidebar / drawer ───────────────────────────────── */}
      <aside id="app-sidebar" className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <Link to="/dashboard" className={styles.brand}>
            <span className={styles.brandMark}><RiHeartPulseLine /></span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>{APP_NAME}</span>
              <span className={styles.brandTag}>
                {isOrganizationAdmin ? "Organization workspace" : "Caregiver workspace"}
              </span>
            </span>
          </Link>
          <button className={`${styles.iconButton} ${styles.closeBtn}`} onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <RiCloseLine size={22} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {sections.map((section) => (
            <div key={section.heading} className={styles.navSection}>
              <p className={styles.navHeading}>{section.heading}</p>
              {section.links.map((link) => {
                const active = isActive(link);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.footerButton} onClick={toggleTheme} aria-label={themeLabel}>
            {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          {user && (
            <div className={styles.userCard}>
              <Avatar name={user.fullName} size="sm" />
              <span className={styles.userText}>
                <span className={styles.userName} title={user.fullName}>{user.fullName}</span>
                <span className={styles.userMeta} title={user.email}>
                  {isOrganizationAdmin ? user.organization?.name || "Organization admin" : user.email}
                </span>
              </span>
            </div>
          )}

          <button type="button" className={styles.footerButton} onClick={handleLogout}>
            <RiLogoutBoxRLine size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      {/* ── Page ───────────────────────────────────────────── */}
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
        <footer className={styles.footer}>
          SepsisGuard is a screening and education aid, not a substitute for clinical judgement.
          If you think someone has sepsis, call your local emergency number immediately.
        </footer>
      </div>
    </div>
  );
}
