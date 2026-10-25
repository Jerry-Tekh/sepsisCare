import styles from "./Button.module.css";

export default function Button({
  children,
  variant = "primary",
  type = "button",
  disabled = false,
  onClick,
  fullWidth = false,
  icon = null,
}) {
  const classNames = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
  ].filter(Boolean).join(" ");

  return (
    <button type={type} className={classNames} disabled={disabled} onClick={onClick}>
      {icon && <span className={styles.btnIcon}>{icon}</span>}
      {children}
    </button>
  );
}
