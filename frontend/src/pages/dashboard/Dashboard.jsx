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
import usePatientsWithRisk, { sepsisLevel } from "../../hooks/usePatientsWithRisk.js";
import { useAuth } from "../../context/AuthContext.jsx";
import * as patientApi from "../../api/patientApi";
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

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const { patients, loading: patientsLoading, error: patientsError } = usePatientsWithRisk();

  useEffect(() => {
    patientApi
      .getDashboardSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => setSummaryError("Could not load dashboard summary."))
      .finally(() => setSummaryLoading(false));
  }, []);

  const firstName = user?.fullName?.trim().split(/\s+/)[0] || "";
  const highRiskCount = patients.filter((p) => sepsisLevel(p) === "high").length;

  // Flag anyone with a referral recommendation or a high sepsis risk.
  const attention = patients.filter((p) => p.risk?.referral_recommended || sepsisLevel(p) === "high");
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
                No patients are currently flagged for referral or high sepsis risk.
              </p>
            )}
            {!patientsLoading && attention.length > 0 && (
              <ul className={styles.attentionList}>
                {attention.map((p) => (
                  <li key={p.id}>
                    <Link to={`/patients/${p.id}`} className={styles.attentionItem}>
                      <Avatar name={p.fullName} size="sm" />
                      <div className={styles.attentionInfo}>
                        <span className={styles.attentionName}>{p.fullName}</span>
                        <span className={styles.attentionReason}>
                          {p.risk?.referral_reason || "High sepsis risk on latest assessment."}
                        </span>
                      </div>
                      <RiskBadge level={sepsisLevel(p)} />
                      <FiArrowRight size={15} className={styles.chevron} />
                    </Link>
                  </li>
                ))}
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
