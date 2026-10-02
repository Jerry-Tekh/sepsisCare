/**
 * Centralized Pathway Activation Rules.
 *
 * Each rule is a pure function: (context) => string[] (pathway names to activate).
 * `context` shape:
 *   {
 *     patient: { age, gender, ... },
 *     answers: { [objectiveKey]: value }  // flattened answers across ALL pathways so far
 *   }
 *
 * Rules must never perform I/O (no Prisma, no AI API calls, no fetch). This keeps
 * the engine deterministic and unit-testable without a database or network.
 *
 * To add a new rule: append a function to the `rules` array. Nothing else
 * in the codebase needs to change.
 */

const rules = [
  // Wound present -> screen the wound itself, plus infection and sepsis red flags
  (ctx) =>
    ctx.answers.woundPresence === true
      ? ["WOUND_SCREENING", "INFECTION_SCREENING", "SEPSIS_RED_FLAGS"]
      : [],

  // Bedridden -> pressure injury risk
  (ctx) => (ctx.answers.bedriddenStatus === true ? ["PRESSURE_INJURY_RISK"] : []),

  // Wheelchair use -> pressure injury risk
  (ctx) => (ctx.answers.wheelchairUse === true ? ["PRESSURE_INJURY_RISK"] : []),

  // Age >= 60 -> pressure injury risk (frailty-related skin risk)
  (ctx) => (typeof ctx.patient.age === "number" && ctx.patient.age >= 60 ? ["PRESSURE_INJURY_RISK"] : []),

  // Excessive thirst -> diabetes screening
  (ctx) => (ctx.answers.excessiveThirst === true ? ["DIABETES_SCREENING"] : []),

  // Excessive urination -> diabetes screening
  (ctx) => (ctx.answers.excessiveUrination === true ? ["DIABETES_SCREENING"] : []),

  // Fever reported in general health -> infection screening + sepsis red flags
  (ctx) =>
    ctx.answers.fever === true ? ["INFECTION_SCREENING", "SEPSIS_RED_FLAGS"] : [],

  // Mobility limitation reported early -> pressure injury risk
  (ctx) =>
    ctx.answers.mobility === "limited" || ctx.answers.mobilityLimitation === true
      ? ["PRESSURE_INJURY_RISK"]
      : [],

  // Any infection-screening positive symptom -> sepsis red flags must be checked
  (ctx) =>
    ctx.answers.pus === true || ctx.answers.increasingRedness === true
      ? ["SEPSIS_RED_FLAGS"]
      : [],
];

/**
 * Evaluate all rules against a context and return a deduplicated list
 * of pathway names that should be active (in addition to any already active).
 */
function evaluateActivations(ctx) {
  const activated = rules.flatMap((rule) => rule(ctx) || []);
  return [...new Set(activated)];
}

module.exports = { rules, evaluateActivations };
