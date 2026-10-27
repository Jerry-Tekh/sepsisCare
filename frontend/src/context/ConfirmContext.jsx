import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "../components/common/Button.jsx";
import styles from "./ConfirmDialog.module.css";

const ConfirmContext = createContext(null);

/**
 * Styled replacement for window.confirm():
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, message, confirmLabel, danger: true }))) return;
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const dialogRef = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ confirmLabel: "Confirm", cancelLabel: "Cancel", danger: false, ...options, resolve });
  }), []);

  // The native <dialog> gives us a focus trap, Esc to cancel, and a backdrop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (request && dialog && !dialog.open) dialog.showModal();
  }, [request]);

  function close(result) {
    dialogRef.current?.close();
    request?.resolve(result);
    setRequest(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <dialog
          ref={dialogRef}
          className={styles.dialog}
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          onCancel={(e) => { e.preventDefault(); close(false); }}
          onClick={(e) => { if (e.target === dialogRef.current) close(false); }}
        >
          <div className={styles.body}>
            {request.danger && (
              <div className={styles.icon} aria-hidden="true"><FiAlertTriangle size={22} /></div>
            )}
            <div>
              <h2 id="confirm-title" className={styles.title}>{request.title}</h2>
              {request.message && <p id="confirm-message" className={styles.message}>{request.message}</p>}
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => close(false)} autoFocus>{request.cancelLabel}</Button>
            <Button variant={request.danger ? "danger" : "primary"} onClick={() => close(true)}>
              {request.confirmLabel}
            </Button>
          </div>
        </dialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
