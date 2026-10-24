import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiEdit2, FiPlay, FiArrowRight, FiAlertTriangle,
  FiClipboard, FiMessageSquare, FiBookOpen, FiUser, FiActivity, FiCheckCircle,
} from "react-icons/fi";
import { RiFirstAidKitLine, RiQuestionAnswerLine } from "react-icons/ri";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Badge from "../../components/common/Badge.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import RiskBadge from "../../components/patients/RiskBadge.jsx";
import PatientTabs from "../../components/patients/PatientTabs.jsx";
import ConversationHistory from "../../components/discovery/ConversationHistory.jsx";
import AlertLevelBadge from "../../components/monitoring/AlertLevelBadge.jsx";
import { currentStatus, formatDateTime, isToday } from "../../components/monitoring/vitals.js";
import * as patientApi      from "../../api/patientApi";
import * as discoveryApi    from "../../api/discoveryApi";
import * as riskApi         from "../../api/riskApi";
import * as safetyQueryApi  from "../../api/safetyQueryApi";
import * as microlearningApi from "../../api/microlearningApi";
import * as monitoringApi   from "../../api/monitoringApi";
import styles from "./PatientProfile.module.css";

const RISK_FIELDS = [
  { key: "sepsis_risk",          label: "Sepsis" },
  { key: "infection_risk",       label: "Infection" },
  { key: "pressure_injury_risk", label: "Pressure injury" },
  { key: "environmental_risk",   label: "Environmental" },
  { key: "caregiver_burden",     label: "Caregiver burden" },
];

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export default function PatientProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [patient,         setPatient]         = useState(null);
  const [activeSession,   setActiveSession]   = useState(null);
  const [riskProfile,     setRiskProfile]     = useState(null);
  const [sessions,        setSessions]        = useState([]);
  const [safetyQueries,   setSafetyQueries]   = useState([]);
  const [materials,       setMaterials]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [starting,        setStarting]        = useState(false);
  const [monitoring,      setMonitoring]      = useState(null); // { readings, checkIns } | null

  // Loaded separately so a monitoring failure never blocks the patient record.
  useEffect(() => {
    let cancelled = false;
    Promise.all([monitoringApi.listVitals(id, 20), monitoringApi.listCheckIns(id, 20)])
      .then(([v, c]) => {
        if (!cancelled) setMonitoring({ readings: v.data.readings, checkIns: c.data.checkIns });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [patientRes, sesRes, sessionsListRes, sqRes, mlRes] = await Promise.all([
          patientApi.getPatient(id),
          discoveryApi.getActiveOnboardingSession(id),
          discoveryApi.listOnboardingSessions(id),
          safetyQueryApi.listQueries(id),
          microlearningApi.listMaterials(id),
        ]);
        if (cancelled) return;
        setPatient(patientRes.data.patient);
        setActiveSession(sesRes.data.session);
        setSessions(sessionsListRes.data.sessions);
        setSafetyQueries(sqRes.data.queries);
        setMaterials(mlRes.data.materials);

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

  function continueOnboarding() {
    navigate(`/patients/${id}/onboarding`, { state: { sessionId: activeSession.id } });
  }

  const crumbs = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Patients", to: "/patients" },
    { label: patient?.fullName || "Patient" },
  ];

  if (loading) {
    return (
      <AppLayout>
        <PageHeader
          breadcrumbs={crumbs}
          leading={<Skeleton circle width="56px" height="56px" />}
          title={<Skeleton width="200px" height="1.5rem" />}
          subtitle={<Skeleton width="240px" height="0.85rem" />}
        />
        <div className={styles.grid}>
          <div>
            {[0, 1].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton width="140px" height="1rem" />
                <Skeleton width="100%" height="5rem" radius="8px" />
              </div>
            ))}
          </div>
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton width="120px" height="1rem" />
                <Skeleton width="100%" height="2.5rem" radius="8px" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !patient) {
    return (
      <AppLayout>
        <PageHeader breadcrumbs={crumbs} title="Patient record" />
        <div className={styles.errorBox} role="alert">
          <FiAlertTriangle size={18} /> {error}
        </div>
      </AppLayout>
    );
  }

  if (!patient) return null;

  const riskData = riskProfile?.riskData;
  const assignedGuides = materials.filter((m) => m.isAssigned).length;
  const hasRedFlag = safetyQueries.some((q) => q.status === "RED_FLAG_TRIGGERED");

  const assessmentAction = activeSession ? (
    <Button icon={<FiArrowRight size={15} />} onClick={continueOnboarding}>Continue assessment</Button>
  ) : (
    <Button icon={<FiPlay size={14} />} onClick={handleStartOnboarding} disabled={starting}>
      {starting ? "Starting…" : riskProfile ? "New assessment" : "Start assessment"}
    </Button>
  );

  return (
    <AppLayout>
      <PageHeader
        breadcrumbs={crumbs}
        leading={<Avatar name={patient.fullName} size="lg" />}
        title={patient.fullName}
        subtitle={
          <span className={styles.headerMeta}>
            <span>{patient.age} yrs · {patient.gender}{patient.location && ` · ${patient.location}`}</span>
            <RiskBadge level={riskData?.sepsis_risk} suffix={riskData ? " sepsis risk" : ""} />
          </span>
        }
        actions={
          <>
            <Button to={`/patients/${id}/edit`} variant="secondary" icon={<FiEdit2 size={14} />}>Edit details</Button>
            {assessmentAction}
          </>
        }
      />

      <PatientTabs patientId={id} />

      {error && (
        <div className={styles.errorBox} role="alert">
          <FiAlertTriangle size={16} /> {error}
        </div>
      )}

      {riskData?.referral_recommended && (
        <div className={styles.referralBanner} role="alert">
          <FiAlertTriangle size={20} className={styles.referralIcon} />
          <div>
            <strong>Clinical referral recommended</strong>
            <p>{riskData.referral_reason}</p>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* ── Main column ──────────────────────────────────── */}
        <div className={styles.mainCol}>
          <Card
            title="Risk assessment"
            icon={<RiFirstAidKitLine />}
            actions={riskProfile && <span className={styles.cardMeta}>Assessed {formatDate(riskProfile.createdAt)}</span>}
          >
            {riskData ? (
              <>
                <div className={styles.riskGrid}>
                  {RISK_FIELDS.map(({ key, label }) => (
                    <div key={key} className={`${styles.riskTile} ${styles[`tile_${String(riskData[key] || "").toLowerCase()}`] || ""}`}>
                      <span className={styles.riskLabel}>{label}</span>
                      <RiskBadge level={riskData[key]} />
                    </div>
                  ))}
                </div>

                {riskData.summary && (
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Clinical summary</h4>
                    <p className={styles.summary}>{riskData.summary}</p>
                  </div>
                )}

                {(riskData.known_conditions?.length > 0 || riskData.possible_hidden_conditions?.length > 0) && (
                  <div className={styles.conditionsGrid}>
                    {riskData.known_conditions?.length > 0 && (
                      <div>
                        <h4 className={styles.sectionTitle}>Known conditions</h4>
                        <div className={styles.chips}>
                          {riskData.known_conditions.map((c) => <span key={c} className={styles.chip}>{c}</span>)}
                        </div>
                      </div>
                    )}
                    {riskData.possible_hidden_conditions?.length > 0 && (
                      <div>
                        <h4 className={styles.sectionTitle}>Possible conditions to rule out</h4>
                        <div className={styles.chips}>
                          {riskData.possible_hidden_conditions.map((c) => (
                            <span key={c} className={`${styles.chip} ${styles.chipWarn}`}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p className={styles.disclaimer}>
                  Screening aid only — not a clinical diagnosis. Consult a clinician for evaluation.
                </p>
              </>
            ) : (
              <div className={styles.emptyBlock}>
                <FiClipboard size={28} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>
                  {activeSession ? "Assessment in progress" : "No risk assessment yet"}
                </p>
                <p className={styles.emptyHint}>
                  {activeSession
                    ? "Finish the onboarding conversation to generate this patient's risk profile."
                    : "Run the guided onboarding assessment to screen for sepsis, infection and other risks."}
                </p>
                {assessmentAction}
              </div>
            )}
          </Card>

          <Card title="Assessment history" icon={<FiMessageSquare />}>
            <ConversationHistory sessions={sessions} />
          </Card>
        </div>

        {/* ── Side column ──────────────────────────────────── */}
        <div className={styles.sideCol}>
          {monitoring && <MonitoringCard patientId={id} {...monitoring} />}

          <Card title="Patient details" icon={<FiUser />}>
            <dl className={styles.details}>
              <dt>Full name</dt>      <dd>{patient.fullName}</dd>
              <dt>Age</dt>            <dd>{patient.age} years</dd>
              <dt>Gender</dt>         <dd>{patient.gender}</dd>
              <dt>Relationship</dt>   <dd>{patient.relationshipToCaregiver}</dd>
              <dt>Location</dt>       <dd>{patient.location || "—"}</dd>
              <dt>Registered</dt>     <dd>{formatDate(patient.createdAt)}</dd>
            </dl>
          </Card>

          <Card title="Assessment status" icon={<FiClipboard />}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Onboarding</span>
              {activeSession
                ? <Badge tone="warning">In progress</Badge>
                : <Badge tone={riskProfile ? "success" : "neutral"}>{riskProfile ? "Complete" : "Not started"}</Badge>}
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Assessments run</span>
              <span className={styles.statusValue}>{sessions.length}</span>
            </div>
          </Card>

          <Card title="Safety Query" icon={<RiQuestionAnswerLine />}>
            <p className={styles.featureDesc}>
              Ask the AI about safe care for {patient.fullName}. It knows their risk profile and will alert you to red flags.
            </p>
            {safetyQueries.length > 0 && (
              <p className={styles.featureMeta}>
                {safetyQueries.length} past {safetyQueries.length === 1 ? "query" : "queries"}
                {hasRedFlag && (
                  <span className={styles.redFlagNote}><FiAlertTriangle size={12} /> Red flag on record</span>
                )}
              </p>
            )}
            <Link to={`/patients/${id}/safety-query`} className={styles.featureLink}>
              {safetyQueries.length > 0 ? "Open safety chat" : "Ask a question"} <FiArrowRight size={14} />
            </Link>
          </Card>

          <Card title="Care guides" icon={<FiBookOpen />}>
            <p className={styles.featureDesc}>
              Patient-specific guides on wound care, infection prevention, nutrition and more — downloadable as PDFs or picture cards.
            </p>
            {materials.length > 0 && (
              <p className={styles.featureMeta}>
                {assignedGuides} in care plan · {materials.length} total
              </p>
            )}
            <Link to={`/patients/${id}/microlearning`} className={styles.featureLink}>
              {materials.length > 0 ? "View guides" : "Explore library"} <FiArrowRight size={14} />
            </Link>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function MonitoringCard({ patientId, readings, checkIns }) {
  const status = currentStatus(readings, checkIns);
  const latest = readings[0];
  const checkedInToday = checkIns.some((c) => isToday(c.createdAt));

  const latestValues = latest && [
    latest.temperatureC != null     && ["Temp", `${latest.temperatureC} °C`],
    latest.heartRate != null        && ["Heart rate", `${latest.heartRate} bpm`],
    latest.respiratoryRate != null  && ["Breathing", `${latest.respiratoryRate}/min`],
    latest.systolicBP != null       && ["BP", `${latest.systolicBP}${latest.diastolicBP != null ? `/${latest.diastolicBP}` : ""}`],
    latest.oxygenSaturation != null && ["SpO₂", `${latest.oxygenSaturation}%`],
  ].filter(Boolean);

  return (
    <Card
      title="Monitoring"
      icon={<FiActivity />}
      actions={status && <AlertLevelBadge level={status.alertLevel} />}
    >
      {status?.alertLevel && status.alertLevel !== "NORMAL" && (
        <p className={`${styles.monitorAlert} ${styles[`monitorAlert_${status.alertLevel}`]}`}>
          {status.alerts[0]?.message}
        </p>
      )}

      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>Today's check-in</span>
        {checkedInToday
          ? <span className={styles.checkDone}><FiCheckCircle size={13} /> Done</span>
          : <Badge tone="neutral">Not done</Badge>}
      </div>

      {latestValues?.length > 0 ? (
        <>
          <div className={styles.vitalsMini}>
            {latestValues.map(([label, value]) => (
              <div key={label} className={styles.vitalMini}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className={styles.cardMeta}>Latest vitals: {formatDateTime(latest.recordedAt)}</p>
        </>
      ) : (
        <p className={styles.featureDesc}>No vital signs recorded yet.</p>
      )}

      <Link to={`/patients/${patientId}/monitoring`} className={styles.featureLink}>
        {checkedInToday ? "Open monitoring" : "Do today's check-in"} <FiArrowRight size={14} />
      </Link>
    </Card>
  );
}
