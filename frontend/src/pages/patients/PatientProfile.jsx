import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiEdit2, FiPlay, FiArrowRight, FiAlertTriangle, FiCheck, FiClipboard,
  FiMessageSquare, FiBookOpen, FiHelpCircle, FiMapPin, FiPrinter,
} from "react-icons/fi";
import { RiFirstAidKitLine, RiQuestionAnswerLine } from "react-icons/ri";
import AppLayout from "../../components/common/AppLayout.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import RiskBadge from "../../components/patients/RiskBadge.jsx";
import ConversationHistory from "../../components/discovery/ConversationHistory.jsx";
import * as patientApi      from "../../api/patientApi";
import * as discoveryApi    from "../../api/discoveryApi";
import * as riskApi         from "../../api/riskApi";
import * as safetyQueryApi  from "../../api/safetyQueryApi";
import * as microlearningApi from "../../api/microlearningApi";
import * as careWorkspaceApi from "../../api/careWorkspaceApi";
import styles from "./PatientProfile.module.css";

const RISK_ROWS = [
  { key: "infection_risk",       label: "Infection" },
  { key: "pressure_injury_risk", label: "Pressure injury" },
  { key: "environmental_risk",   label: "Environmental" },
  { key: "caregiver_burden",     label: "Caregiver burden" },
];

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";
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
  const [workspace,       setWorkspace]       = useState({ plans: [], flags: [] });
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [starting,        setStarting]        = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [patientRes, sesRes, sessionsListRes, sqRes, mlRes, workspaceRes] = await Promise.all([
          patientApi.getPatient(id),
          discoveryApi.getActiveOnboardingSession(id),
          discoveryApi.listOnboardingSessions(id),
          safetyQueryApi.listQueries(id),
          microlearningApi.listMaterials(id),
          careWorkspaceApi.getWorkspace(id),
        ]);
        if (cancelled) return;
        setPatient(patientRes.data.patient);
        setActiveSession(sesRes.data.session);
        setSessions(sessionsListRes.data.sessions);
        setSafetyQueries(sqRes.data.queries);
        setMaterials(mlRes.data.materials);
        setWorkspace(workspaceRes.data);

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
      if (data.status === "COMPLETED") {
        const riskRes = await riskApi.getLatestRiskProfile(id);
        setRiskProfile(riskRes.data.riskProfile);
        setSessions((previous) => [data.session, ...previous]);
        setStarting(false);
        return;
      }
      navigate(`/patients/${id}/onboarding`, { state: { sessionId: data.session.id } });
    } catch (err) {
      setError(err.response?.data?.error || "Could not start onboarding.");
      setStarting(false);
    }
  }

  function continueOnboarding() {
    navigate(`/patients/${id}/onboarding`, { state: { sessionId: activeSession.id } });
  }

  if (loading) {
    return (
      <AppLayout title={patient?.fullName || "Patient"}>
        <div className={styles.loadingCenter}><HeartbeatLoader label="Loading patient…" /></div>
      </AppLayout>
    );
  }

  if (error && !patient) {
    return (
      <AppLayout title={patient?.fullName || "Patient"}>
        <div className={styles.errorBox} role="alert">
          <FiAlertTriangle size={20} />
          {error}
        </div>
        <Link to="/patients" className={styles.backLink}>Back to patients</Link>
      </AppLayout>
    );
  }

  if (!patient) return null;

  const riskData = riskProfile?.riskData;
  const sepsis = riskData?.sepsis_risk || null;
  const hasCompletedOnboarding = sessions.some((session) => session.status === "COMPLETED") && Boolean(riskProfile);
  const hasRedFlag = safetyQueries.some((q) => q.status === "RED_FLAG_TRIGGERED");
  const assignedCount = materials.filter((m) => m.isAssigned).length;

  // Care journey: onboarding → risk assessment → ongoing care.
  const steps = [
    {
      label: "Onboarding",
      detail: activeSession ? "In progress" : hasCompletedOnboarding || riskProfile ? "Completed" : "Not started",
      done: Boolean(riskProfile) && !activeSession,
      current: !riskProfile || Boolean(activeSession),
    },
    {
      label: "Risk assessment",
      detail: riskProfile ? `Assessed ${formatDate(riskProfile.createdAt)}` : "After onboarding",
      done: Boolean(riskProfile),
      current: false,
    },
    {
      label: "Ongoing care",
      detail: hasCompletedOnboarding ? "Safety chat & care guides" : "Unlocks after assessment",
      done: false,
      current: hasCompletedOnboarding && !activeSession,
    },
  ];

  // The single most useful thing to do next.
  let nextStep;
  if (activeSession) {
    nextStep = { label: "Continue onboarding", icon: <FiArrowRight size={15} />, onClick: continueOnboarding };
  } else if (!riskProfile) {
    nextStep = { label: starting ? "Starting…" : "Start onboarding", icon: <FiPlay size={14} />, onClick: handleStartOnboarding };
  } else {
    nextStep = { label: "Ask a safety question", icon: <FiHelpCircle size={15} />, onClick: () => navigate(`/patients/${id}/safety-query`) };
  }

  return (
    <AppLayout title={patient?.fullName || "Patient"}>
      <Link to="/patients" className={styles.backLink}>← All patients</Link>

      {/* Only appears on paper (see @media print) */}
      <p className={styles.printHeader}>
        SepsisGuard patient summary · Printed {new Date().toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
      </p>

      {/* ── Header ──────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Avatar name={patient.fullName} size="lg" />
          <div className={styles.headerText}>
            <h1 className={styles.patientName}>{patient.fullName}</h1>
            <p className={styles.patientMeta}>
              {patient.age} yrs &middot; {patient.gender} &middot; {patient.relationshipToCaregiver}
              {patient.location && <> &middot; <FiMapPin size={12} aria-hidden="true" /> {patient.location}</>}
            </p>
            <div className={styles.headerBadges}>
              <RiskBadge level={sepsis} prefix="Sepsis risk" />
              {hasRedFlag && (
                <span className={styles.redFlagNote}><FiAlertTriangle size={12} aria-hidden="true" /> Red flag on record</span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={<FiPrinter size={14} />}
            onClick={() => window.print()}
            title={riskData ? "Print a summary for clinic visits" : "Print patient details"}
          >
            Print
          </Button>
          <Button to={`/patients/${id}/edit`} variant="secondary" icon={<FiEdit2 size={14} />}>Edit</Button>
          <Button icon={nextStep.icon} onClick={nextStep.onClick} disabled={starting}>{nextStep.label}</Button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBox} role="alert">
          <FiAlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Referral is the most urgent thing on the page, so it goes first. */}
      {riskData?.referral_recommended && (
        <div className={styles.referralBox} role="alert">
          <FiAlertTriangle size={20} className={styles.referralIcon} aria-hidden="true" />
          <div>
            <strong>Referral recommended</strong>
            <p>{riskData.referral_reason}</p>
          </div>
        </div>
      )}

      {/* ── Care journey ────────────────────────────────────── */}
      <ol className={styles.journey} aria-label="Care journey">
        {steps.map((step, i) => (
          <li
            key={step.label}
            className={`${styles.step} ${step.done ? styles.stepDone : ""} ${step.current ? styles.stepCurrent : ""}`}
            aria-current={step.current ? "step" : undefined}
          >
            <span className={styles.stepMarker} aria-hidden="true">
              {step.done ? <FiCheck size={14} /> : i + 1}
            </span>
            <span className={styles.stepText}>
              <span className={styles.stepLabel}>{step.label}</span>
              <span className={styles.stepDetail}>{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.grid}>
        {/* ── Main column ───────────────────────────────────── */}
        <div className={styles.mainCol}>
          <Card title="Risk assessment" icon={<RiFirstAidKitLine />}>
            {riskData ? (
              <>
                <div className={styles.sepsisHero}>
                  <span className={styles.sepsisLabel}>Sepsis risk</span>
                  <RiskBadge level={sepsis} />
                </div>
                <div className={styles.riskGrid}>
                  {RISK_ROWS.map(({ key, label }) => (
                    <div key={key} className={styles.riskRow}>
                      <span className={styles.riskLabel}>{label}</span>
                      <RiskBadge level={riskData[key]} />
                    </div>
                  ))}
                </div>

                {riskData.known_conditions?.length > 0 && (
                  <p className={styles.conditionLine}>
                    <strong>Known conditions:</strong> {riskData.known_conditions.join(", ")}
                  </p>
                )}
                {riskData.possible_hidden_conditions?.length > 0 && (
                  <p className={styles.conditionLine}>
                    <strong>Possible conditions:</strong> {riskData.possible_hidden_conditions.join(", ")}
                  </p>
                )}

                {riskData.summary && <p className={styles.summary}>{riskData.summary}</p>}
                <p className={styles.disclaimer}>
                  Screening aid only, not a clinical diagnosis. Consult a clinician for evaluation.
                </p>
              </>
            ) : (
              <div className={styles.placeholder}>
                <p>
                  {activeSession
                    ? "Finish the onboarding conversation to generate this patient's risk assessment."
                    : "Start onboarding: a short guided conversation that produces a personalised sepsis risk assessment."}
                </p>
                <Button
                  icon={activeSession ? <FiArrowRight size={15} /> : <FiPlay size={14} />}
                  onClick={activeSession ? continueOnboarding : handleStartOnboarding}
                  disabled={starting}
                >
                  {activeSession ? "Continue onboarding" : starting ? "Starting…" : "Start onboarding"}
                </Button>
              </div>
            )}
          </Card>

          <Card
            title="Onboarding conversations"
            icon={<FiMessageSquare />}
            actions={riskProfile && !activeSession && (
              <Button variant="secondary" icon={<FiPlay size={13} />} onClick={handleStartOnboarding} disabled={starting}>
                {starting ? "Starting…" : "New assessment"}
              </Button>
            )}
          >
            <ConversationHistory sessions={sessions} />
          </Card>
        </div>

        {/* ── Side column ───────────────────────────────────── */}
        <div className={styles.sideCol}>
          <Card title="Safety questions" icon={<RiQuestionAnswerLine />}>
            <p className={styles.featureDesc}>
              {hasCompletedOnboarding
                ? `Ask the AI about safe care for ${patient.fullName}. It will alert you if it detects a red flag.`
                : "Available once onboarding and the risk assessment are complete."}
            </p>
            {safetyQueries.length > 0 && (
              <p className={styles.featureMeta}>
                {safetyQueries.length} past {safetyQueries.length === 1 ? "question" : "questions"}
              </p>
            )}
            <Button
              variant={hasCompletedOnboarding ? "primary" : "secondary"}
              icon={<FiHelpCircle size={15} />}
              disabled={!hasCompletedOnboarding}
              onClick={() => navigate(`/patients/${id}/safety-query`)}
              fullWidth
            >
              {safetyQueries.length > 0 ? "Open safety chat" : "Start asking"}
            </Button>
          </Card>

          <Card title="Care guides" icon={<FiBookOpen />}>
            <p className={styles.featureDesc}>
              Patient-specific guides on wound care, infection prevention, nutrition and more, available as PDFs or printable picture cards.
            </p>
            {materials.length > 0 && (
              <p className={styles.featureMeta}>
                {assignedCount} in care plan &middot; {materials.length} total
              </p>
            )}
            <Button
              variant="secondary"
              icon={<FiBookOpen size={15} />}
              onClick={() => navigate(`/patients/${id}/microlearning`)}
              fullWidth
            >
              {materials.length > 0 ? "View guides" : "Explore guides"}
            </Button>
          </Card>

          <Card title="Caregiver implementation plan" icon={<FiClipboard />}>
            <p className={styles.featureDesc}>Create and revise a practical plan based on the patient's needs, your availability, check-ins, and approved guides.</p>
            <p className={styles.featureMeta}>{workspace.plans?.length ? `Current plan: ${workspace.plans.find((plan) => plan.isCurrent)?.title || workspace.plans[0].title} · ${workspace.plans.length} saved version${workspace.plans.length === 1 ? "" : "s"}` : "No plan created yet"}</p>
            <Button variant="secondary" icon={<FiClipboard size={15} />} onClick={() => navigate(`/patients/${id}/care-plan`)} fullWidth>
              {workspace.plans?.length ? "Open care plan" : "Create care plan"}
            </Button>
          </Card>

            {workspace.flags?.length > 0 && <Card title="Clinical follow-ups" icon={<FiAlertTriangle />}>
            <p className={styles.featureDesc}>Recorded concerns for clinician review. These flags are not diagnoses.</p>
            {workspace.flags.slice(0, 5).map((flag) => <div key={flag.id}><p className={styles.featureMeta}>{flag.title} · {flag.status.replaceAll("_", " ")}</p><p className={styles.featureDesc}>{flag.doctorAsk}</p></div>)}
            <Link to={`/patients/${id}/care-plan`} className={styles.featureMeta}>Review follow-ups</Link>
          </Card>}
        </div>
      </div>
    </AppLayout>
  );
}
