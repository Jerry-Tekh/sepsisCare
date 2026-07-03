import { RiRobot2Line } from "react-icons/ri";
import { FiUser } from "react-icons/fi";
import styles from "./MessageBubble.module.css";

export default function MessageBubble({ role, content }) {
  const isAssistant = role === "ASSISTANT";

  return (
    <div className={`${styles.row} ${isAssistant ? styles.rowLeft : styles.rowRight}`}>
      {isAssistant && (
        <div className={styles.avatar} aria-hidden="true">
          <RiRobot2Line size={16} />
        </div>
      )}
      <div className={`${styles.bubble} ${isAssistant ? styles.assistant : styles.caregiver}`}>
        {content}
      </div>
      {!isAssistant && (
        <div className={`${styles.avatar} ${styles.avatarRight}`} aria-hidden="true">
          <FiUser size={15} />
        </div>
      )}
    </div>
  );
}
