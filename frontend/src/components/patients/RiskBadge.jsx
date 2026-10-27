import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiMinusCircle } from "react-icons/fi";
import Badge from "../common/Badge.jsx";

const LEVELS = {
  high:     { tone: "danger",  label: "High",         icon: FiAlertOctagon },
  moderate: { tone: "warning", label: "Moderate",     icon: FiAlertTriangle },
  low:      { tone: "success", label: "Low",          icon: FiCheckCircle },
  none:     { tone: "neutral", label: "Not assessed", icon: FiMinusCircle },
};

/**
 * Risk-level pill. Always shows an icon and a label alongside the colour, so
 * the level never depends on colour alone. `prefix` (e.g. "Sepsis") is
 * prepended to the label.
 */
export default function RiskBadge({ level, prefix }) {
  const { tone, label, icon: Icon } = LEVELS[level] || LEVELS.none;
  return (
    <Badge tone={tone}>
      <Icon size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} aria-hidden="true" />
      {prefix && level ? `${prefix} ${label}` : label}
    </Badge>
  );
}
