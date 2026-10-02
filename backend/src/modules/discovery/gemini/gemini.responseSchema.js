const { z } = require("zod");

/**
 * Schema for the question-generation response, per spec:
 * { question, pathway, objective, explanation }
 */
const questionResponseSchema = z.object({
  question: z.string().min(1).max(500),
  pathway: z.string().min(1),
  objective: z.string().min(1),
  explanation: z.string().min(1).max(500),
});

/**
 * Schema for interpreting a caregiver's free-text answer into a structured
 * value the rules engine can reason about. This is an internal contract,
 * not exposed to the client — the discovery engine needs *some* structured
 * value per objective to evaluate activation rules and completion.
 *
 * `value` is intentionally loose (boolean | string | number) because
 * objectives vary (yes/no symptoms vs. descriptive answers like wound location).
 */
const answerInterpretationSchema = z.object({
  value: z.union([z.boolean(), z.string(), z.number()]),
  normalizedText: z.string().min(1).max(500),
});

module.exports = { questionResponseSchema, answerInterpretationSchema };
