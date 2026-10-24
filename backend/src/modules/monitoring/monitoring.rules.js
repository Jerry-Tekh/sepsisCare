/**
 * ALERT THRESHOLDS (flagged for clinical sign-off — see project README):
 * Adapted from widely used adult early-warning criteria (NEWS2 bands, qSOFA,
 * and the UK Sepsis Trust / Sepsis Alliance red flags for the public).
 * They are deliberately conservative screening thresholds for home
 * caregivers, not diagnostic rules, and must be reviewed by a clinical
 * advisor before real-world use. They assume an adult patient; oxygen
 * thresholds in particular do not suit people with chronic lung disease
 * whose clinician has set a lower target.
 *
 * Levels: NORMAL < WATCH (contact a clinician, monitor closely)
 *         < URGENT (possible sepsis — seek emergency care now).
 */

const LEVEL_RANK = { NORMAL: 0, WATCH: 1, URGENT: 2 };

function maxLevel(levels) {
  return levels.reduce((max, l) => (LEVEL_RANK[l] > LEVEL_RANK[max] ? l : max), "NORMAL");
}

// Each rule returns { level, message } for an out-of-range value, or null.
const VITAL_RULES = {
  temperatureC(v) {
    if (v >= 39.0) return { level: "URGENT", message: `High fever (${v} °C).` };
    if (v <= 35.0) return { level: "URGENT", message: `Very low body temperature (${v} °C).` };
    if (v >= 38.0) return { level: "WATCH",  message: `Fever (${v} °C).` };
    if (v <= 36.0) return { level: "WATCH",  message: `Low body temperature (${v} °C).` };
    return null;
  },
  heartRate(v) {
    if (v >= 131) return { level: "URGENT", message: `Very fast heart rate (${v} bpm).` };
    if (v <= 40)  return { level: "URGENT", message: `Very slow heart rate (${v} bpm).` };
    if (v >= 91)  return { level: "WATCH",  message: `Fast heart rate (${v} bpm).` };
    if (v <= 50)  return { level: "WATCH",  message: `Slow heart rate (${v} bpm).` };
    return null;
  },
  respiratoryRate(v) {
    if (v >= 25) return { level: "URGENT", message: `Very fast breathing (${v} breaths/min).` };
    if (v <= 8)  return { level: "URGENT", message: `Very slow breathing (${v} breaths/min).` };
    if (v >= 21) return { level: "WATCH",  message: `Fast breathing (${v} breaths/min).` };
    return null;
  },
  systolicBP(v) {
    if (v <= 90)  return { level: "URGENT", message: `Low blood pressure (${v} mmHg systolic).` };
    if (v >= 220) return { level: "URGENT", message: `Very high blood pressure (${v} mmHg systolic).` };
    if (v <= 100) return { level: "WATCH",  message: `Blood pressure on the low side (${v} mmHg systolic).` };
    return null;
  },
  oxygenSaturation(v) {
    if (v <= 91) return { level: "URGENT", message: `Low oxygen level (${v}%).` };
    if (v <= 95) return { level: "WATCH",  message: `Oxygen level below normal (${v}%).` };
    return null;
  },
};

// The vitals that make up sepsis screening criteria (SIRS / qSOFA style).
const SEPSIS_VITALS = ["temperatureC", "heartRate", "respiratoryRate", "systolicBP"];

/**
 * Evaluates one set of vital signs. Missing values are skipped.
 * Returns { alertLevel, alerts: [{ field, level, message }] }.
 */
function evaluateVitals(reading) {
  const alerts = [];
  for (const [field, rule] of Object.entries(VITAL_RULES)) {
    const value = reading[field];
    if (value === null || value === undefined) continue;
    const result = rule(value);
    if (result) alerts.push({ field, ...result });
  }

  const sepsisSigns = alerts.filter((a) => SEPSIS_VITALS.includes(a.field)).length;
  if (sepsisSigns >= 2) {
    alerts.unshift({
      field: "combined",
      level: "URGENT",
      message: "Two or more sepsis warning signs together — seek emergency care now.",
    });
  }

  return { alertLevel: maxLevel(alerts.map((a) => a.level)), alerts };
}

// Check-in symptoms. Red flags are URGENT on their own; the rest are WATCH.
const CHECK_IN_SYMPTOMS = {
  confusion:         { level: "URGENT", message: "New confusion, very sleepy or hard to wake." },
  breathingTrouble:  { level: "URGENT", message: "Breathless or breathing very fast." },
  skinChanges:       { level: "URGENT", message: "Mottled, bluish or very pale skin." },
  severePain:        { level: "URGENT", message: "Severe pain or feeling extremely ill." },
  reducedUrine:      { level: "URGENT", message: "Little or no urine in the last 12 hours." },
  feverOrChills:     { level: "WATCH",  message: "Fever, shivering or feeling very cold." },
  woundWorse:        { level: "WATCH",  message: "Wound looks worse (redder, swollen, hot, pus or smell)." },
  notEatingDrinking: { level: "WATCH",  message: "Not eating or drinking as usual." },
  feelsWorse:        { level: "WATCH",  message: "More unwell than yesterday." },
};

/**
 * Evaluates a daily check-in. Three or more WATCH symptoms together are
 * escalated to URGENT, since infection signs plus general decline is the
 * pattern caregivers most often miss.
 */
function evaluateCheckIn(checkIn) {
  const alerts = Object.entries(CHECK_IN_SYMPTOMS)
    .filter(([field]) => checkIn[field] === true)
    .map(([field, { level, message }]) => ({ field, level, message }));

  const watchCount = alerts.filter((a) => a.level === "WATCH").length;
  if (watchCount >= 3) {
    alerts.unshift({
      field: "combined",
      level: "URGENT",
      message: "Several warning signs together — contact a clinician or emergency services now.",
    });
  }

  return { alertLevel: maxLevel(alerts.map((a) => a.level)), alerts };
}

module.exports = {
  evaluateVitals,
  evaluateCheckIn,
  CHECK_IN_FIELDS: Object.keys(CHECK_IN_SYMPTOMS),
  LEVEL_RANK,
};
