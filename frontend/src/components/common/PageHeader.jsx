import { Fragment } from "react";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import styles from "./PageHeader.module.css";

/**
 * Standard page heading: breadcrumb trail, title, optional subtitle and
 * right-aligned actions. Every authenticated page uses this so headings
 * look and behave the same across the app.
 */
export default function PageHeader({ breadcrumbs = [], title, subtitle, actions, leading }) {
  return (
    <div className={styles.header}>
      {breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <FiChevronRight size={13} className={styles.separator} aria-hidden="true" />}
              {crumb.to
                ? <Link to={crumb.to} className={styles.crumbLink}>{crumb.label}</Link>
                : <span className={styles.crumbCurrent} aria-current="page">{crumb.label}</span>}
            </Fragment>
          ))}
        </nav>
      )}

      <div className={styles.row}>
        <div className={styles.lead}>
          {leading}
          <div className={styles.text}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
