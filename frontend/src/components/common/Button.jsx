import { Link } from "react-router-dom";
import styles from "./Button.module.css";

/**
 * Pass `to` to render a router link styled as a button. Wrapping a <Button>
 * in a <Link> nests a button inside a link, which is invalid HTML.
 */
export default function Button({
  children,
  variant = "primary",
  type = "button",
  disabled = false,
  onClick,
  fullWidth = false,
  icon = null,
  to,
  className = "",
  ...rest
}) {
  const classNames = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {icon && <span className={styles.btnIcon}>{icon}</span>}
      {children}
    </>
  );

  if (to) {
    return <Link to={to} className={classNames} onClick={onClick} {...rest}>{content}</Link>;
  }

  return (
    <button type={type} className={classNames} disabled={disabled} onClick={onClick} {...rest}>
      {content}
    </button>
  );
}
