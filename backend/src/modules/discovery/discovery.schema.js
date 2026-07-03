const { z } = require("zod");

const submitAnswerSchema = z.object({
  answer: z.string().min(1, "Answer cannot be empty").max(2000),
});

const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1),
});

const patientIdParamSchema = z.object({
  patientId: z.string().min(1),
});

module.exports = { submitAnswerSchema, sessionIdParamSchema, patientIdParamSchema };
