import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import ChatWindow from "../../components/discovery/ChatWindow.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import Button from "../../components/common/Button.jsx";
import * as discoveryApi from "../../api/discoveryApi";
import styles from "./DiscoverySession.module.css";

export default function DiscoverySession() {
  const { id: patientId } = useParams();
  const location  = useLocation();
  const navigate  = useNavigate();

  // useRef so the counter survives re-renders but resets on true unmount,
  // preventing duplicate key bugs from module-level mutable state.
  const tempId = useRef(0);
  function nextTempId() {
    tempId.current += 1;
    return `temp-${tempId.current}`;
  }

  const [sessionId,  setSessionId]  = useState(location.state?.sessionId || null);
  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [isTyping,   setIsTyping]   = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error,      setError]      = useState("");

  const loadSession = useCallback(async (id) => {
    const { data } = await discoveryApi.getOnboardingSession(id);
    setMessages(data.session.messages);
    setIsComplete(data.session.status === "COMPLETED");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        let sid = sessionId;
        if (!sid) {
          const { data } = await discoveryApi.getActiveOnboardingSession(patientId);
          if (!data.session) {
            setError("No active onboarding session found. Start one from the patient profile.");
            return;
          }
          sid = data.session.id;
        }
        if (cancelled) return;
        setSessionId(sid);
        await loadSession(sid);
      } catch {
        if (!cancelled) setError("Could not load the onboarding session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleSend(answerText) {
    if (!sessionId) return;

    // Optimistic caregiver bubble so the UI feels instant
    setMessages((prev) => [...prev, { id: nextTempId(), role: "CAREGIVER", content: answerText }]);
    setIsTyping(true);
    setError("");

    try {
      const { data } = await discoveryApi.submitOnboardingAnswer(sessionId, answerText);

      if (data.status === "COMPLETED") {
        setIsComplete(true);
        setIsTyping(false);
        // Allow the completion note to be visible briefly before redirecting
        setTimeout(() => navigate(`/patients/${patientId}`), 1500);
        return;
      }

      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setIsTyping(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Onboarding">
        <div className={styles.center}><HeartbeatLoader label="Loading conversation…" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Onboarding">
      {/* Page header with back navigation */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate(`/patients/${patientId}`)}>
          <FiArrowLeft size={16} />
          Back to patient
        </button>
        <h1 className={styles.heading}>Onboarding Assessment</h1>
        <p className={styles.subtitle}>
          Answer each question as accurately as you can. The AI will guide you through all screening areas.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className={styles.errorBox}>
          <FiAlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}

      {/* Chat window */}
      {!error && (
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          isTyping={isTyping}
          isComplete={isComplete}
        />
      )}

      {/* Completion banner */}
      {isComplete && (
        <div className={styles.completeBanner}>
          <FiCheckCircle size={20} className={styles.completeIcon} />
          <div>
            <strong>Assessment complete!</strong>
            <p>Generating your risk profile and redirecting…</p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
