import { useId } from "react";
import styles from "./Input.module.css";

export default function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon = null,
  suffix = null,
  id,
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasAdornment = icon || suffix;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={styles.field}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <div className={hasAdornment ? styles.inputWrapper : undefined}>
        {icon && (
          <span className={styles.inputIcon} aria-hidden="true">{icon}</span>
        )}
        <input
          id={inputId}
          className={[
            styles.input,
            icon    ? styles.withIcon   : "",
            suffix  ? styles.withSuffix : "",
            error   ? styles.inputError : "",
          ].filter(Boolean).join(" ")}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
          {...rest}
        />
        {suffix && (
          <span className={styles.inputSuffix}>{suffix}</span>
        )}
      </div>
      {error && <span id={errorId} className={styles.errorText}>{error}</span>}
    </div>
  );
}
