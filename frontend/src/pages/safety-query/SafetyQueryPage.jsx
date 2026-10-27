import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiRobot2Line, RiAddLine } from "react-icons/ri";
import { FiUser, FiExternalLink, FiClock, FiSend } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import ChatComposer, { JumpToLatest } from "../../components/chat/ChatComposer.jsx";
import { formatMessageTime } from "../../components/discovery/MessageBubble.jsx";
import ReferralAlert from "../../components/safety-query/ReferralAlert.jsx";
import useChatScroll from "../../hooks/useChatScroll.js";
import { apiErrorMessage } from "../../api/errors.js";
import * as safetyQueryApi from "../../api/safetyQueryApi";
import * as patientApi from "../../api/patientApi";
import * as discoveryApi from "../../api/discoveryApi";
import * as riskApi from "../../api/riskApi";
import styles from "./SafetyQueryPage.module.css";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function SafetyQueryPage() {
  const { id: patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient]               = useState(null);
  const [queries, setQueries]               = useState([]);
  const [activeQuery, setActiveQuery]       = useState(null);
  const [draft, setDraft]                   = useState("");
  const [loading, setLoading]               = useState(true);
  const [sending, setSending]               = useState(false);
  const [isTyping, setIsTyping]             = useState(false);
  const [error, setError]                   = useState("");
  const [redFlag, setRedFlag]               = useState(null); // { referralReason }
  const [startingNew, setStartingNew]       = useState(false);
  const [newQuestion, setNewQuestion]       = useState("");
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [activeOnboardingSession, setActiveOnboardingSession] = useState(null);

  const inputRef   = useRef(null);
  const { scrollRef, showJump, jumpToLatest } = useChatScroll([activeQuery?.id, activeQuery?.messages, isTyping]);

  // Load patient + query history
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [patRes, onboardingRes] = await Promise.all([
          patientApi.getPatient(patientId),
          discoveryApi.listOnboardingSessions(patientId),
        ]);
        if (cancelled) return;
        setPatient(patRes.data.patient);
        const onboardingSessions = onboardingRes.data.sessions;
        const completedSession = onboardingSessions.some((session) => session.status === "COMPLETED");
        let hasRiskProfile = false;
        try {
          await riskApi.getLatestRiskProfile(patientId);
          hasRiskProfile = true;
        } catch { /* no risk profile until onboarding completes */ }
        const onboardingReady = completedSession && hasRiskProfile;
        setHasCompletedOnboarding(onboardingReady);
        setActiveOnboardingSession(onboardingSessions.find((session) => session.status === "IN_PROGRESS") || null);

        if (!onboardingReady) {
          setQueries([]);
          return;
        }

        const queryRes = await safetyQueryApi.listQueries(patientId);
        if (cancelled) return;
        setQueries(queryRes.data.queries);
        // Open the most recent OPEN query automatically
        const openQuery = queryRes.data.queries.find(
          (q) => q.status === "OPEN" || q.status === "RED_FLAG_TRIGGERED"
        );
        if (openQuery) {
          setActiveQuery(openQuery);
          if (openQuery.status === "RED_FLAG_TRIGGERED") {
            // findLast is ES2023 — use filter+pop for broader compatibility
            const redFlagMsgs = openQuery.messages.filter(
              (m) => m.role === "ASSISTANT" && m.metadata?.isRedFlag
            );
            const lastMsg = redFlagMsgs[redFlagMsgs.length - 1];
            if (lastMsg) setRedFlag({ referralReason: lastMsg.metadata.referralReason });
          }
        }
      } catch {
        if (!cancelled) setError("Could not load patient data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [patientId]);

  async function handleStartNew(e) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setSending(true);
    setError("");
    try {
      const { data } = await safetyQueryApi.startQuery(patientId, newQuestion.trim());
      setActiveQuery(data.query);
      setQueries((prev) => [data.query, ...prev]);
      setNewQuestion("");
      setStartingNew(false);
      if (data.isRedFlag) setRedFlag({ referralReason: data.referralReason });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not start query."));
    } finally {
      setSending(false);
    }
  }

  async function handleSend(text) {
    if (!text || !activeQuery || sending) return;
    setDraft("");
    setIsTyping(true);
    setError("");
    jumpToLatest("auto");

    // Optimistic CHW message
    const tempMessageId = `tmp-${Date.now()}`;
    setActiveQuery((prev) => ({
      ...prev,
      messages: [...prev.messages, { id: tempMessageId, role: "CHW", content: text, createdAt: new Date().toISOString() }],
    }));

    try {
      const { data } = await safetyQueryApi.sendMessage(activeQuery.id, text);
      setActiveQuery((prev) => ({
        ...prev,
        messages: [...prev.messages, data.message],
        status: data.isRedFlag ? "RED_FLAG_TRIGGERED" : prev.status,
      }));
      if (data.isRedFlag) setRedFlag({ referralReason: data.referralReason });
    } catch (err) {
      // Not saved: remove the optimistic bubble and give the text back to retry.
      setActiveQuery((prev) => ({ ...prev, messages: prev.messages.filter((m) => m.id !== tempMessageId) }));
      setDraft((current) => current || text);
      setError(apiErrorMessage(err, "Your message wasn't sent. Please try again."));
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }

  function handleSelectQuery(q) {
    setActiveQuery(q);
    setRedFlag(null);
    if (q.status === "RED_FLAG_TRIGGERED") {
      const redFlagMsgs = q.messages.filter(
        (m) => m.role === "ASSISTANT" && m.metadata?.isRedFlag
      );
      const lastMsg = redFlagMsgs[redFlagMsgs.length - 1];
      if (lastMsg) setRedFlag({ referralReason: lastMsg.metadata.referralReason });
    }
  }

  function navigateToMaterial(materialId) {
    navigate(`/patients/${patientId}/microlearning?highlight=${materialId}`);
  }

  function continueOnboarding() {
    if (activeOnboardingSession) {
      navigate(`/patients/${patientId}/onboarding`, { state: { sessionId: activeOnboardingSession.id } });
    } else {
      navigate(`/patients/${patientId}`);
    }
  }

  if (loading) return <AppLayout title={patient ? `Safety questions · ${patient.fullName}` : "Safety questions"}><div className={styles.center}><HeartbeatLoader label="Loading safety chat…" /></div></AppLayout>;

  const isBlocked = activeQuery?.status === "RED_FLAG_TRIGGERED" || activeQuery?.status === "CLOSED" || isTyping || sending;

  return (
    <AppLayout title={patient ? `Safety questions · ${patient.fullName}` : "Safety questions"}>
      {/* Red flag full-screen interrupt */}
      {redFlag && (
        <ReferralAlert
          patientName={patient?.fullName}
          referralReason={redFlag.referralReason}
          onBack={() => navigate(`/patients/${patientId}`)}
        />
      )}

      <PageHeader
        back={{ to: `/patients/${patientId}`, label: `Back to ${patient?.fullName || "patient"}` }}
        title="Safety questions"
        subtitle={hasCompletedOnboarding
          ? <>Ask any question about safe care for <strong>{patient?.fullName}</strong>. The AI uses their completed risk assessment.</>
          : <>Complete onboarding and the risk assessment for <strong>{patient?.fullName}</strong> first.</>}
      />

      {error && <div className={styles.errorBox} role="alert">{error}</div>}

      {!hasCompletedOnboarding ? (
        <div className={styles.emptyChat}>
          <RiRobot2Line size={48} className={styles.emptyChatIcon} />
          <h2>Onboarding required</h2>
          <p>Complete onboarding and the risk assessment for {patient?.fullName} before asking safety questions.</p>
          <Button icon={<RiAddLine size={16} />} onClick={continueOnboarding}>
            {activeOnboardingSession ? "Continue onboarding" : "Go to patient profile"}
          </Button>
        </div>
      ) : (

      <div className={styles.layout}>
        {/* ── Left panel: session history ──────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Past queries</span>
            <button
              className={styles.newBtn}
              onClick={() => { setStartingNew(true); setActiveQuery(null); }}
            >
              <RiAddLine size={16} /> New
            </button>
          </div>

          {queries.length === 0 && !startingNew && (
            <p className={styles.emptyHistory}>No queries yet. Start your first one.</p>
          )}

          <div className={styles.queryList}>
            {queries.map((q) => (
              <button
                key={q.id}
                className={`${styles.queryItem} ${activeQuery?.id === q.id ? styles.queryItemActive : ""} ${q.status === "RED_FLAG_TRIGGERED" ? styles.queryItemRedFlag : ""}`}
                onClick={() => handleSelectQuery(q)}
              >
                <span className={styles.queryTitle}>{q.title}</span>
                <span className={styles.queryMeta}>
                  <FiClock size={11} /> {formatDate(q.createdAt)}
                </span>
                {q.status === "RED_FLAG_TRIGGERED" && (
                  <span className={styles.redFlagBadge}>⚠ Red Flag</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Right panel: chat or new query form ─────────────── */}
        <section className={styles.chatPanel}>

          {/* Start new query form */}
          {startingNew && (
            <div className={styles.newQueryForm}>
              <h3>Ask a new question</h3>
              <p className={styles.newQueryHint}>
                Type your question about {patient?.fullName}'s care. Be as specific as possible.
              </p>
              <form onSubmit={handleStartNew}>
                <textarea
                  className={styles.newQueryTextarea}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. Is it safe to apply honey on the wound? The caregiver wants to use local herbs…"
                  rows={4}
                  aria-label="Your question"
                  autoFocus
                />
                <div className={styles.newQueryActions}>
                  <Button variant="secondary" onClick={() => setStartingNew(false)}>Cancel</Button>
                  <Button type="submit" icon={<FiSend size={15} />} disabled={!newQuestion.trim() || sending}>
                    {sending ? "Sending…" : "Ask question"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* No active session and not starting new */}
          {!startingNew && !activeQuery && (
            <div className={styles.emptyChat}>
              <RiRobot2Line size={48} className={styles.emptyChatIcon} />
              <p>{queries.length ? "Select a past question or ask a new one." : "No questions yet."}</p>
              <Button icon={<RiAddLine size={16} />} onClick={() => setStartingNew(true)}>
                {queries.length ? "Ask a new question" : "Ask your first question"}
              </Button>
            </div>
          )}

          {/* Active chat session */}
          {activeQuery && !startingNew && (
            <>
              <div className={styles.messagesWrap}>
              <div className={styles.messages} ref={scrollRef} role="log" aria-live="polite" aria-label="Safety conversation">
                {activeQuery.messages.map((msg) => {
                  const isAssistant = msg.role === "ASSISTANT";
                  const meta = msg.metadata || {};
                  const time = formatMessageTime(msg.createdAt);
                  return (
                    <div
                      key={msg.id}
                      className={`${styles.msgRow} ${isAssistant ? styles.msgLeft : styles.msgRight}`}
                    >
                      {isAssistant && (
                        <div className={styles.avatar}>
                          <RiRobot2Line size={15} />
                        </div>
                      )}
                      <div className={`${styles.bubbleStack} ${isAssistant ? styles.stackLeft : styles.stackRight}`}>
                      <span className="sr-only">{isAssistant ? "Assistant said:" : "You said:"}</span>
                      <div className={`${styles.bubble} ${isAssistant ? styles.bubbleAI : styles.bubbleCHW} ${meta.isRedFlag ? styles.bubbleRedFlag : ""}`}>
                        <p className={styles.bubbleText}>{msg.content}</p>

                        {/* Linked microlearning materials */}
                        {isAssistant && meta.linkedMaterialTitles?.length > 0 && (
                          <div className={styles.linkedMaterials}>
                            <p className={styles.linkedLabel}>📚 Reference guides:</p>
                            {meta.linkedMaterialTitles.map((title, i) => (
                              <button
                                key={i}
                                className={styles.linkedItem}
                                onClick={() => navigateToMaterial(meta.linkedMaterialIds[i])}
                              >
                                <FiExternalLink size={12} /> {title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {time && <time className={styles.msgTime} dateTime={msg.createdAt}>{time}</time>}
                      </div>
                      {!isAssistant && (
                        <div className={`${styles.avatar} ${styles.avatarCHW}`}>
                          <FiUser size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className={`${styles.msgRow} ${styles.msgLeft}`}>
                    <div className={styles.avatar}><RiRobot2Line size={15} /></div>
                    <div className={`${styles.bubble} ${styles.bubbleAI}`}>
                      <span className={styles.typing}>
                        <span /><span /><span />
                      </span>
                    </div>
                  </div>
                )}

                {activeQuery.status === "RED_FLAG_TRIGGERED" && (
                  <div className={styles.redFlagBanner}>
                    ⚠ This session has a red flag. Take action before continuing.
                  </div>
                )}
                {activeQuery.status === "CLOSED" && (
                  <div className={styles.closedBanner}>
                    This query session is closed.
                  </div>
                )}
              </div>
              {showJump && <JumpToLatest onClick={jumpToLatest} />}
              </div>

              <ChatComposer
                inputRef={inputRef}
                value={draft}
                onChange={setDraft}
                onSubmit={handleSend}
                disabled={isBlocked}
                label="Your follow-up question"
                placeholder={
                  activeQuery.status === "RED_FLAG_TRIGGERED"
                    ? "⚠ Red flag active: act on the referral first"
                    : activeQuery.status === "CLOSED"
                    ? "This session is closed"
                    : isTyping
                    ? "Please wait…"
                    : "Ask a follow-up question… (Enter to send)"
                }
              />
            </>
          )}
        </section>
      </div>
      )}
    </AppLayout>
  );
}
