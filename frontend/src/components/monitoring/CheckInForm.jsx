import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import Button from "../common/Button.jsx";
import AlertGuidance from "./AlertGuidance.jsx";
import { CHECK_IN_QUESTIONS } from "./vitals.js";
import * as monitoringApi from "../../api/monitoringApi";
import styles from "./MonitoringForms.module.css";

const EMPTY = Object.fromEntries(CHECK_IN_QUESTIONS.map((q) => [q.key, null]));

export default function CheckInForm({ patientId, onSaved }) {
  const [answers, setAnswers] = useState(EMPTY);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const unanswered = CHECK_IN_QUESTIONS.filter((q) => answers[q.key] === null).length;

  function answer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (unanswered > 0) {
      setError(`Answer all questions (${unanswered} left).`);
      return;
    }
    setError("");
    setResult(null);
    setSaving(true);
    try {
      const payload = { ...answers };
      if (notes.trim()) payload.notes = notes.trim();
      const { data } = await monitoringApi.createCheckIn(patientId, payload);
      setResult(data.checkIn);
      setAnswers(EMPTY);
      setNotes("");
      onSaved(data.checkIn);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save the check-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className={styles.hint}>Since the last check-in, has the patient had any of these?</p>

      <ul className={styles.questions}>
        {CHECK_IN_QUESTIONS.map((q) => (
          <li key={q.key} className={styles.question}>
            <span className={styles.questionText}>
              {q.label}
              {q.urgent && <span className={styles.redFlag}>Red flag</span>}
            </span>
            <span className={styles.yesNo} role="group" aria-label={q.label}>
              <button
                type="button"
                className={`${styles.choice} ${answers[q.key] === true ? styles.choiceYes : ""}`}
                aria-pressed={answers[q.key] === true}
                onClick={() => answer(q.key, true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`${styles.choice} ${answers[q.key] === false ? styles.choiceNo : ""}`}
                aria-pressed={answers[q.key] === false}
                onClick={() => answer(q.key, false)}
              >
                No
              </button>
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={styles.allNo}
        onClick={() => setAnswers(Object.fromEntries(CHECK_IN_QUESTIONS.map((q) => [q.key, false])))}
      >
        None of these — mark all “No”
      </button>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Notes (optional)</span>
        <textarea
          rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000}
          placeholder="Anything else you noticed today" className={styles.input}
        />
      </label>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <Button type="submit" disabled={saving} icon={<FiCheck size={15} />} fullWidth>
        {saving ? "Saving…" : "Submit check-in"}
      </Button>

      {result && (
        <div className={styles.result}>
          <AlertGuidance level={result.alertLevel} alerts={result.alerts} />
        </div>
      )}
    </form>
  );
}
