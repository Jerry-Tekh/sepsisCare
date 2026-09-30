const { z } = require("zod");

const VALID_TOPICS = [
  "wound_care", "infection_prevention", "sepsis_red_flags", "pressure_injury",
  "mobility_support", "environmental_safety", "hygiene", "nutrition",
  "caregiver_support", "family_rotation", "diabetes", "general",
];

const requestGenerationSchema = z.object({
  topic: z.enum(VALID_TOPICS, { error: `Topic must be one of: ${VALID_TOPICS.join(", ")}` }),
});

const assignSchema = z.object({
  assign: z.boolean(),
});

const materialIdParamSchema = z.object({
  materialId: z.string().min(1),
});

module.exports = { requestGenerationSchema, assignSchema, materialIdParamSchema, VALID_TOPICS };
