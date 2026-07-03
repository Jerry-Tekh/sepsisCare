import styles from "./Card.module.css";

export default function Card({ children, title, icon, actions }) {
  return (
    <div className={styles.card}>
      {(title || actions) && (
        <div className={styles.header}>
          {title && (
            <div className={styles.titleRow}>
              {icon && <span className={styles.titleIcon}>{icon}</span>}
              <h3 className={styles.title}>{title}</h3>
            </div>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
