const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const env = require("../../../config/env");
const logger = require("../../../utils/logger");
const {
  questionResponseSchema,
  answerInterpretationSchema,
} = require("./openai.responseSchema");
const {
  QUESTION_SYSTEM_PROMPT,
  buildQuestionPrompt,
  INTERPRETATION_SYSTEM_PROMPT,
  buildInterpretationPrompt,
} = require("./openai.prompts");

const client = new OpenAI({ apiKey: env.openaiApiKey });

/**
 * Fallback question templates, keyed by objective. Used only if OpenAI is
 * unreachable or returns something that fails validation twice in a row.
 * This guarantees the discovery flow never hard-blocks the caregiver.
 */
const FALLBACK_QUESTIONS = {
  primaryComplaint: "What's the main health concern you'd like help with today?",
  age: "How old is the patient?",
  mobility: "Can the patient move around on their own, or do they need help?",
  symptomDuration: "How long has this been going on?",
  previousDiagnosis: "Has the patient ever been diagnosed with diabetes?",
  excessiveUrination: "Has the patient been urinating much more than usual?",
  excessiveThirst: "Has the patient seemed unusually thirsty lately?",
  weightLoss: "Has the patient lost weight recently without trying to?",
  previousGlucoseTesting: "Has the patient's blood sugar ever been tested?",
  woundPresence: "Does the patient currently have any open wound or sore?",
  woundLocation: "Where on the body is the wound located?",
  duration: "How long has the wound been there?",
  odor: "Does the wound have any unusual smell?",
  drainage: "Is there any fluid or discharge coming from the wound?",
  redness: "Is the skin around the wound red?",
  swelling: "Is there any swelling around the wound?",
  fever: "Has the patient had a fever recently?",
  chills: "Has the patient had chills or felt shivery?",
  worseningPain: "Has the pain been getting worse?",
  pus: "Is there any pus coming from the wound or affected area?",
  increasingRedness: "Has the redness been spreading or getting worse?",
  confusion: "Has the patient seemed confused or not making sense?",
  rapidBreathing: "Has the patient been breathing faster than usual?",
  extremeWeakness: "Has the patient seemed extremely weak or unable to get up?",
  persistentFever: "Has the fever lasted more than a day without improving?",
  alteredConsciousness: "Has the patient had trouble staying awake or alert?",
  bedriddenStatus: "Is the patient unable to get out of bed on their own?",
  wheelchairUse: "Does the patient use a wheelchair?",
  repositionFrequency: "How often is the patient repositioned or helped to move?",
  mobilityLimitation: "Does the patient have any difficulty moving or walking?",
  sleepingSurface: "What does the patient sleep on?",
  ventilation: "Is the room where the patient stays well-ventilated?",
  waterAccess: "Does the household have reliable access to clean water?",
  hygieneConditions: "How would you describe the cleanliness of the patient's living space?",
  careHoursPerDay: "About how many hours a day do you spend caring for the patient?",
  caregiverCount: "How many people share caregiving responsibilities for the patient?",
  exhaustionLevel: "How exhausted do you feel from caregiving, on most days?",
  supportAvailability: "Do you have anyone who can help or give you a break from caregiving?",
};

function fallbackQuestion(pathwayName, objectiveKey) {
  return {
    question: FALLBACK_QUESTIONS[objectiveKey] || `Can you tell me about: ${objectiveKey}?`,
    pathway: pathwayName,
    objective: objectiveKey,
    explanation: "Standard screening question (fallback template).",
  };
}

/**
 * Generates the next caregiver-facing question for the given pathway/objective.
 * OpenAI controls phrasing ONLY — pathwayName and objectiveKey are dictated
 * by the rules engine and are echoed back, never chosen by the model.
 */
async function generateQuestion({ pathwayName, objectiveKey, patient, conversationHistory }) {
  const prompt = buildQuestionPrompt({ pathwayName, objectiveKey, patient, conversationHistory });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: env.openaiModel,
        messages: [
          { role: "system", content: QUESTION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: zodResponseFormat(questionResponseSchema, "discovery_question"),
        // NOTE: temperature is intentionally omitted. Current-generation
        // reasoning-tier models (e.g. the GPT-5 family) reject non-default
        // temperature values with a 400 error on /v1/chat/completions, and
        // Structured Outputs already enforces schema correctness regardless
        // of temperature, so there's no need to risk it. If you choose a
        // model that does support tuning creativity, add `temperature` back
        // here for that specific deployment.
      });

      const raw = completion.choices[0]?.message?.content;
      const parsed = questionResponseSchema.parse(JSON.parse(raw));

      // Enforce that the model didn't drift from the dictated pathway/objective.
      return {
        ...parsed,
        pathway: pathwayName,
        objective: objectiveKey,
      };
    } catch (err) {
      logger.warn(`OpenAI generateQuestion attempt ${attempt + 1} failed`, {
        error: err.message,
      });
    }
  }

  logger.warn("Falling back to template question", { pathwayName, objectiveKey });
  return fallbackQuestion(pathwayName, objectiveKey);
}

/**
 * Interprets a caregiver's free-text answer into a structured value the
 * rules engine can use to evaluate activation/completion. Falls back to
 * a naive heuristic if OpenAI is unavailable.
 */
async function interpretAnswer({ pathwayName, objectiveKey, question, answerText }) {
  const prompt = buildInterpretationPrompt({ pathwayName, objectiveKey, question, answerText });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: env.openaiModel,
        messages: [
          { role: "system", content: INTERPRETATION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: zodResponseFormat(answerInterpretationSchema, "answer_interpretation"),
        // temperature intentionally omitted — see note in generateQuestion above.
      });

      const raw = completion.choices[0]?.message?.content;
      return answerInterpretationSchema.parse(JSON.parse(raw));
    } catch (err) {
      logger.warn(`OpenAI interpretAnswer attempt ${attempt + 1} failed`, {
        error: err.message,
      });
    }
  }

  // Naive fallback: treat common affirmatives/negatives as booleans, else pass the raw text through.
  const normalized = answerText.trim().toLowerCase();
  if (["yes", "y", "yeah", "yep"].some((w) => normalized.startsWith(w))) {
    return { value: true, normalizedText: answerText.trim() };
  }
  if (["no", "n", "nope", "not"].some((w) => normalized.startsWith(w))) {
    return { value: false, normalizedText: answerText.trim() };
  }
  return { value: answerText.trim(), normalizedText: answerText.trim() };
}

/**
 * Generates the free-text "summary" field of a risk profile from the
 * collected pathway data. Risk LEVELS themselves are never decided by
 * OpenAI — only this narrative summary. See risk.service.js.
 */
async function generateRiskSummary({ patient, pathwayData, computedRisk }) {
  const prompt = `Patient: age ${patient.age}, gender ${patient.gender}.

Collected screening data: ${JSON.stringify(pathwayData)}

Computed risk levels: ${JSON.stringify(computedRisk)}

Write a concise (3-5 sentence) plain-language summary for a caregiver, describing what was found and why the risk levels are what they are. Do not diagnose. Do not contradict the computed risk levels. Return plain text only, no JSON.`;

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      messages: [
        {
          role: "system",
          content:
            "You write clear, caregiver-friendly summaries of screening results. You never diagnose, never contradict the risk levels you're given, and never invent facts beyond what's in the data.",
        },
        { role: "user", content: prompt },
      ],
      // temperature intentionally omitted — see note in generateQuestion above.
    });
    return completion.choices[0]?.message?.content?.trim() || "Summary unavailable.";
  } catch (err) {
    logger.warn("OpenAI generateRiskSummary failed, using fallback summary", {
      error: err.message,
    });
    return "Screening completed. Please review the individual risk levels below and consider professional follow-up where indicated.";
  }
}

module.exports = { generateQuestion, interpretAnswer, generateRiskSummary };
