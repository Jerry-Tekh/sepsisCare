const agentClient = require("../../services/agentClient.service");

/**
 * Maps risk profile levels to the topics that should be auto-generated.
 * Only generates for moderate or high risk levels.
 */
const RISK_TOPIC_MAP = {
  infection_risk: [
    { topic: "infection_prevention", title: "Infection Prevention Protocol" },
    { topic: "wound_care", title: "Wound Care & Dressing Guide" },
  ],
  sepsis_risk: [
    { topic: "sepsis_red_flags", title: "Sepsis Red Flags & Emergency Response" },
    { topic: "infection_prevention", title: "Stopping Infection from Spreading" },
  ],
  pressure_injury_risk: [
    { topic: "pressure_injury", title: "Pressure Injury Prevention Plan" },
    { topic: "mobility_support", title: "Turning & Positioning Schedule" },
  ],
  environmental_risk: [
    { topic: "environmental_safety", title: "Safe Home Environment Guide" },
    { topic: "hygiene", title: "Home Hygiene & Sanitation Basics" },
  ],
  caregiver_burden: [
    { topic: "caregiver_support", title: "Caregiver Self-Care & Fatigue Management" },
    { topic: "family_rotation", title: "Family Care Rotation Plan" },
  ],
};

/**
 * Determines the prevention track for a patient based on their risk profile answers.
 * Reads the riskData from the risk profile to check wound presence and underlying conditions.
 */
function determinePreventionTrack(riskData) {
  const hasWound = riskData?.known_conditions?.some((c) =>
    c.toLowerCase().includes("wound")
  );
  const hasUnderlying =
    riskData?.known_conditions?.length > 0 ||
    riskData?.possible_hidden_conditions?.length > 0 ||
    riskData?.infection_risk !== "low" ||
    riskData?.pressure_injury_risk !== "low";

  if (hasWound && hasUnderlying) return "COMBINED";
  if (hasWound) return "SECONDARY";
  if (hasUnderlying) return "PRIMARY";
  return "GENERAL";
}

/**
 * Builds the list of {topic, title, preventionTrack} materials to generate
 * based on which risk levels are moderate or high.
 * Deduplicates by topic so we don't generate the same material twice.
 */
function buildMaterialPlan(riskData) {
  const plan = [];
  const seenTopics = new Set();
  const preventionTrack = determinePreventionTrack(riskData);

  for (const [riskKey, topics] of Object.entries(RISK_TOPIC_MAP)) {
    const level = riskData?.[riskKey];
    if (level === "moderate" || level === "high") {
      for (const { topic, title } of topics) {
        if (!seenTopics.has(topic)) {
          seenTopics.add(topic);
          plan.push({ topic, title, preventionTrack, triggerContext: `${riskKey}: ${level}` });
        }
      }
    }
  }

  // Always include a nutrition guide — contextual for diabetes patients
  if (
    riskData?.known_conditions?.some((c) => c.toLowerCase().includes("diabetes")) &&
    !seenTopics.has("nutrition")
  ) {
    plan.push({
      topic: "nutrition",
      title: "Diabetes-Safe Meal Planning Guide",
      preventionTrack: "PRIMARY",
      triggerContext: "Known diabetes condition",
    });
  }

  return plan;
}

/**
 * Generates all materials for a plan item using the Render-hosted skills agent.
 * Returns the structured contentData object.
 */
async function generateOneMaterial({ patient, riskData, planItem, sources = [] }) {
  const result = await agentClient.runAgent({
    mode: "microlearning",
    message: `Create a caregiver microlearning material about ${planItem.topic}. ${planItem.triggerContext || ""}`,
    patientContext: { patient: { fullName: patient.fullName, age: patient.age, gender: patient.gender }, riskProfile: riskData },
    appContext: { preventionTrack: planItem.preventionTrack, targetAudience: "BOTH", approvedSources: sources, approvedSourceUrls: sources.map((source) => source.url) },
  });
  if (!result.material) throw new Error("Agent did not return a structured microlearning material");
  return result.material;
}

module.exports = { buildMaterialPlan, generateOneMaterial, determinePreventionTrack };
