import { Link } from "react-router-dom";
import styles from "./Button.module.css";

export default function Button({
  children,
  variant = "primary",
  type = "button",
  disabled = false,
  onClick,
  fullWidth = false,
  icon = null,
  to,
}) {
  const classNames = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {icon && <span className={styles.btnIcon}>{icon}</span>}
      {children}
    </>
  );

  // `to` renders a router link styled as a button (avoids nesting <button> in <a>).
  if (to) {
    return <Link to={to} className={classNames} onClick={onClick}>{content}</Link>;
  }

  return (
    <button type={type} className={classNames} disabled={disabled} onClick={onClick}>
      {content}
    </button>
  );
}
