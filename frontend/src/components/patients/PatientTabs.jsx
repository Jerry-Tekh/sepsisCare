import { NavLink } from "react-router-dom";
import { FiUser, FiBookOpen, FiActivity } from "react-icons/fi";
import { RiQuestionAnswerLine } from "react-icons/ri";
import styles from "./PatientTabs.module.css";

/** Section tabs shared by every page inside a patient's record. */
export default function PatientTabs({ patientId }) {
  const base = `/patients/${patientId}`;
  const tabs = [
    { to: base,                    label: "Overview",     icon: FiUser, end: true },
    { to: `${base}/monitoring`,    label: "Monitoring",   icon: FiActivity },
    { to: `${base}/safety-query`,  label: "Safety Query", icon: RiQuestionAnswerLine },
    { to: `${base}/microlearning`, label: "Care Guides",  icon: FiBookOpen },
  ];

  return (
    <nav className={styles.tabs} aria-label="Patient record sections">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
