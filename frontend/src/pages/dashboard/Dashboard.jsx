import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiUsers, FiActivity, FiCheckCircle, FiArrowRight, FiBookOpen, FiUserPlus,
  FiAlertTriangle, FiAlertOctagon, FiMessageCircle, FiClipboard,
  FiX, FiPlusCircle,
} from "react-icons/fi";
import { RiFirstAidKitLine } from "react-icons/ri";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
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

const QUICK_LINKS = [
  { to: "/patients",        label: "Open a Safety Query", icon: FiMessageCircle },
  { to: "/patients",        label: "Create a caregiver care plan", icon: FiClipboard },
  { to: "/patients/new",    label: "Add a patient",      icon: FiUserPlus },
  { to: "/learning-guides", label: "Learning guides",    icon: FiBookOpen },
  { to: "/microlearning",   label: "Microlearning",      icon: FiActivity },
];

const WELCOME_ACTIONS = [
  { to: "/patients", label: "Open a Safety Query", detail: "Choose a patient and ask a care question.", icon: FiMessageCircle },
  { to: "/patients", label: "Create a caregiver care plan", detail: "Make a practical plan for care and your own rest.", icon: FiClipboard },
  { to: "/microlearning", label: "Generate or view microlearning", detail: "Get short, practical learning for caregiving.", icon: FiActivity },
  { to: "/learning-guides", label: "Browse organization guides", detail: "Open learning guides shared by your organization.", icon: FiBookOpen },
  { to: "/patients", label: "Start patient onboarding", detail: "Choose a patient and continue their assessment.", icon: FiArrowRight },
  { to: "/patients/new", label: "Add a patient", detail: "Create a patient record to get started.", icon: FiPlusCircle },
];

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export default function Dashboard() {
  const { user } = useAuth();
  const dialogRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [agentGreeting, setAgentGreeting] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const { patients, loading, error } = usePatientsWithRisk();

  useEffect(() => {
    patientApi
      .getDashboardSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => setSummaryError("Could not load dashboard summary."));
    patientApi.getDashboardWelcome().then(({ data }) => setAgentGreeting(data.greeting || "")).catch(() => {});
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (welcomeOpen && !dialog.open) dialog.showModal();
    if (!welcomeOpen && dialog.open) dialog.close();
  }, [welcomeOpen]);

  const firstName = user?.fullName?.trim().split(/\s+/)[0] || "";
  const welcomeIntro = agentGreeting
    ? agentGreeting.split(/here(?:'s| is) what i can help with right now:|which of these would you like to begin with\?/i)[0].trim()
    : `Hi ${firstName || "there"}. What would you like to achieve today? I can help you take the next step in caring for your loved one.`;
  // Referrals first, then high sepsis risk.
  const attention = patients
    .filter((p) => p.risk?.referral_recommended || sepsisLevel(p) === "high")
    .sort((a, b) => Number(Boolean(b.risk?.referral_recommended)) - Number(Boolean(a.risk?.referral_recommended)));
  const recent = patients.slice(0, 5);

  const stats = [
    { label: "Patients in care",        value: summary?.totalPatients,                                    icon: FiUsers,        tone: "blue" },
    { label: "High sepsis risk",        value: loading ? undefined : patients.filter((p) => sepsisLevel(p) === "high").length, icon: FiAlertOctagon, tone: "red" },
    { label: "Assessments in progress", value: summary?.activeOnboardingSessions,                         icon: FiActivity,     tone: "orange" },
    { label: "Completed assessments",   value: summary?.completedAssessments,                             icon: FiCheckCircle,  tone: "green" },
  ];

  return (
    <AppLayout title="Dashboard">
      <PageHeader
        title={`Hi, ${firstName || "there"}. What would you like to achieve today?`}
        subtitle="Here's how the patients in your care are doing."
        actions={(
          <div className={styles.headerActions}>
            <Button variant="secondary" onClick={() => setWelcomeOpen(true)}>Open actions</Button>
            <Button to="/patients/new" icon={<FiUserPlus size={15} />}>Add patient</Button>
          </div>
        )}
      />

      <dialog
        ref={dialogRef}
        className={styles.welcomeDialog}
        aria-labelledby="welcome-title"
        aria-describedby="welcome-intro"
        onClose={() => setWelcomeOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setWelcomeOpen(false); }}
      >
        <div className={styles.welcomeContent}>
          <div className={styles.welcomeHeader}>
            <span className={styles.welcomeEyebrow}>SepsisCare</span>
            <button type="button" className={styles.welcomeClose} aria-label="Close welcome actions" onClick={() => setWelcomeOpen(false)}>
              <FiX size={20} />
            </button>
          </div>
          <h2 id="welcome-title">What would you like to achieve today?</h2>
          <p id="welcome-intro" className={styles.welcomeIntro}>{welcomeIntro}</p>
          <nav className={styles.welcomeActions} aria-label="Caregiver actions">
            {WELCOME_ACTIONS.map(({ to, label, detail, icon: Icon }) => (
              <Link key={label} to={to} className={styles.welcomeAction} onClick={() => setWelcomeOpen(false)}>
                <span className={styles.welcomeActionIcon} aria-hidden="true"><Icon size={18} /></span>
                <span className={styles.welcomeActionText}>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </span>
                <FiArrowRight size={16} className={styles.welcomeActionArrow} aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <button type="button" className={styles.welcomeDismiss} onClick={() => setWelcomeOpen(false)}>Go to dashboard</button>
        </div>
      </dialog>

      {(summaryError || error) && (
        <p className={styles.error} role="alert"><FiAlertTriangle size={15} /> {summaryError || error}</p>
      )}

      {/* ── KPI row ─────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`${styles.statCard} ${styles[tone]}`}>
            <div className={styles.statIcon} aria-hidden="true"><Icon size={20} /></div>
            <div>
              <p className={styles.statValue}>{value ?? <span className={styles.statPending}>–</span>}</p>
              <p className={styles.statLabel}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {/* ── Main column ──────────────────────────────────── */}
        <div className={styles.mainCol}>
          <Card title={`Needs attention${!loading && attention.length ? ` (${attention.length})` : ""}`} icon={<FiAlertTriangle />}>
            {loading && <div className={styles.center}><HeartbeatLoader label={null} /></div>}
            {!loading && attention.length === 0 && (
              <p className={styles.allClear}>
                <FiCheckCircle size={16} aria-hidden="true" />
                No referrals or high sepsis risks right now.
              </p>
            )}
            {!loading && attention.length > 0 && (
              <ul className={styles.attentionList}>
                {attention.map((p) => (
                  <li key={p.id}>
                    <Link to={`/patients/${p.id}`} className={styles.attentionItem}>
                      <Avatar name={p.fullName} size="sm" />
                      <div className={styles.attentionInfo}>
                        <span className={styles.attentionName}>{p.fullName}</span>
                        <span className={styles.attentionReason}>
                          {p.risk?.referral_recommended
                            ? `Referral recommended: ${p.risk.referral_reason || "see risk assessment."}`
                            : "High sepsis risk on latest assessment."}
                        </span>
                      </div>
                      <RiskBadge level={sepsisLevel(p)} />
                      <FiArrowRight size={15} className={styles.chevron} aria-hidden="true" />
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
            {loading && <div className={styles.center}><HeartbeatLoader label={null} /></div>}
            {!loading && recent.length === 0 && (
              <div className={styles.emptyInline}>
                <p>You haven't added any patients yet.</p>
                <Button to="/patients/new" icon={<FiUserPlus size={15} />}>Add your first patient</Button>
              </div>
            )}
            {!loading && recent.length > 0 && (
              <ul className={styles.recentList}>
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link to={`/patients/${p.id}`} className={styles.recentItem}>
                      <Avatar name={p.fullName} size="sm" />
                      <div className={styles.recentInfo}>
                        <span className={styles.recentName}>{p.fullName}</span>
                        <span className={styles.recentMeta}>
                          {p.age} yrs · {p.gender} · Assessed {formatDate(p.assessedAt)}
                        </span>
                      </div>
                      <RiskBadge level={sepsisLevel(p)} prefix="Sepsis" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Side column ──────────────────────────────────── */}
        <div className={styles.sideCol}>
          <Card title="Sepsis risk overview" icon={<RiFirstAidKitLine />}>
            {loading ? <div className={styles.center}><HeartbeatLoader label={null} /></div> : (
              <ul className={styles.riskList}>
                {RISK_ROWS.map(({ key, label, className }) => {
                  const count = patients.filter((p) => sepsisLevel(p) === key).length;
                  const pct = patients.length ? Math.round((count / patients.length) * 100) : 0;
                  return (
                    <li key={label}>
                      <div className={styles.riskRowTop}>
                        <span>{label}</span>
                        <span className={styles.riskCount}>{count}</span>
                      </div>
                      <div className={styles.bar} role="presentation">
                        <span className={`${styles.barFill} ${styles[className]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className={styles.footnote}>Based on each patient's latest risk assessment.</p>
          </Card>

          <Card title="Sepsis warning signs" icon={<FiAlertOctagon />}>
            <ul className={styles.signs}>
              {WARNING_SIGNS.map(({ letter, title, text }) => (
                <li key={letter} className={styles.sign}>
                  <span className={styles.signLetter} aria-hidden="true">{letter}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.urgent}>
              If you suspect sepsis, seek emergency care immediately. It is a medical emergency.
            </p>
          </Card>

          <Card title="Quick links">
            <ul className={styles.quickLinks}>
              {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
                <li key={label}>
                  <Link to={to} className={styles.quickLink}>
                    <Icon size={16} aria-hidden="true" /> {label}
                    <FiArrowRight size={14} className={styles.chevron} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
