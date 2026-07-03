import { useEffect, useRef, useState } from "react";
import { FiSend } from "react-icons/fi";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import styles from "./ChatWindow.module.css";

export default function ChatWindow({ messages, onSend, isTyping, isComplete }) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  const blocked = isComplete || isTyping;

  // Auto-scroll to bottom when messages or typing indicator changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Re-focus input after AI responds (UX improvement)
  useEffect(() => {
    if (!isTyping && !isComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping, isComplete]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || blocked) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <div className={styles.chatWindow}>
      {/* Message list */}
      <div className={styles.messages} ref={scrollRef}>
        {messages.length === 0 && !isTyping && (
          <p className={styles.emptyChat}>Starting the assessment…</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {isTyping && <TypingIndicator />}
      </div>

      {/* Input bar */}
      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            isComplete ? "Assessment complete"
            : isTyping  ? "Please wait…"
            : "Type your answer here…"
          }
          disabled={blocked}
          aria-label="Your answer"
          autoComplete="off"
        />
        <button
          className={styles.sendButton}
          type="submit"
          disabled={blocked || !draft.trim()}
          aria-label="Send answer"
        >
          <FiSend size={18} />
        </button>
      </form>
    </div>
  );
}
