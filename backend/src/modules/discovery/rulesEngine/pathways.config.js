/**
 * Centralized Clinical Pathway Registry.
 *
 * This is the single source of truth for what each pathway screens for.
 * Do NOT hardcode pathway objectives anywhere else in the codebase —
 * the rules engine, the OpenAI service, and the seed script all read
 * from this file (or its persisted copy in the ClinicalPathway table).
 *
 * Each pathway has:
 *  - description: human-readable purpose (caregiver-facing context)
 *  - objectives: ordered list of objective keys that must be resolved
 *    before the pathway is considered complete. Order matters — it's
 *    the default question order.
 *  - alwaysActive: if true, this pathway activates for every patient
 *    on onboarding start with no condition needed.
 */

module.exports = {
  GENERAL_HEALTH: {
    description:
      "Establishes the patient's primary complaint and basic context that determines which other pathways may need to activate.",
    objectives: ["primaryComplaint", "age", "mobility", "symptomDuration"],
    alwaysActive: true,
  },

  DIABETES_SCREENING: {
    description:
      "Screens for undiagnosed or poorly controlled diabetes, a major risk factor for infection and delayed wound healing.",
    objectives: [
      "previousDiagnosis",
      "excessiveUrination",
      "excessiveThirst",
      "weightLoss",
      "previousGlucoseTesting",
    ],
    alwaysActive: false,
  },

  WOUND_SCREENING: {
    description:
      "Characterizes any wound to assess infection and healing risk.",
    objectives: [
      "woundPresence",
      "woundLocation",
      "duration",
      "odor",
      "drainage",
      "redness",
      "swelling",
    ],
    alwaysActive: false,
  },

  INFECTION_SCREENING: {
    description:
      "Looks for systemic signs of an active or worsening infection.",
    objectives: ["fever", "chills", "worseningPain", "pus", "increasingRedness"],
    alwaysActive: false,
  },

  SEPSIS_RED_FLAGS: {
    description:
      "Checks for the most urgent warning signs of sepsis that warrant immediate referral.",
    objectives: [
      "confusion",
      "rapidBreathing",
      "extremeWeakness",
      "persistentFever",
      "alteredConsciousness",
    ],
    alwaysActive: false,
  },

  PRESSURE_INJURY_RISK: {
    description:
      "Assesses risk of pressure injuries (bedsores) in patients with limited mobility.",
    objectives: [
      "bedriddenStatus",
      "wheelchairUse",
      "repositionFrequency",
      "mobilityLimitation",
    ],
    alwaysActive: false,
  },

  ENVIRONMENTAL_RISK: {
    description:
      "Assesses the home environment for conditions that increase infection or general health risk.",
    objectives: ["sleepingSurface", "ventilation", "waterAccess", "hygieneConditions"],
    alwaysActive: true,
  },

  CAREGIVER_BURDEN: {
    description:
      "Assesses caregiver workload and exhaustion, since caregiver burnout is itself a patient safety risk.",
    objectives: [
      "careHoursPerDay",
      "caregiverCount",
      "exhaustionLevel",
      "supportAvailability",
    ],
    alwaysActive: true,
  },
};
