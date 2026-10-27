import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import styles from "./PageHeader.module.css";

/**
 * Standard page heading.
 *   back:    { to, label } — optional "← Back to …" link above the title
 *   eyebrow: small label above the title (e.g. "Organization workspace")
 *   icon:    optional icon shown in a tinted tile beside the title
 *   actions: buttons aligned to the right (wrap below on mobile)
 */
export default function PageHeader({ title, subtitle, eyebrow, icon, back, actions }) {
  return (
    <header className={styles.header}>
      {back && (
        <Link to={back.to} className={styles.back}>
          <FiArrowLeft size={15} aria-hidden="true" /> {back.label}
        </Link>
      )}
      <div className={styles.row}>
        <div className={styles.titleGroup}>
          {icon && <div className={styles.icon} aria-hidden="true">{icon}</div>}
          <div className={styles.text}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
