import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiActivity, FiCheckSquare, FiClock, FiTrash2, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import PatientTabs from "../../components/patients/PatientTabs.jsx";
import VitalChart from "../../components/monitoring/VitalChart.jsx";
import VitalsForm from "../../components/monitoring/VitalsForm.jsx";
import CheckInForm from "../../components/monitoring/CheckInForm.jsx";
import AlertGuidance from "../../components/monitoring/AlertGuidance.jsx";
import AlertLevelBadge from "../../components/monitoring/AlertLevelBadge.jsx";
import { VITALS, CHECK_IN_QUESTIONS, currentStatus, formatDateTime, isToday } from "../../components/monitoring/vitals.js";
import * as monitoringApi from "../../api/monitoringApi";
import * as patientApi from "../../api/patientApi";
import { useToast } from "../../context/ToastContext.jsx";
import styles from "./MonitoringPage.module.css";

function vitalsSummary(r) {
  const parts = [];
  if (r.temperatureC != null)     parts.push(`${r.temperatureC} °C`);
  if (r.heartRate != null)        parts.push(`HR ${r.heartRate}`);
  if (r.respiratoryRate != null)  parts.push(`RR ${r.respiratoryRate}`);
  if (r.systolicBP != null)       parts.push(`BP ${r.systolicBP}${r.diastolicBP != null ? `/${r.diastolicBP}` : ""}`);
  if (r.oxygenSaturation != null) parts.push(`SpO₂ ${r.oxygenSaturation}%`);
  return parts.join(" · ");
}

function checkInSummary(c) {
  const yes = CHECK_IN_QUESTIONS.filter((q) => c[q.key]);
  return yes.length ? yes.map((q) => q.label.replace(/\?$/, "")).join("; ") : "No symptoms reported";
}

export default function MonitoringPage() {
  const { id: patientId } = useParams();
  const { showToast } = useToast();

  const [patient,  setPatient]  = useState(null);
  const [readings, setReadings] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [history,  setHistory]  = useState("vitals");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      patientApi.getPatient(patientId),
      monitoringApi.listVitals(patientId),
      monitoringApi.listCheckIns(patientId),
    ])
      .then(([p, v, c]) => {
        if (cancelled) return;
        setPatient(p.data.patient);
        setReadings(v.data.readings);
        setCheckIns(c.data.checkIns);
      })
      .catch(() => !cancelled && setError("Could not load monitoring data."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [patientId]);

  async function handleDelete(type, entry) {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    try {
      if (type === "vitals") {
        await monitoringApi.deleteVital(entry.id);
        setReadings((prev) => prev.filter((r) => r.id !== entry.id));
      } else {
        await monitoringApi.deleteCheckIn(entry.id);
        setCheckIns((prev) => prev.filter((c) => c.id !== entry.id));
      }
      showToast("Entry deleted.", { type: "success" });
    } catch {
      showToast("Could not delete entry.", { type: "error" });
    }
  }

  function addReading(reading) {
    setReadings((prev) => [reading, ...prev].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)));
    showToast("Vital signs saved.", { type: "success" });
  }

  function addCheckIn(checkIn) {
    setCheckIns((prev) => [checkIn, ...prev]);
    showToast("Check-in saved.", { type: "success" });
  }

  const status = currentStatus(readings, checkIns);
  const checkedInToday = checkIns.some((c) => isToday(c.createdAt));

  return (
    <AppLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Patients", to: "/patients" },
          { label: patient?.fullName || "Patient", to: `/patients/${patientId}` },
          { label: "Monitoring" },
        ]}
        title="Monitoring"
        subtitle={<>Track vital signs and daily symptoms for <strong>{patient?.fullName || "this patient"}</strong> to catch early signs of sepsis.</>}
      />
      <PatientTabs patientId={patientId} />

      {error && (
        <div className={styles.error} role="alert"><FiAlertTriangle size={16} /> {error}</div>
      )}

      {loading ? (
        <div className={styles.grid}>
          <div className={styles.chartsGrid}>
            {VITALS.map((v) => <Skeleton key={v.key} width="100%" height="190px" radius="8px" />)}
          </div>
          <Skeleton width="100%" height="420px" radius="10px" />
        </div>
      ) : (
        <>
          {/* ── Current status ───────────────────────────────── */}
          <div className={styles.status}>
            {status ? (
              <>
                <AlertGuidance level={status.alertLevel} alerts={status.alerts} />
                <p className={styles.statusMeta}>
                  <FiClock size={12} /> Based on the most serious entry in the last 48 hours
                  ({status.type === "vitals" ? "vital signs" : "check-in"}, {formatDateTime(status.at)}).
                </p>
              </>
            ) : (
              <p className={styles.statusEmpty}>
                Nothing recorded in the last 48 hours. Record vital signs or complete today's check-in below.
              </p>
            )}
          </div>

          <div className={styles.grid}>
            {/* ── Entry forms (first on mobile) ───────────────── */}
            <div className={styles.sideCol}>
              <Card
                title="Daily check-in"
                icon={<FiCheckSquare />}
                actions={checkedInToday && (
                  <span className={styles.doneToday}><FiCheckCircle size={13} /> Done today</span>
                )}
              >
                <CheckInForm patientId={patientId} onSaved={addCheckIn} />
              </Card>

              <Card title="Record vital signs" icon={<FiActivity />}>
                <VitalsForm patientId={patientId} onSaved={addReading} />
              </Card>
            </div>

            {/* ── Trends + history ────────────────────────────── */}
            <div className={styles.mainCol}>
              <Card title="Vital sign trends" icon={<FiActivity />}>
                {readings.length === 0 ? (
                  <p className={styles.empty}>No vital signs recorded yet. Charts appear after the first reading.</p>
                ) : (
                  <div className={styles.chartsGrid}>
                    {VITALS.map((v) => <VitalChart key={v.key} vital={v} readings={readings} />)}
                  </div>
                )}
              </Card>

              <Card
                title="History"
                icon={<FiClock />}
                actions={
                  <div className={styles.segmented} role="group" aria-label="History type">
                    {[["vitals", `Vital signs (${readings.length})`], ["check-ins", `Check-ins (${checkIns.length})`]].map(([key, label]) => (
                      <button
                        key={key}
                        className={`${styles.segment} ${history === key ? styles.segmentActive : ""}`}
                        aria-pressed={history === key}
                        onClick={() => setHistory(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                }
              >
                <HistoryList
                  type={history}
                  entries={history === "vitals" ? readings : checkIns}
                  onDelete={handleDelete}
                />
              </Card>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function HistoryList({ type, entries, onDelete }) {
  if (entries.length === 0) {
    return <p className={styles.empty}>No {type === "vitals" ? "vital sign readings" : "check-ins"} yet.</p>;
  }

  return (
    <ul className={styles.history}>
      {entries.map((e) => (
        <li key={e.id} className={styles.historyItem}>
          <AlertLevelBadge level={e.alertLevel} />
          <div className={styles.historyText}>
            <span className={styles.historyMain}>{type === "vitals" ? vitalsSummary(e) : checkInSummary(e)}</span>
            <span className={styles.historyMeta}>
              {formatDateTime(type === "vitals" ? e.recordedAt : e.createdAt)}
              {e.notes && <> · “{e.notes}”</>}
            </span>
          </div>
          <button className={styles.deleteBtn} onClick={() => onDelete(type, e)} aria-label="Delete entry" title="Delete entry">
            <FiTrash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
