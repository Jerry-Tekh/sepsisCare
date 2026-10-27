import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";
import { useToast } from "../../context/ToastContext.jsx";
import styles from "./ToastViewport.module.css";

const ICONS = { success: FiCheckCircle, error: FiAlertCircle, info: FiInfo };

export default function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    // Always mounted so screen readers pick up toasts as they are added.
    <div className={styles.viewport} aria-live="polite" aria-atomic="false">
      {toasts.map(({ id, message, type }) => {
        const Icon = ICONS[type] || FiInfo;
        return (
          <div key={id} className={`${styles.toast} ${styles[type]}`} role={type === "error" ? "alert" : "status"}>
            <Icon size={18} className={styles.icon} aria-hidden="true" />
            <p className={styles.message}>{message}</p>
            <button className={styles.close} onClick={() => dismissToast(id)} aria-label="Dismiss notification">
              <FiX size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
