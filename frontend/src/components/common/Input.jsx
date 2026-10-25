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
  ...rest
}) {
  const hasAdornment = icon || suffix;

  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={hasAdornment ? styles.inputWrapper : undefined}>
        {icon && (
          <span className={styles.inputIcon} aria-hidden="true">{icon}</span>
        )}
        <input
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
          {...rest}
        />
        {suffix && (
          <span className={styles.inputSuffix}>{suffix}</span>
        )}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
