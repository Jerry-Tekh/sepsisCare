const { z } = require("zod");
const env = require("../config/env");
const { AppError } = require("../errors/AppError");

const agentDataSchema = z.object({
  reply: z.string().min(1).max(5000),
  nextQuestion: z.string().max(1000).nullable().optional(),
  complete: z.boolean().optional().default(false),
  facts: z.array(z.object({
    key: z.string().max(100),
    value: z.union([z.string().max(2000), z.number(), z.boolean()]),
    epistemic: z.enum(["identified", "inferred", "unidentified"]).default("identified"),
    vector: z.string().max(100).default("unclassified"),
  })).max(60).default([]),
  workspaceUpdates: z.object({
    experienceNotes: z.array(z.string().max(2000)).max(20).default([]),
    insights: z.array(z.string().max(2000)).max(20).default([]),
    followUps: z.array(z.string().max(1000)).max(20).default([]),
    resolvedFollowUps: z.array(z.string().max(1000)).max(20).default([]),
  }).default({}),
  plan: z.object({
    title: z.string().min(1).max(160),
    issue: z.string().min(1).max(1000),
    intendedAchievement: z.string().min(1).max(1000),
    strategy: z.string().min(1).max(3000),
    forecast: z.string().max(1000).default(""),
    tasks: z.array(z.object({
      title: z.string().min(1).max(500),
      when: z.string().max(300).nullable().optional(),
      priority: z.enum(["today", "this_week", "urgent", "optional"]).default("optional"),
    })).max(30),
    caregiverRest: z.string().max(500).nullable().optional(),
  }).nullable().optional().default(null),
  flag: z.object({
    title: z.string().min(1).max(200),
    evidence: z.array(z.string().max(1500)).max(30),
    epistemic: z.enum(["suspected", "identified", "unidentified"]),
    doctorAsk: z.string().min(1).max(1000),
    preventionTaken: z.array(z.string().max(1000)).max(20),
  }).nullable().optional().default(null),
  material: z.object({
    title: z.string().min(1).max(150),
    summary: z.string().min(1).max(400),
    prescriptive: z.array(z.string().min(1)).min(1).max(10),
    prohibitive: z.array(z.string().min(1)).max(10),
    lowCostWorkarounds: z.array(z.string().min(1)).max(6),
    keySigns: z.array(z.string().min(1)).max(6),
    emergencyAction: z.string().min(1).max(500),
    reviewNote: z.string().min(1).max(500),
    sourcesUsed: z.array(z.object({ name: z.string(), url: z.url() })).max(5).default([]),
  }).nullable().optional().default(null),
  isRedFlag: z.boolean().optional().default(false),
  referralReason: z.string().max(1000).nullable().optional().default(null),
  linkedMaterialIds: z.array(z.string()).max(20).default([]),
  topic: z.string().max(200).nullable().optional().default(null),
});

async function runAgent({ mode, message, history = [], patientContext = {}, appContext = {} }) {
  if (!env.agentUrl || !env.agentSharedSecret) {
    throw new AppError("The Render caregiver agent is not configured. Set AGENT_BASE_URL and AGENT_SHARED_SECRET.", 503);
  }
  let response;
  try {
    response = await fetch(`${env.agentUrl.replace(/\/$/, "")}/v1/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-agent-secret": env.agentSharedSecret },
      body: JSON.stringify({ mode, message, history, patientContext, appContext }),
      signal: AbortSignal.timeout(65000),
    });
  } catch (error) {
    throw new AppError("The caregiver agent could not be reached. Please try again shortly.", 503, { cause: error.message });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(payload.error || "The caregiver agent is temporarily unavailable.", 503);
  const parsed = agentDataSchema.safeParse(payload.data);
  if (!parsed.success) throw new AppError("The caregiver agent returned an invalid response. Please try again.", 502);
  return { ...parsed.data, model: payload.model || null };
}

module.exports = { runAgent, agentDataSchema };
