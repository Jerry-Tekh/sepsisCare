const { z } = require("zod");

const riskLevelEnum = z.enum(["low", "moderate", "high"]);

const riskProfileSchema = z.object({
  known_conditions: z.array(z.string()),
  possible_hidden_conditions: z.array(z.string()),
  infection_risk: riskLevelEnum,
  sepsis_risk: riskLevelEnum,
  pressure_injury_risk: riskLevelEnum,
  environmental_risk: riskLevelEnum,
  caregiver_burden: riskLevelEnum,
  referral_recommended: z.boolean(),
  referral_reason: z.string(),
  summary: z.string(),
});

module.exports = { riskProfileSchema, riskLevelEnum };
