import styles from "./HeartbeatLoader.module.css";

// Two ECG beats on a 240×60 canvas, baseline at y=30:
// flat → P wave → Q dip → tall R spike → S dip → T wave → flat.
const BEAT = (x) =>
  `L${x + 30},30 Q${x + 35},22 ${x + 40},30 L${x + 48},30 L${x + 52},36 ` +
  `L${x + 58},4 L${x + 64},54 L${x + 68},30 L${x + 80},30 Q${x + 88},18 ${x + 96},30 L${x + 120},30`;
export const ECG_PATH = `M0,30 ${BEAT(0)} ${BEAT(120)}`;

/**
 * Heart-monitor style loading indicator: a faint ECG trace with a bright
 * pulse sweeping along it.
 *   size:  "md" (in-page, default) | "lg" (full-screen)
 *   label: text under the trace, also announced to screen readers
 */
export default function HeartbeatLoader({ size = "md", label = "Loading…", children }) {
  return (
    <div className={`${styles.wrap} ${styles[size]}`} role="status" aria-live="polite">
      <svg className={styles.monitor} viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.trace} d={ECG_PATH} pathLength="100" />
        <path className={styles.pulse} d={ECG_PATH} pathLength="100" />
      </svg>
      {label && <p className={styles.label}>{label}</p>}
      {children}
    </div>
  );
}
