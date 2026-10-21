import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiUsers, FiActivity, FiCheckCircle, FiArrowRight, FiAlertTriangle } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import * as patientApi from "../../api/patientApi";
import * as riskApi from "../../api/riskApi";
import styles from "./Dashboard.module.css";

const STATS = [
  { key: "totalPatients",            label: "Total Patients",            icon: FiUsers,        tone: "blue"   },
  { key: "activeOnboardingSessions", label: "Active Sessions",           icon: FiActivity,     tone: "orange" },
  { key: "completedAssessments",     label: "Completed Assessments",     icon: FiCheckCircle,  tone: "green"  },
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [attention, setAttention]               = useState([]);
  const [attentionLoading, setAttentionLoading] = useState(true);

  useEffect(() => {
    patientApi
      .getDashboardSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => setError("Could not load dashboard summary."))
      .finally(() => setLoading(false));
  }, []);

  // "Needs attention" widget: patients whose latest risk profile recommends
  // a referral. Best-effort — a patient with no risk profile yet (404) is
  // simply excluded, not treated as an error.
  useEffect(() => {
    let cancelled = false;

    async function loadAttention() {
      try {
        const { data } = await patientApi.listPatients();
        const results = await Promise.allSettled(
          data.patients.map((patient) =>
            riskApi.getLatestRiskProfile(patient.id).then((res) => ({
              patient,
              riskData: res.data.riskProfile.riskData,
            }))
          )
        );
        if (cancelled) return;
        const flagged = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value)
          .filter(({ riskData }) => riskData?.referral_recommended)
          .map(({ patient, riskData }) => ({
            id: patient.id,
            name: patient.fullName,
            reason: riskData.referral_reason,
          }));
        setAttention(flagged);
      } catch {
        // Non-critical widget — fail quietly, dashboard stats still work.
      } finally {
        if (!cancelled) setAttentionLoading(false);
      }
    }

    loadAttention();
    return () => { cancelled = true; };
  }, []);

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <p className={styles.subtitle}>Overview of your caregiving activities</p>
      </div>

      {!attentionLoading && attention.length > 0 && (
        <div className={styles.attentionCard}>
          <div className={styles.attentionHeader}>
            <FiAlertTriangle size={17} className={styles.attentionIcon} />
            <h2 className={styles.attentionTitle}>
              Needs attention ({attention.length})
            </h2>
          </div>
          <div className={styles.attentionList}>
            {attention.map((item) => (
              <Link key={item.id} to={`/patients/${item.id}`} className={styles.attentionItem}>
                <Avatar name={item.name} size="xs" />
                <div className={styles.attentionInfo}>
                  <span className={styles.attentionName}>{item.name}</span>
                  <span className={styles.attentionReason}>{item.reason}</span>
                </div>
                <FiArrowRight size={14} className={styles.attentionArrow} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className={styles.statsGrid}>
          {STATS.map(({ key }) => (
            <div key={key} className={styles.statCard}>
              <Skeleton circle width="52px" height="52px" />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height="1.6rem" />
                <Skeleton width="80%" height="0.8rem" className={styles.skeletonGap} />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}

      {summary && (
        <div className={styles.statsGrid}>
          {STATS.map(({ key, label, icon: Icon, tone }) => (
            <div key={key} className={`${styles.statCard} ${styles[tone]}`}>
              <div className={styles.statIcon}><Icon size={28} /></div>
              <div>
                <p className={styles.statValue}>{summary[key]}</p>
                <p className={styles.statLabel}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <Link to="/patients" className={styles.cta}>
          <FiUsers size={17} />
          View all patients
          <FiArrowRight size={16} />
        </Link>
        <Link to="/patients/new" className={`${styles.cta} ${styles.ctaSecondary}`}>
          Start new patient
          <FiArrowRight size={16} />
        </Link>
      </div>
    </AppLayout>
  );
}
