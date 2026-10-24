import styles from "./Avatar.module.css";

// Deterministic, pleasant palette — same name always lands on the same color.
const PALETTE = [
  { bg: "#e8f0fa", color: "#2563a6" },
  { bg: "#e6f4ea", color: "#2f855a" },
  { bg: "#fdf3dc", color: "#b7791f" },
  { bg: "#fbe9e7", color: "#c0392b" },
  { bg: "#f0e8fa", color: "#7c3aed" },
  { bg: "#e0f0e8", color: "#0d9488" },
  { bg: "#fde8f0", color: "#be185d" },
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function getColorIndex(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % PALETTE.length;
}

export default function Avatar({ name, size = "md" }) {
  const { bg, color } = PALETTE[getColorIndex(name || "")];
  return (
    <div
      className={`${styles.avatar} ${styles[size]}`}
      style={{ backgroundColor: bg, color }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
