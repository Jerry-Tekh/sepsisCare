// Display metadata for each vital sign. `normal` is the band shaded on the
// trend chart; it mirrors the WATCH thresholds in the backend's
// monitoring.rules.js (the server is the source of truth for alerts).
export const VITALS = [
  { key: "temperatureC",     label: "Temperature",    unit: "°C",          step: "0.1", normal: [36.1, 37.9], placeholder: "e.g. 37.0" },
  { key: "heartRate",        label: "Heart rate",     unit: "bpm",         step: "1",   normal: [51, 90],     placeholder: "e.g. 80" },
  { key: "respiratoryRate",  label: "Breathing rate", unit: "breaths/min", step: "1",   normal: [12, 20],     placeholder: "e.g. 16" },
  { key: "systolicBP",       label: "Blood pressure (systolic)", shortLabel: "Systolic BP", unit: "mmHg", step: "1", normal: [101, 219], placeholder: "e.g. 120" },
  { key: "oxygenSaturation", label: "Oxygen level",   unit: "%",           step: "1",   normal: [96, 100],    placeholder: "e.g. 97" },
];

export const CHECK_IN_QUESTIONS = [
  { key: "confusion",         label: "New confusion, very sleepy or hard to wake?", urgent: true },
  { key: "breathingTrouble",  label: "Breathless or breathing very fast?",          urgent: true },
  { key: "skinChanges",       label: "Mottled, bluish or very pale skin?",          urgent: true },
  { key: "severePain",        label: "Severe pain or seems extremely ill?",         urgent: true },
  { key: "reducedUrine",      label: "Little or no urine in the last 12 hours?",    urgent: true },
  { key: "feverOrChills",     label: "Fever, shivering or feeling very cold?" },
  { key: "woundWorse",        label: "Wound redder, swollen, hot, oozing pus or smelly?" },
  { key: "notEatingDrinking", label: "Not eating or drinking as usual?" },
  { key: "feelsWorse",        label: "More unwell than yesterday?" },
];

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const LEVEL_RANK = { NORMAL: 0, WATCH: 1, URGENT: 2 };
const STATUS_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Current monitoring status: the most severe vitals reading or check-in in
 * the last 48 hours (ties go to the most recent), matching the dashboard
 * alert logic on the server. Returns null when nothing was recorded.
 */
export function currentStatus(readings, checkIns) {
  const since = Date.now() - STATUS_WINDOW_MS;
  const entries = [
    ...readings.map((r) => ({ ...r, type: "vitals", at: r.recordedAt })),
    ...checkIns.map((c) => ({ ...c, type: "check-in", at: c.createdAt })),
  ]
    .filter((e) => new Date(e.at).getTime() >= since)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  return entries.reduce(
    (worst, e) => (!worst || LEVEL_RANK[e.alertLevel] > LEVEL_RANK[worst.alertLevel] ? e : worst),
    null
  );
}
