import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { apiErrorMessage } from "../../api/errors.js";
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
  // loadError means there's no chat to show; sendError is shown above a chat that stays usable.
  const [loadError,  setLoadError]  = useState("");
  const [sendError,  setSendError]  = useState("");

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
            setLoadError("No active onboarding session found. Start one from the patient profile.");
            return;
          }
          sid = data.session.id;
        }
        if (cancelled) return;
        setSessionId(sid);
        await loadSession(sid);
      } catch {
        if (!cancelled) setLoadError("Could not load the onboarding session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Returns false on failure so ChatWindow can put the answer back in the box.
  async function handleSend(answerText) {
    if (!sessionId) return false;

    // Optimistic caregiver bubble so the UI feels instant
    const tempMessageId = nextTempId();
    setMessages((prev) => [...prev, { id: tempMessageId, role: "CAREGIVER", content: answerText, createdAt: new Date().toISOString() }]);
    setIsTyping(true);
    setSendError("");

    try {
      const { data } = await discoveryApi.submitOnboardingAnswer(sessionId, answerText);

      if (data.status === "COMPLETED") {
        setIsComplete(true);
        setIsTyping(false);
        // Allow the completion note to be visible briefly before redirecting
        setTimeout(() => navigate(`/patients/${patientId}`), 1500);
        return true;
      }

      setMessages((prev) => [...prev, data.message]);
      return true;
    } catch (err) {
      // The answer wasn't saved: remove its bubble and let the caregiver retry.
      setMessages((prev) => prev.filter((m) => m.id !== tempMessageId));
      setSendError(apiErrorMessage(err, "Your answer wasn't sent. Please try again."));
      return false;
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
      <PageHeader
        back={{ to: `/patients/${patientId}`, label: "Back to patient" }}
        title="Onboarding assessment"
        subtitle="Answer each question as accurately as you can. The AI will guide you through all screening areas. Your progress is saved after every answer."
      />

      {(loadError || sendError) && (
        <div className={styles.errorBox} role="alert">
          <FiAlertTriangle size={17} />
          <span>{loadError || sendError}</span>
        </div>
      )}

      {loadError && <Button to={`/patients/${patientId}`} variant="secondary">Back to patient</Button>}

      {/* Chat window */}
      {!loadError && (
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
