import { useLayoutEffect, useRef } from "react";
import { FiSend } from "react-icons/fi";
import styles from "./Chat.module.css";

const MAX_HEIGHT_PX = 160;

/**
 * Message box for chat screens: grows with its content (up to a limit),
 * Enter sends, Shift+Enter adds a new line.
 */
export default function ChatComposer({ value, onChange, onSubmit, disabled, placeholder, label = "Your message", inputRef }) {
  const localRef = useRef(null);
  const ref = inputRef || localRef;

  // Resize to fit the text whenever it changes.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value, ref]);

  function submit(e) {
    e.preventDefault();
    if (!disabled && value.trim()) onSubmit(value.trim());
  }

  function handleKeyDown(e) {
    // Don't send while an IME (e.g. for accented or non-Latin input) is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  }

  return (
    <form className={styles.composer} onSubmit={submit}>
      <textarea
        ref={ref}
        className={styles.composerInput}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={label}
        autoComplete="off"
      />
      <button className={styles.sendButton} type="submit" disabled={disabled || !value.trim()} aria-label="Send">
        <FiSend size={18} />
      </button>
    </form>
  );
}

/** Floating "Jump to latest" pill shown when the reader has scrolled up. */
export function JumpToLatest({ onClick }) {
  return (
    <button type="button" className={styles.jump} onClick={() => onClick()}>
      ↓ Jump to latest
    </button>
  );
}
