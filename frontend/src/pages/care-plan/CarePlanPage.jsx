import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClipboard, FiHeart } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import * as patientApi from "../../api/patientApi";
import * as careWorkspaceApi from "../../api/careWorkspaceApi";
import styles from "./CarePlanPage.module.css";

export default function CarePlanPage() {
  const { id: patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [workspace, setWorkspace] = useState({ plans: [], flags: [] });
  const [request, setRequest] = useState("");
  const [completed, setCompleted] = useState("");
  const [missed, setMissed] = useState("");
  const [obstacles, setObstacles] = useState("");
  const [feeling, setFeeling] = useState("");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [flagOutcomes, setFlagOutcomes] = useState({});

  async function load() {
    const [patientRes, workspaceRes] = await Promise.all([patientApi.getPatient(patientId), careWorkspaceApi.getWorkspace(patientId)]);
    setPatient(patientRes.data.patient);
    setWorkspace(workspaceRes.data);
    setConversationId(workspaceRes.data.planConversation?.id || null);
    setConversationMessages((workspaceRes.data.planConversation?.messages || []).map((message) => ({ role: message.role, content: message.content })));
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([patientApi.getPatient(patientId), careWorkspaceApi.getWorkspace(patientId)])
      .then(([patientRes, workspaceRes]) => {
        if (cancelled) return;
        setPatient(patientRes.data.patient);
        setWorkspace(workspaceRes.data);
        setConversationId(workspaceRes.data.planConversation?.id || null);
        setConversationMessages((workspaceRes.data.planConversation?.messages || []).map((message) => ({ role: message.role, content: message.content })));
      })
      .catch(() => { if (!cancelled) setError("Could not load care plan information."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  async function handleGenerate(event) {
    event.preventDefault();
    if (!request.trim() || working) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const { data } = await careWorkspaceApi.generateCarePlan(patientId, request.trim(), conversationId);
      setConversationId(data.plan ? null : data.conversationId);
      setConversationMessages((previous) => [...previous, { role: "CAREGIVER", content: request.trim() }, { role: "ASSISTANT", content: data.reply }]);
      setRequest("");
      await load();
      setNotice(data.plan ? "Your care plan has been saved. Earlier versions remain available below." : "The agent has a follow-up question so it can shape the plan around your situation.");
    } catch (err) { setError(err.response?.data?.error || "Could not create a care plan."); }
    finally { setWorking(false); }
  }

  async function handleCheckIn(event) {
    event.preventDefault();
    const current = workspace.plans.find((plan) => plan.isCurrent);
    if (!current || working) return;
    setWorking(true); setError(""); setNotice("");
    try {
      await careWorkspaceApi.recordCarePlanCheckIn(patientId, current.id, {
        completedTasks: completed.split("\n").map((item) => item.trim()).filter(Boolean),
        missedTasks: missed.split("\n").map((item) => item.trim()).filter(Boolean),
        obstacles,
        caregiverFeeling: feeling,
      });
      await load();
      setCompleted(""); setMissed(""); setObstacles(""); setFeeling(""); setShowCheckIn(false);
      setNotice("Check-in saved. This helps the next plan reflect what was manageable.");
    } catch (err) { setError(err.response?.data?.error || "Could not save your check-in."); }
    finally { setWorking(false); }
  }

  async function handleFlagUpdate(flag, status) {
    const outcome = flagOutcomes[flag.id] || "";
    if (["ANSWERED", "RESOLVED"].includes(status) && outcome.trim().length < 2) {
      setError("Add what the clinician said before marking this follow-up answered or resolved.");
      return;
    }
    setWorking(true); setError(""); setNotice("");
    try {
      await careWorkspaceApi.updateCareFlag(patientId, flag.id, { status, outcome: outcome.trim() || undefined });
      await load();
      setNotice("Clinician follow-up status saved.");
    } catch (err) { setError(err.response?.data?.error || "Could not update this follow-up."); }
    finally { setWorking(false); }
  }

  if (loading) return <AppLayout><div className={styles.center}><Spinner size="lg" /></div></AppLayout>;
  const currentPlan = workspace.plans.find((plan) => plan.isCurrent) || workspace.plans[0];

  return (
    <AppLayout>
      <header className={styles.header}>
        <Link to={`/patients/${patientId}`} className={styles.back}><FiArrowLeft /> Back to {patient?.fullName || "patient"}</Link>
        <div className={styles.titleRow}><div className={styles.icon}><FiClipboard size={24} /></div><div><p className={styles.eyebrow}>Caregiver support</p><h1>Care plan</h1><p>Build a practical plan around {patient?.fullName}'s needs and your available time.</p></div></div>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <section className={styles.panel}>
        <h2>{conversationId ? "Continue shaping the plan" : currentPlan ? "Update the plan" : "What would you like to work toward?"}</h2>
        <p>The agent uses the patient information, your previous check-ins, approved guides, and its care-planning skills. It can ask for more details before proposing steps.</p>
        <form onSubmit={handleGenerate}>
          {conversationMessages.length > 0 && <div className={styles.planConversation} aria-live="polite">{conversationMessages.map((message, index) => <p key={`${index}-${message.role}`} className={message.role === "CAREGIVER" ? styles.caregiverMessage : styles.agentMessage}><strong>{message.role === "CAREGIVER" ? "You" : "Care agent"}</strong>{message.content}</p>)}</div>}
          <textarea value={request} onChange={(event) => setRequest(event.target.value)} rows={4} maxLength={2000} placeholder={conversationId ? "Answer the agent's question…" : "For example: Help me plan Mama's daily care around my work schedule."} />
          <button disabled={!request.trim() || working}>{working ? "Working with the agent…" : conversationId ? "Reply" : currentPlan ? "Create a revised version" : "Create my care plan"}</button>
        </form>
      </section>

      {currentPlan && <PlanCard plan={currentPlan} onCheckIn={() => setShowCheckIn((value) => !value)} />}

      {showCheckIn && currentPlan && (
        <section className={styles.panel}>
          <h2>How has the plan been going?</h2>
          <p>A missed task is information, not a reason for blame. Share what worked and what got in the way.</p>
          <form onSubmit={handleCheckIn} className={styles.checkInForm}>
            <label>Tasks completed<textarea rows={3} value={completed} onChange={(event) => setCompleted(event.target.value)} placeholder="One task per line" /></label>
            <label>Tasks not completed<textarea rows={3} value={missed} onChange={(event) => setMissed(event.target.value)} placeholder="One task per line" /></label>
            <label>What got in the way?<textarea rows={3} value={obstacles} onChange={(event) => setObstacles(event.target.value)} /></label>
            <label>How are you feeling about caregiving?<input value={feeling} onChange={(event) => setFeeling(event.target.value)} /></label>
            <button disabled={working}>{working ? "Saving…" : "Save check-in"}</button>
          </form>
        </section>
      )}

      {workspace.plans.length > 1 && <section className={styles.history}><h2>Plan history</h2>{workspace.plans.filter((plan) => plan.id !== currentPlan?.id).map((plan) => <details key={plan.id}><summary><FiCalendar /> Version {plan.version}: {plan.title} <span>{new Date(plan.createdAt).toLocaleDateString()}</span></summary><PlanContent plan={plan} /></details>)}</section>}

      {workspace.flags?.length > 0 && <section className={styles.flags}><h2>Follow-ups for a clinician</h2><p>These are concerns recorded for medical review. They are flags, not diagnoses.</p>{workspace.flags.map((flag) => <article key={flag.id}><strong>{flag.title}</strong><span>{flag.status.replaceAll("_", " ")}</span><p>{flag.doctorAsk}</p>{flag.status !== "RESOLVED" && <div className={styles.flagActions}>{flag.status === "OPEN" && <button type="button" className={styles.secondary} disabled={working} onClick={() => handleFlagUpdate(flag, "WAITING_FOR_DOCTOR")}>Waiting for clinician</button>}<textarea rows={2} value={flagOutcomes[flag.id] || ""} onChange={(event) => setFlagOutcomes((old) => ({ ...old, [flag.id]: event.target.value }))} placeholder="Record the clinician's response" /><button type="button" className={styles.secondary} disabled={working} onClick={() => handleFlagUpdate(flag, "ANSWERED")}>Record response</button><button type="button" className={styles.secondary} disabled={working} onClick={() => handleFlagUpdate(flag, "RESOLVED")}>Mark resolved</button></div>}{flag.outcome && <p><strong>Recorded outcome:</strong> {flag.outcome}</p>}</article>)}</section>}
    </AppLayout>
  );
}

function PlanCard({ plan, onCheckIn }) {
  return <section className={styles.plan}>
    <div className={styles.planHeader}><div><p className={styles.eyebrow}>Current plan · Version {plan.version}</p><h2>{plan.title}</h2><p>{plan.planData.reply}</p></div><button type="button" className={styles.secondary} onClick={onCheckIn}><FiCheckCircle /> Check in</button></div>
    <PlanContent plan={plan} />
    {plan.planData.caregiverRest && <div className={styles.rest}><FiHeart /><span><strong>For you, too</strong>{plan.planData.caregiverRest}</span></div>}
    {plan.planData.forecast && <p className={styles.forecast}><strong>Plan forecast:</strong> {plan.planData.forecast}</p>}
    {plan.checkIns?.length > 0 && <p className={styles.lastCheckIn}>Latest check-in: {new Date(plan.checkIns[0].createdAt).toLocaleDateString()}</p>}
  </section>;
}

function PlanContent({ plan }) {
  const data = plan.planData || {};
  return <div className={styles.planContent}>
    <div className={styles.goal}><strong>What we are working toward</strong><p>{data.intendedAchievement || plan.issue}</p><strong>Approach</strong><p>{data.strategy}</p></div>
    <h3>Actions</h3>
    <ul>{(data.tasks || []).map((task, index) => <li key={`${task.title}-${index}`}><span className={`${styles.priority} ${styles[task.priority]}`}>{task.priority?.replaceAll("_", " ")}</span><span><strong>{task.title}</strong>{task.when && <small>{task.when}</small>}</span></li>)}</ul>
  </div>;
}
