import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import styles from "./MonitoringForms.module.css";

const GUIDANCE = {
  URGENT: {
    icon: FiAlertOctagon,
    title: "Possible sepsis — seek emergency care now",
    text: "Call your local emergency number or go to the nearest hospital. Tell them you are worried about sepsis.",
  },
  WATCH: {
    icon: FiAlertTriangle,
    title: "Contact a clinician for advice",
    text: "Some readings are outside the normal range. Speak to a nurse or doctor today and check again soon. If anything gets worse, treat it as urgent.",
  },
  NORMAL: {
    icon: FiCheckCircle,
    title: "No warning signs recorded",
    text: "Keep monitoring. Trust your instincts — if the patient seems very unwell, seek help anyway.",
  },
};

/** What-to-do panel for a screening result, with the specific triggers listed. */
export default function AlertGuidance({ level, alerts = [], compact = false }) {
  const { icon: Icon, title, text } = GUIDANCE[level] || GUIDANCE.NORMAL;
  const reasons = alerts.filter((a) => a.field !== "combined");

  return (
    <div className={`${styles.guidance} ${styles[`guidance_${level}`]}`} role={level === "URGENT" ? "alert" : "status"}>
      <Icon size={compact ? 18 : 22} className={styles.guidanceIcon} />
      <div>
        <strong>{title}</strong>
        {!compact && <p>{text}</p>}
        {reasons.length > 0 && (
          <ul className={styles.reasons}>
            {reasons.map((a) => <li key={a.field}>{a.message}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
