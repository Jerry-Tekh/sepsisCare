import { RiRobot2Line } from "react-icons/ri";
import { FiUser } from "react-icons/fi";
import styles from "./MessageBubble.module.css";

export function formatMessageTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function MessageBubble({ role, content, createdAt }) {
  const isAssistant = role === "ASSISTANT";
  const time = formatMessageTime(createdAt);

  return (
    <div className={`${styles.row} ${isAssistant ? styles.rowLeft : styles.rowRight}`}>
      {isAssistant && (
        <div className={styles.avatar} aria-hidden="true">
          <RiRobot2Line size={16} />
        </div>
      )}
      <div className={styles.stack}>
        <span className="sr-only">{isAssistant ? "Assistant said:" : "You said:"}</span>
        <div className={`${styles.bubble} ${isAssistant ? styles.assistant : styles.caregiver}`}>
          {content}
        </div>
        {time && <time className={styles.time} dateTime={createdAt}>{time}</time>}
      </div>
      {!isAssistant && (
        <div className={`${styles.avatar} ${styles.avatarRight}`} aria-hidden="true">
          <FiUser size={15} />
        </div>
      )}
    </div>
  );
}
