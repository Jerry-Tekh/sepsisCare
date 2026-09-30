const prisma = require("../../config/prismaClient");
const openaiService = require("../discovery/openai/openai.service");
const { riskProfileSchema } = require("./risk.schema");
const { NotFoundError } = require("../../errors/AppError");
const logger = require("../../utils/logger");

// Lazy-require to avoid circular dependency (microlearning → risk → microlearning)
function getMicrolearningService() {
  return require("../microlearning/microlearning.service");
}

/**
 * SCORING ASSUMPTIONS (flagged for clinical sign-off — see project README):
 * These thresholds are deliberately simple and conservative for an MVP/FYP.
 * They should be reviewed by a clinical advisor before any real-world use.
 *
 * Each function below reads from the flattened `answers` map
 * (objectiveKey -> value) built from all of a patient's PatientPathway rows.
 */

function countTruthy(answers, keys) {
  return keys.filter((k) => answers[k] === true).length;
}

function computeSepsisRisk(answers) {
  const redFlagKeys = [
    "confusion",
    "rapidBreathing",
    "extremeWeakness",
    "persistentFever",
    "alteredConsciousness",
  ];
  const count = countTruthy(answers, redFlagKeys);
  if (count >= 2) return "high";
  if (count === 1) return "moderate";
  return "low";
}

function computeInfectionRisk(answers) {
  const infectionKeys = ["fever", "chills", "worseningPain", "pus", "increasingRedness"];
  const count = countTruthy(answers, infectionKeys);
  if (count >= 3) return "high";
  if (count >= 1) return "moderate";
  return "low";
}

function computePressureInjuryRisk(answers) {
  if (answers.bedriddenStatus === true) return "high";
  if (answers.wheelchairUse === true || answers.mobilityLimitation === true) return "moderate";
  return "low";
}

function computeEnvironmentalRisk(answers) {
  const concerns = [
    answers.ventilation === false,
    answers.waterAccess === false,
    typeof answers.hygieneConditions === "string" &&
      /poor|bad|unclean|dirty/i.test(answers.hygieneConditions),
  ].filter(Boolean).length;
  if (concerns >= 2) return "high";
  if (concerns === 1) return "moderate";
  return "low";
}

function computeCaregiverBurden(answers) {
  const hours = typeof answers.careHoursPerDay === "number" ? answers.careHoursPerDay : null;
  const exhaustionText =
    typeof answers.exhaustionLevel === "string" ? answers.exhaustionLevel.toLowerCase() : "";
  const highExhaustion = /severe|extreme|very|constant/i.test(exhaustionText);
  const noSupport = answers.supportAvailability === false;

  if ((hours !== null && hours >= 16) || (highExhaustion && noSupport)) return "high";
  if ((hours !== null && hours >= 8) || highExhaustion || noSupport) return "moderate";
  return "low";
}

function computeKnownConditions(answers) {
  const conditions = [];
  if (answers.previousDiagnosis === true) conditions.push("Diabetes (previously diagnosed)");
  if (answers.woundPresence === true) conditions.push("Open wound");
  return conditions;
}

function computeHiddenConditions(answers) {
  const hidden = [];
  if (
    answers.previousDiagnosis !== true &&
    (answers.excessiveThirst === true || answers.excessiveUrination === true)
  ) {
    hidden.push("Possible undiagnosed diabetes — recommend glucose testing");
  }
  return hidden;
}

function computeReferral({ sepsisRisk, infectionRisk, pressureInjuryRisk }) {
  if (sepsisRisk === "high" || infectionRisk === "high") {
    return {
      recommended: true,
      reason:
        "Multiple sepsis red-flag or infection signs were reported. Prompt clinical evaluation is recommended.",
    };
  }
  if (pressureInjuryRisk === "high") {
    return {
      recommended: true,
      reason: "High pressure injury risk identified; clinical wound care assessment recommended.",
    };
  }
  if (sepsisRisk === "moderate" || infectionRisk === "moderate") {
    return {
      recommended: true,
      reason: "Some infection-related signs were reported; a clinical check-up is advisable.",
    };
  }
  return { recommended: false, reason: "" };
}

/**
 * Flattens all of a patient's PatientPathway.data.answeredObjectives into
 * a single answers map, keyed by objective key.
 */
function flattenAnswers(patientPathways) {
  return patientPathways.reduce((acc, pp) => {
    const answered = (pp.data && pp.data.answeredObjectives) || {};
    for (const [key, entry] of Object.entries(answered)) {
      acc[key] = entry.value;
    }
    return acc;
  }, {});
}

/**
 * Builds and persists the RiskProfile for a patient based on all of their
 * PatientPathway data. Called by discovery.service.js once onboarding
 * completes.
 */
async function generateAndSaveRiskProfile(patientId) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError("Patient not found");

  const patientPathways = await prisma.patientPathway.findMany({ where: { patientId } });
  const answers = flattenAnswers(patientPathways);

  const sepsisRisk = computeSepsisRisk(answers);
  const infectionRisk = computeInfectionRisk(answers);
  const pressureInjuryRisk = computePressureInjuryRisk(answers);
  const environmentalRisk = computeEnvironmentalRisk(answers);
  const caregiverBurden = computeCaregiverBurden(answers);
  const referral = computeReferral({
    sepsisRisk,
    infectionRisk,
    pressureInjuryRisk,
  });

  const computedRisk = {
    infection_risk: infectionRisk,
    sepsis_risk: sepsisRisk,
    pressure_injury_risk: pressureInjuryRisk,
    environmental_risk: environmentalRisk,
    caregiver_burden: caregiverBurden,
  };

  const summary = await openaiService.generateRiskSummary({
    patient,
    pathwayData: answers,
    computedRisk,
  });

  const riskProfileData = riskProfileSchema.parse({
    known_conditions: computeKnownConditions(answers),
    possible_hidden_conditions: computeHiddenConditions(answers),
    ...computedRisk,
    referral_recommended: referral.recommended,
    referral_reason: referral.reason,
    summary,
  });

  const savedProfile = await prisma.riskProfile.create({
    data: {
      patientId,
      riskData: riskProfileData,
      summary: riskProfileData.summary,
    },
  });

  // Fire-and-forget: auto-generate microlearning materials based on the risk profile.
  // We deliberately do NOT await this so it never delays the risk profile response to the client.
  // If generation fails it logs the error but does not affect the saved risk profile.
  getMicrolearningService()
    .autoGenerateForRiskProfile(patientId, riskProfileData)
    .catch((err) =>
      logger.error("Microlearning auto-generation failed after risk profile save", {
        patientId,
        error: err.message,
      })
    );

  return savedProfile;
}

async function getLatest(patientId) {
  const profile = await prisma.riskProfile.findFirst({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
  if (!profile) throw new NotFoundError("No risk profile found for this patient yet");
  return profile;
}

async function getHistory(patientId) {
  return prisma.riskProfile.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
}

module.exports = { generateAndSaveRiskProfile, getLatest, getHistory };
