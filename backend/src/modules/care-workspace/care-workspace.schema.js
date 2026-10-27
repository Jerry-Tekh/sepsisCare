const { z } = require("zod");

const patientIdParamSchema = z.object({ patientId: z.string().min(1) });
const flagIdParamSchema = z.object({ flagId: z.string().min(1) });
const planIdParamSchema = z.object({ planId: z.string().min(1) });
const generatePlanSchema = z.object({ request: z.string().min(3).max(2000), conversationId: z.string().min(1).optional() });
const checkInSchema = z.object({
  completedTasks: z.array(z.string().max(500)).max(30).default([]),
  missedTasks: z.array(z.string().max(500)).max(30).default([]),
  obstacles: z.string().max(2000).default(""),
  caregiverFeeling: z.string().max(500).default(""),
});
const resolveFlagSchema = z.object({ outcome: z.string().min(2).max(2000) });
const updateFlagSchema = z.object({ status: z.enum(["OPEN", "WAITING_FOR_DOCTOR", "ANSWERED", "RESOLVED"]), outcome: z.string().max(2000).optional() }).superRefine((value, ctx) => {
  if (["ANSWERED", "RESOLVED"].includes(value.status) && !value.outcome?.trim()) {
    ctx.addIssue({ code: "custom", path: ["outcome"], message: "Record the clinician's response or resolution outcome." });
  }
});

module.exports = { patientIdParamSchema, flagIdParamSchema, planIdParamSchema, generatePlanSchema, checkInSchema, resolveFlagSchema, updateFlagSchema };
