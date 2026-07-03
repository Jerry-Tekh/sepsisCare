import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiMessageSquare } from "react-icons/fi";
import Badge from "../common/Badge.jsx";
import MessageBubble from "./MessageBubble.jsx";
import styles from "./ConversationHistory.module.css";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ConversationHistory({ sessions }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!sessions || sessions.length === 0) {
    return (
      <div className={styles.empty}>
        <FiMessageSquare size={32} className={styles.emptyIcon} />
        <p>No onboarding conversations yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {sessions.map((session) => {
        const isOpen = expandedId === session.id;
        const isCompleted = session.status === "COMPLETED";
        const msgCount = session.messages?.length ?? 0;

        return (
          <div key={session.id} className={styles.sessionItem}>
            <button
              type="button"
              className={styles.sessionHeader}
              onClick={() => setExpandedId(isOpen ? null : session.id)}
              aria-expanded={isOpen}
            >
              <div className={styles.headerLeft}>
                <Badge tone={isCompleted ? "success" : "warning"}>
                  {isCompleted ? "Completed" : "In Progress"}
                </Badge>
                <span className={styles.sessionDate}>
                  {formatDate(session.startedAt)}
                </span>
                <span className={styles.msgCount}>{msgCount} message{msgCount !== 1 ? "s" : ""}</span>
              </div>
              <span className={styles.chevron} aria-hidden="true">
                {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </span>
            </button>

            {isOpen && (
              <div className={styles.transcript}>
                {session.messages.length === 0 ? (
                  <p className={styles.noMessages}>No messages in this session.</p>
                ) : (
                  session.messages.map((m) => (
                    <MessageBubble key={m.id} role={m.role} content={m.content} />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
