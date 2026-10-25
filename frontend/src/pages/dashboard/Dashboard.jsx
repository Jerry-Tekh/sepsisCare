import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiUsers, FiActivity, FiCheckCircle, FiArrowRight } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import * as patientApi from "../../api/patientApi";
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

  useEffect(() => {
    patientApi
      .getDashboardSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => setError("Could not load dashboard summary."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <p className={styles.subtitle}>Overview of your caregiving activities</p>
      </div>

      {loading && <div className={styles.center}><Spinner size="lg" /></div>}
      {error   && <p className={styles.error}>{error}</p>}

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
