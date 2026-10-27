import { useEffect, useState } from "react";
import { onSlowServerChange } from "../../api/axiosClient.js";
import styles from "./ServerStatusBanner.module.css";

/**
 * Small floating notice shown while ordinary API requests are unusually slow,
 * usually because the hosted backend is waking from sleep. Hides itself as
 * soon as the requests finish.
 */
export default function ServerStatusBanner() {
  const [slow, setSlow] = useState(false);

  useEffect(() => onSlowServerChange(setSlow), []);

  return (
    <div className={styles.region} aria-live="polite">
      {slow && (
        <div className={styles.banner} role="status">
          <span className={styles.dot} aria-hidden="true" />
          <span>
            <strong>Waking up the server…</strong> This can take up to a minute after a quiet period. Thanks for your patience.
          </span>
        </div>
      )}
    </div>
  );
}
