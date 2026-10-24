import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  RiHeartPulseLine, RiMenuLine, RiCloseLine, RiLogoutBoxRLine, RiMoonLine, RiSunLine,
} from "react-icons/ri";
import { FiUsers, FiGrid, FiUserPlus, FiSettings, FiSearch } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import Avatar from "./Avatar.jsx";
import styles from "./AppLayout.module.css";

const NAV_SECTIONS = [
  {
    heading: "Overview",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: FiGrid },
      { to: "/patients",  label: "Patients",  icon: FiUsers },
    ],
  },
  {
    heading: "Care",
    links: [
      { to: "/patients/new", label: "Register patient", icon: FiUserPlus },
    ],
  },
  {
    heading: "Settings",
    links: [
      { to: "/account", label: "Account", icon: FiSettings },
    ],
  },
];

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/patients?q=${encodeURIComponent(q)}` : "/patients");
    setQuery("");
  }

  // "/patients" should stay highlighted on patient sub-pages, but not on
  // "/patients/new", which has its own entry.
  function linkClass(to) {
    const path = location.pathname;
    const active = to === "/patients"
      ? path.startsWith("/patients") && path !== "/patients/new"
      : path.startsWith(to);
    return `${styles.navLink} ${active ? styles.navLinkActive : ""}`;
  }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} aria-label="Sidebar">
        <div className={styles.sidebarTop}>
          <Link to="/dashboard" className={styles.brand}>
            <span className={styles.brandMark}><RiHeartPulseLine /></span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>SepsisGuard</span>
              <span className={styles.brandTag}>Caregiver care platform</span>
            </span>
          </Link>
          <button
            className={styles.closeBtn}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <RiCloseLine size={22} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} className={styles.navSection}>
              <p className={styles.navHeading}>{section.heading}</p>
              {section.links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClass(to)} end>
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {user && (
          <div className={styles.sidebarFooter}>
            <Link to="/account" className={styles.userCard} title="Account">
              <Avatar name={user.fullName} size="sm" />
              <span className={styles.userText}>
                <span className={styles.userName}>{user.fullName}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </span>
            </Link>
            <button className={styles.logoutButton} onClick={handleLogout}>
              <RiLogoutBoxRLine size={16} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </aside>

      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      {/* ── Main column ─────────────────────────────────────── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <RiMenuLine size={22} />
          </button>

          <form className={styles.search} onSubmit={handleSearch} role="search">
            <FiSearch size={15} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search patients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search patients"
            />
          </form>

          <div className={styles.topbarRight}>
            <span className={styles.today}>{formatToday()}</span>
            <button
              className={styles.iconButton}
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <RiSunLine size={17} /> : <RiMoonLine size={17} />}
            </button>
            {user && (
              <Link to="/account" className={styles.topbarAvatar} aria-label="Account">
                <Avatar name={user.fullName} size="xs" />
              </Link>
            )}
          </div>
        </header>

        <main className={styles.content}>{children}</main>

        <footer className={styles.footer}>
          SepsisGuard is a screening and education aid, not a substitute for clinical judgement.
          If someone shows signs of sepsis, call your local emergency number immediately.
        </footer>
      </div>
    </div>
  );
}
