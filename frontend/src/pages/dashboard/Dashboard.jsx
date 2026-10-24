import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiUsers, FiActivity, FiCheckCircle, FiArrowRight, FiAlertTriangle, FiUserPlus, FiAlertOctagon,
} from "react-icons/fi";
import { RiFirstAidKitLine } from "react-icons/ri";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import RiskBadge from "../../components/patients/RiskBadge.jsx";
import AlertLevelBadge from "../../components/monitoring/AlertLevelBadge.jsx";
import { formatDateTime as formatDateTimeShort } from "../../components/monitoring/vitals.js";
import usePatientsWithRisk, { sepsisLevel } from "../../hooks/usePatientsWithRisk.js";
import { useAuth } from "../../context/AuthContext.jsx";
import * as patientApi from "../../api/patientApi";
import * as monitoringApi from "../../api/monitoringApi";
import styles from "./Dashboard.module.css";

// Sepsis Alliance "TIME" mnemonic for spotting sepsis at home.
const WARNING_SIGNS = [
  { letter: "T", title: "Temperature",    text: "Higher or lower than normal." },
  { letter: "I", title: "Infection",      text: "May have signs and symptoms of an infection." },
  { letter: "M", title: "Mental decline", text: "Confused, sleepy, difficult to rouse." },
  { letter: "E", title: "Extremely ill",  text: "Severe pain, discomfort, shortness of breath." },
];

const RISK_ROWS = [
  { key: "high",     label: "High",         className: "barHigh" },
  { key: "moderate", label: "Moderate",     className: "barModerate" },
  { key: "low",      label: "Low",          className: "barLow" },
  { key: null,       label: "Not assessed", className: "barNone" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// URGENT monitoring alert > WATCH alert > assessment-only flag.
function alertRank(p) {
  if (p.monitoringAlert?.alertLevel === "URGENT") return 2;
  if (p.monitoringAlert?.alertLevel === "WATCH") return 1;
  return 0;
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const { patients, loading: patientsLoading, error: patientsError } = usePatientsWithRisk();

  const [monitoringAlerts, setMonitoringAlerts] = useState([]);

  useEffect(() => {
    patientApi
      .getDashboardSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => setSummaryError("Could not load dashboard summary."))
      .finally(() => setSummaryLoading(false));

    // Best-effort — the rest of the dashboard works without it.
    monitoringApi
      .getRecentAlerts()
      .then(({ data }) => setMonitoringAlerts(data.alerts))
      .catch(() => {});
  }, []);

  const firstName = user?.fullName?.trim().split(/\s+/)[0] || "";
  const highRiskCount = patients.filter((p) => sepsisLevel(p) === "high").length;

  // Recent monitoring alerts come first (urgent before watch), then anyone
  // with a referral recommendation or a high sepsis risk from assessment.
  const alertByPatient = new Map(monitoringAlerts.map((a) => [a.patientId, a]));
  const attention = patients
    .filter((p) => alertByPatient.has(p.id) || p.risk?.referral_recommended || sepsisLevel(p) === "high")
    .map((p) => ({ ...p, monitoringAlert: alertByPatient.get(p.id) }))
    .sort((a, b) => alertRank(b) - alertRank(a));
  const recent = patients.slice(0, 5);

  const stats = [
    { label: "Patients in care",        value: summary?.totalPatients,            icon: FiUsers,        tone: "blue",   loading: summaryLoading },
    { label: "High sepsis risk",        value: highRiskCount,                     icon: FiAlertOctagon, tone: "red",    loading: patientsLoading },
    { label: "Assessments in progress", value: summary?.activeOnboardingSessions, icon: FiActivity,     tone: "orange", loading: summaryLoading },
    { label: "Completed assessments",   value: summary?.completedAssessments,     icon: FiCheckCircle,  tone: "green",  loading: summaryLoading },
  ];

  return (
    <AppLayout>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        subtitle="Here's an overview of the patients in your care."
        actions={<Button to="/patients/new" icon={<FiUserPlus size={15} />}>Register patient</Button>}
      />

      {(summaryError || patientsError) && (
        <div className={styles.error} role="alert">
          <FiAlertTriangle size={16} /> {summaryError || patientsError}
        </div>
      )}

      {/* ── KPI row ─────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {stats.map(({ label, value, icon: Icon, tone, loading }) => (
          <div key={label} className={`${styles.statCard} ${styles[tone]}`}>
            <div className={styles.statIcon}><Icon size={20} /></div>
            <div className={styles.statBody}>
              <p className={styles.statLabel}>{label}</p>
              {loading
                ? <Skeleton width="48px" height="1.6rem" />
                : <p className={styles.statValue}>{value ?? "—"}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {/* ── Main column ──────────────────────────────────── */}
        <div className={styles.mainCol}>
          <Card
            title={`Needs attention${!patientsLoading && attention.length ? ` (${attention.length})` : ""}`}
            icon={<FiAlertTriangle />}
          >
            {patientsLoading && <ListSkeleton rows={2} />}
            {!patientsLoading && attention.length === 0 && (
              <p className={styles.emptyText}>
                <FiCheckCircle size={15} className={styles.okIcon} />
                No monitoring alerts, referrals or high sepsis risks right now.
              </p>
            )}
            {!patientsLoading && attention.length > 0 && (
              <ul className={styles.attentionList}>
                {attention.map((p) => {
                  const alert = p.monitoringAlert;
                  return (
                    <li key={p.id}>
                      <Link
                        to={`/patients/${p.id}${alert ? "/monitoring" : ""}`}
                        className={`${styles.attentionItem} ${alert?.alertLevel === "WATCH" ? styles.attentionWatch : ""}`}
                      >
                        <Avatar name={p.fullName} size="sm" />
                        <div className={styles.attentionInfo}>
                          <span className={styles.attentionName}>{p.fullName}</span>
                          <span className={styles.attentionReason}>
                            {alert
                              ? `${alert.message} (${alert.type === "vitals" ? "vital signs" : "check-in"}, ${formatDateTimeShort(alert.at)})`
                              : p.risk?.referral_reason || "High sepsis risk on latest assessment."}
                          </span>
                        </div>
                        {alert ? <AlertLevelBadge level={alert.alertLevel} /> : <RiskBadge level={sepsisLevel(p)} />}
                        <FiArrowRight size={15} className={styles.chevron} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            title="Recent patients"
            icon={<FiUsers />}
            actions={<Link to="/patients" className={styles.cardLink}>View all <FiArrowRight size={13} /></Link>}
          >
            {patientsLoading && <ListSkeleton rows={3} />}
            {!patientsLoading && recent.length === 0 && (
              <div className={styles.emptyState}>
                <p>You haven't registered any patients yet.</p>
                <Button to="/patients/new" icon={<FiUserPlus size={15} />}>Register your first patient</Button>
              </div>
            )}
            {!patientsLoading && recent.length > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Sepsis risk</th>
                      <th>Last assessed</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className={styles.patientCell}>
                            <Avatar name={p.fullName} size="xs" />
                            <div>
                              <span className={styles.patientName}>{p.fullName}</span>
                              <span className={styles.patientMeta}>{p.age} yrs · {p.gender}</span>
                            </div>
                          </div>
                        </td>
                        <td><RiskBadge level={sepsisLevel(p)} /></td>
                        <td className={styles.muted}>{formatDate(p.assessedAt)}</td>
                        <td className={styles.alignRight}>
                          <Link to={`/patients/${p.id}`} className={styles.cardLink}>Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ── Side column ──────────────────────────────────── */}
        <div className={styles.sideCol}>
          <Card title="Risk overview" icon={<RiFirstAidKitLine />}>
            {patientsLoading ? <ListSkeleton rows={4} /> : (
              <ul className={styles.riskList}>
                {RISK_ROWS.map(({ key, label, className }) => {
                  const count = patients.filter((p) => sepsisLevel(p) === key).length;
                  const pct = patients.length ? Math.round((count / patients.length) * 100) : 0;
                  return (
                    <li key={label} className={styles.riskRow}>
                      <div className={styles.riskRowTop}>
                        <span>{label}</span>
                        <span className={styles.riskCount}>{count}</span>
                      </div>
                      <div className={styles.bar}>
                        <span className={`${styles.barFill} ${styles[className]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className={styles.footnote}>Based on each patient's latest sepsis risk assessment.</p>
          </Card>

          <Card title="Sepsis warning signs" icon={<FiAlertOctagon />}>
            <ul className={styles.signs}>
              {WARNING_SIGNS.map(({ letter, title, text }) => (
                <li key={letter} className={styles.sign}>
                  <span className={styles.signLetter}>{letter}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.urgent}>
              If you suspect sepsis, seek emergency care immediately — it is a medical emergency.
            </p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function ListSkeleton({ rows }) {
  return (
    <div className={styles.skeletonList}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width="100%" height="2.6rem" radius="8px" />
      ))}
    </div>
  );
}
