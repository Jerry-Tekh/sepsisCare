import { useState } from "react";
import { FiSave } from "react-icons/fi";
import Button from "../common/Button.jsx";
import AlertGuidance from "./AlertGuidance.jsx";
import { VITALS } from "./vitals.js";
import * as monitoringApi from "../../api/monitoringApi";
import styles from "./MonitoringForms.module.css";

// datetime-local wants local time without seconds or zone.
function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const EMPTY = { temperatureC: "", heartRate: "", respiratoryRate: "", systolicBP: "", diastolicBP: "", oxygenSaturation: "", notes: "" };

export default function VitalsForm({ patientId, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [recordedAt, setRecordedAt] = useState(nowLocal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    const payload = { recordedAt: new Date(recordedAt).toISOString() };
    for (const key of ["temperatureC", "heartRate", "respiratoryRate", "systolicBP", "diastolicBP", "oxygenSaturation"]) {
      if (form[key] !== "") payload[key] = key === "temperatureC" ? parseFloat(form[key]) : parseInt(form[key], 10);
    }
    if (form.notes.trim()) payload.notes = form.notes.trim();

    if (!VITALS.some((v) => payload[v.key] !== undefined)) {
      setError("Enter at least one vital sign.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await monitoringApi.createVital(patientId, payload);
      setResult(data.reading);
      setForm(EMPTY);
      setRecordedAt(nowLocal());
      onSaved(data.reading);
    } catch (err) {
      const details = err.response?.data?.details;
      setError(details?.[0]?.message || err.response?.data?.error || "Could not save the reading.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.vitalsGrid}>
        {VITALS.filter((v) => v.key !== "systolicBP").map((v) => (
          <label key={v.key} className={styles.field}>
            <span className={styles.fieldLabel}>{v.label}</span>
            <span className={styles.inputUnit}>
              <input
                type="number" inputMode="decimal" step={v.step}
                value={form[v.key]} onChange={set(v.key)} placeholder={v.placeholder}
                className={styles.input}
              />
              <span className={styles.unit}>{v.unit}</span>
            </span>
          </label>
        ))}

        <div className={`${styles.field} ${styles.spanFull}`}>
          <span className={styles.fieldLabel}>Blood pressure</span>
          <span className={styles.inputUnit}>
            <input
              type="number" inputMode="numeric" value={form.systolicBP} onChange={set("systolicBP")}
              placeholder="120" className={styles.input} aria-label="Systolic blood pressure"
            />
            <span className={styles.slash}>/</span>
            <input
              type="number" inputMode="numeric" value={form.diastolicBP} onChange={set("diastolicBP")}
              placeholder="80" className={styles.input} aria-label="Diastolic blood pressure"
            />
            <span className={styles.unit}>mmHg</span>
          </span>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Time of reading</span>
        <input
          type="datetime-local" value={recordedAt} max={nowLocal()}
          onChange={(e) => setRecordedAt(e.target.value)} className={styles.input} required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Notes (optional)</span>
        <textarea
          rows={2} value={form.notes} onChange={set("notes")} maxLength={1000}
          placeholder="e.g. Taken after a nap; patient felt warm" className={styles.input}
        />
      </label>

      <p className={styles.hint}>Fill in whichever readings you have — you don't need all of them.</p>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <Button type="submit" disabled={saving} icon={<FiSave size={15} />} fullWidth>
        {saving ? "Saving…" : "Save reading"}
      </Button>

      {result && (
        <div className={styles.result}>
          <AlertGuidance level={result.alertLevel} alerts={result.alerts} />
        </div>
      )}
    </form>
  );
}
