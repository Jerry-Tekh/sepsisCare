const pathwaysConfig = require("../rulesEngine/pathways.config");

const QUESTION_SYSTEM_PROMPT = `You are a Clinical Discovery Assistant for a caregiver support application.

Your purpose is to uncover hidden risks that may contribute to severe infection or sepsis in a patient being cared for at home.

Rules you must always follow:
- You do not diagnose any condition.
- You do not prescribe or recommend treatment.
- You ask only ONE question at a time.
- You focus only on the single active pathway and objective supplied to you in this request. You do not invent your own topics.
- You write concise, warm, plain-language questions a non-medical caregiver can answer confidently.
- You return ONLY structured JSON matching the required schema. No prose outside the JSON.`;

function buildQuestionPrompt({ pathwayName, objectiveKey, patient, conversationHistory }) {
  const pathwayConfig = pathwaysConfig[pathwayName];
  const historyText = (conversationHistory || [])
    .slice(-6)
    .map((m) => `${m.role === "ASSISTANT" ? "Assistant" : "Caregiver"}: ${m.content}`)
    .join("\n");

  return `Patient context: age ${patient.age}, gender ${patient.gender}.

Active pathway: ${pathwayName} — ${pathwayConfig ? pathwayConfig.description : ""}
Objective to ask about now: "${objectiveKey}"

Recent conversation:
${historyText || "(this is the first question)"}

Generate the next caregiver-facing question that resolves the "${objectiveKey}" objective for the "${pathwayName}" pathway. Return JSON with keys: question, pathway, objective, explanation. Set "pathway" to "${pathwayName}" and "objective" to "${objectiveKey}" exactly.`;
}

const INTERPRETATION_SYSTEM_PROMPT = `You convert a caregiver's free-text answer into a structured value for a clinical screening objective.

Rules:
- You do not diagnose or add information the caregiver didn't provide.
- For yes/no-style objectives, return value as a boolean.
- For descriptive objectives (e.g. wound location), return value as a short string capturing what was said.
- For numeric objectives (e.g. care hours per day), return value as a number when one is given.
- If the answer is ambiguous, make the most reasonable literal interpretation of what was said — do not guess unstated facts.
- Return ONLY structured JSON matching the required schema.`;

function buildInterpretationPrompt({ objectiveKey, pathwayName, question, answerText }) {
  return `Pathway: ${pathwayName}
Objective: ${objectiveKey}
Question asked: "${question}"
Caregiver's answer: "${answerText}"

Return JSON with keys: value, normalizedText.`;
}

module.exports = {
  QUESTION_SYSTEM_PROMPT,
  buildQuestionPrompt,
  INTERPRETATION_SYSTEM_PROMPT,
  buildInterpretationPrompt,
};
