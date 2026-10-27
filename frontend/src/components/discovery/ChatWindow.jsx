import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import ChatComposer, { JumpToLatest } from "../chat/ChatComposer.jsx";
import useChatScroll from "../../hooks/useChatScroll.js";
import styles from "./ChatWindow.module.css";

/**
 * Onboarding chat. `onSend(text)` may return false (or a promise of false)
 * when sending failed; the text is then put back in the box to retry.
 */
export default function ChatWindow({ messages, onSend, isTyping, isComplete }) {
  const [draft, setDraft] = useState("");
  const inputRef  = useRef(null);
  const { scrollRef, showJump, jumpToLatest } = useChatScroll([messages, isTyping]);

  const blocked = isComplete || isTyping;

  // Re-focus the box after the assistant replies.
  useEffect(() => {
    if (!isTyping && !isComplete) inputRef.current?.focus();
  }, [isTyping, isComplete]);

  async function handleSubmit(text) {
    setDraft("");
    jumpToLatest("auto");
    const ok = await onSend(text);
    if (ok === false) setDraft((current) => current || text);
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.messagesWrap}>
        <div className={styles.messages} ref={scrollRef} role="log" aria-live="polite" aria-label="Onboarding conversation">
          {messages.length === 0 && !isTyping && (
            <p className={styles.emptyChat}>Starting the assessment…</p>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} createdAt={m.createdAt} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
        {showJump && <JumpToLatest onClick={jumpToLatest} />}
      </div>

      <ChatComposer
        inputRef={inputRef}
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        disabled={blocked}
        label="Your answer"
        placeholder={
          isComplete ? "Assessment complete"
          : isTyping  ? "Please wait…"
          : "Type your answer… (Enter to send, Shift+Enter for a new line)"
        }
      />
    </div>
  );
}
