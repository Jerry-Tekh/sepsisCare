import styles from "./Avatar.module.css";

// A fixed palette so each person keeps the same colour between visits.
const PALETTE = ["blue", "teal", "violet", "amber", "rose", "green"];

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function colourFor(name = "") {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** Initials avatar. size: "sm" | "md" | "lg". */
export default function Avatar({ name, size = "md" }) {
  return (
    <span className={`${styles.avatar} ${styles[size]} ${styles[colourFor(name)]}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
