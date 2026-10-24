import { FiCheckCircle, FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";
import { useToast } from "../../context/ToastContext.jsx";
import styles from "./ToastViewport.module.css";

const ICONS = {
  success: FiCheckCircle,
  error: FiAlertTriangle,
  info: FiInfo,
};

export default function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || FiInfo;
        return (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            <Icon size={17} className={styles.toastIcon} />
            <span className={styles.toastMessage}>{toast.message}</span>
            <button
              className={styles.toastClose}
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <FiX size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
