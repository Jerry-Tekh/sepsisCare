import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiEdit2, FiPlay, FiArrowRight, FiAlertTriangle,
  FiUser, FiClipboard, FiActivity, FiMessageSquare,
} from "react-icons/fi";
import { RiFirstAidKitLine } from "react-icons/ri";
import AppLayout from "../../components/common/AppLayout.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Badge from "../../components/common/Badge.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import ConversationHistory from "../../components/discovery/ConversationHistory.jsx";
import * as patientApi  from "../../api/patientApi";
import * as discoveryApi from "../../api/discoveryApi";
import * as riskApi      from "../../api/riskApi";
import styles from "./PatientProfile.module.css";

export default function PatientProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [patient,       setPatient]       = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [riskProfile,   setRiskProfile]   = useState(null);
  const [sessions,      setSessions]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [starting,      setStarting]      = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [patRes, sesRes, listRes] = await Promise.all([
          patientApi.getPatient(id),
          discoveryApi.getActiveOnboardingSession(id),
          discoveryApi.listOnboardingSessions(id),
        ]);
        if (cancelled) return;
        setPatient(patRes.data.patient);
        setActiveSession(sesRes.data.session);
        setSessions(listRes.data.sessions);

        try {
          const riskRes = await riskApi.getLatestRiskProfile(id);
          if (!cancelled) setRiskProfile(riskRes.data.riskProfile);
        } catch { /* no profile yet */ }
      } catch {
        if (!cancelled) setError("Could not load patient.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleStartOnboarding() {
    setStarting(true);
    try {
      const { data } = await discoveryApi.startOnboarding(id);
      navigate(`/patients/${id}/onboarding`, { state: { sessionId: data.session.id } });
    } catch (err) {
      setError(err.response?.data?.error || "Could not start onboarding.");
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className={styles.loadingCenter}><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  if (error && !patient) {
    return (
      <AppLayout>
        <div className={styles.errorBox}>
          <FiAlertTriangle size={20} />
          {error}
        </div>
      </AppLayout>
    );
  }

  if (!patient) return null;

  const riskData = riskProfile?.riskData;

  return (
    <AppLayout>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}><FiUser size={24} /></div>
          <div>
            <h1 className={styles.patientName}>{patient.fullName}</h1>
            <p className={styles.patientMeta}>
              {patient.age} yrs &middot; {patient.gender} &middot; {patient.relationshipToCaregiver}
              {patient.location && ` · ${patient.location}`}
            </p>
          </div>
        </div>
        <Link to={`/patients/${id}/edit`}>
          <Button variant="secondary" icon={<FiEdit2 size={14} />}>Edit</Button>
        </Link>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <FiAlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Discovery status */}
      <Card title="Discovery Status" icon={<FiClipboard />}>
        {activeSession ? (
          <div className={styles.discoveryRow}>
            <Badge tone="warning">In Progress</Badge>
            <Button
              icon={<FiArrowRight size={15} />}
              onClick={() => navigate(`/patients/${id}/onboarding`, { state: { sessionId: activeSession.id } })}
            >
              Continue onboarding
            </Button>
          </div>
        ) : (
          <div className={styles.discoveryRow}>
            <Badge tone={riskProfile ? "success" : "neutral"}>
              {riskProfile ? "Assessment Complete" : "Not Started"}
            </Badge>
            <Button
              icon={<FiPlay size={14} />}
              onClick={handleStartOnboarding}
              disabled={starting}
            >
              {starting ? "Starting…" : riskProfile ? "New Assessment" : "Start Onboarding"}
            </Button>
          </div>
        )}
      </Card>

      {/* Risk profile */}
      {riskData && (
        <Card title="Risk Assessment" icon={<RiFirstAidKitLine />}>
          <div className={styles.riskGrid}>
            <RiskRow label="Infection risk"       value={riskData.infection_risk} />
            <RiskRow label="Sepsis risk"           value={riskData.sepsis_risk} />
            <RiskRow label="Pressure injury risk"  value={riskData.pressure_injury_risk} />
            <RiskRow label="Environmental risk"    value={riskData.environmental_risk} />
            <RiskRow label="Caregiver burden"      value={riskData.caregiver_burden} />
          </div>

          {riskData.referral_recommended && (
            <div className={styles.referralBox}>
              <FiAlertTriangle size={16} className={styles.referralIcon} />
              <div>
                <strong>Referral recommended</strong>
                <p>{riskData.referral_reason}</p>
              </div>
            </div>
          )}

          {riskData.known_conditions?.length > 0 && (
            <p className={styles.conditionLine}>
              <strong>Known:</strong> {riskData.known_conditions.join(", ")}
            </p>
          )}
          {riskData.possible_hidden_conditions?.length > 0 && (
            <p className={styles.conditionLine}>
              <strong>Possible:</strong> {riskData.possible_hidden_conditions.join(", ")}
            </p>
          )}

          <p className={styles.summary}>{riskData.summary}</p>
          <p className={styles.disclaimer}>
            Screening aid only — not a clinical diagnosis. Consult a clinician for evaluation.
          </p>
        </Card>
      )}

      {/* Conversation history */}
      <Card title="Conversation History" icon={<FiMessageSquare />}>
        <ConversationHistory sessions={sessions} />
      </Card>
    </AppLayout>
  );
}

function RiskRow({ label, value }) {
  const toneMap = { low: "success", moderate: "warning", high: "danger" };
  return (
    <div className={styles.riskRow}>
      <span className={styles.riskLabel}>{label}</span>
      <Badge tone={toneMap[value]}>{value}</Badge>
    </div>
  );
}
