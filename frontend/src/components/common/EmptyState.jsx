import styles from "./EmptyState.module.css";

/** Friendly placeholder for lists with nothing in them yet. */
export default function EmptyState({ icon, title, children, action }) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.icon} aria-hidden="true">{icon}</div>}
      <h2 className={styles.title}>{title}</h2>
      {children && <p className={styles.text}>{children}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
