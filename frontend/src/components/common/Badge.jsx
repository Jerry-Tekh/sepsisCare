import styles from "./Badge.module.css";

const TONE_MAP = {
  low: "success",
  moderate: "warning",
  high: "danger",
  active: "primary",
  completed: "success",
  in_progress: "warning",
};

export default function Badge({ children, tone }) {
  const resolvedTone = tone || TONE_MAP[String(children).toLowerCase()] || "neutral";
  return <span className={`${styles.badge} ${styles[resolvedTone]}`}>{children}</span>;
}
