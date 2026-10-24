import Badge from "../common/Badge.jsx";

const LEVELS = {
  high:     { tone: "danger",  label: "High" },
  moderate: { tone: "warning", label: "Moderate" },
  low:      { tone: "success", label: "Low" },
};

/** Risk level pill. Renders "Not assessed" when there is no level yet. */
export default function RiskBadge({ level, suffix = "" }) {
  const entry = LEVELS[String(level || "").toLowerCase()];
  if (!entry) return <Badge tone="neutral">Not assessed</Badge>;
  return <Badge tone={entry.tone}>{entry.label}{suffix}</Badge>;
}
