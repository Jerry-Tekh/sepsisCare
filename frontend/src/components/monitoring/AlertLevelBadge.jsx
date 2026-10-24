import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import Badge from "../common/Badge.jsx";

const LEVELS = {
  URGENT: { tone: "danger",  label: "Urgent", icon: FiAlertOctagon },
  WATCH:  { tone: "warning", label: "Watch",  icon: FiAlertTriangle },
  NORMAL: { tone: "success", label: "Normal", icon: FiCheckCircle },
};

/** Screening level pill — always icon + label, never color alone. */
export default function AlertLevelBadge({ level }) {
  const { tone, label, icon: Icon } = LEVELS[level] || LEVELS.NORMAL;
  return (
    <Badge tone={tone}>
      <Icon size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} aria-hidden="true" />
      {label}
    </Badge>
  );
}
