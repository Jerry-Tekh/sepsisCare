const prisma = require("../../config/prismaClient");
const { BadRequestError, NotFoundError, ConflictError } = require("../../errors/AppError");
const agentClient = require("../../services/agentClient.service");
const riskService = require("../risk/risk.service");
const pathwaysConfig = require("./rulesEngine/pathways.config");
const screeningFactKeys = [...new Set(Object.values(pathwaysConfig).flatMap((config) => config.objectives))];

async function getMemory(patientId) {
  const row = await prisma.agentMemory.findUnique({ where: { patientId } });
  return row?.data || { facts: {}, experienceNotes: [], insights: [], followUps: [] };
}

async function persistAgentUpdates(patientId, result) {
  const old = await getMemory(patientId);
  const facts = { ...(old.facts || {}) };
  for (const fact of result.facts || []) {
    facts[fact.key] = { value: fact.value, epistemic: fact.epistemic, vector: fact.vector, updatedAt: new Date().toISOString() };
  }
  const updates = result.workspaceUpdates || {};
  const merge = (key, values) => [...new Set([...(old[key] || []), ...(values || [])])].slice(-200);
  const resolved = new Set((updates.resolvedFollowUps || []).map((item) => item.trim().toLowerCase()));
  const followUps = [...(old.followUps || []).filter((item) => !resolved.has(String(item).trim().toLowerCase())), ...(updates.followUps || [])];
  const data = {
    ...old,
    facts,
    experienceNotes: merge("experienceNotes", updates.experienceNotes),
    insights: merge("insights", updates.insights),
    followUps: [...new Set(followUps)].slice(-200),
    updatedAt: new Date().toISOString(),
    handoff: { updatedAt: new Date().toISOString(), openFollowUps: [...new Set(followUps)].slice(-50), lastKnownFacts: Object.keys(facts).slice(-100) },
  };
  await prisma.agentMemory.upsert({ where: { patientId }, create: { patientId, data }, update: { data } });
  await prisma.agentMemoryRevision.create({ data: { patientId, data: { facts: result.facts || [], workspaceUpdates: updates, handoff: data.handoff } } });
  if (result.flag) await saveFlag(patientId, result.flag);
}

async function saveFlag(patientId, flag) {
  const recent = await prisma.careFlag.findFirst({
    where: { patientId, status: { in: ["OPEN", "WAITING_FOR_DOCTOR", "ANSWERED"] }, title: flag.title },
  });
  if (recent) return recent;
  return prisma.careFlag.create({ data: {
    patientId,
    title: flag.title,
    status: "OPEN",
    epistemic: flag.epistemic,
    evidence: flag.evidence,
    doctorAsk: flag.doctorAsk,
    prevention: flag.preventionTaken,
  } });
}

async function patientContext(patientId) {
  const [patient, memory, pathways, riskProfile, currentPlan, guides] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    getMemory(patientId),
    prisma.patientPathway.findMany({ where: { patientId } }),
    prisma.riskProfile.findFirst({ where: { patientId }, orderBy: { createdAt: "desc" } }),
    prisma.carePlan.findFirst({ where: { patientId, isCurrent: true }, orderBy: { version: "desc" } }),
    prisma.learningGuide.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, prognosisVector: true, details: true, tags: true }, take: 30 }),
  ]);
  if (!patient) throw new NotFoundError("Patient not found");
  return { patient, memory, pathways, riskProfile: riskProfile?.riskData || null, currentPlan, approvedGuides: guides };
}

async function startSession(patientId) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError("Patient not found");
  const existingActive = await prisma.onboardingSession.findFirst({ where: { patientId, status: "IN_PROGRESS" } });
  if (existingActive) throw new ConflictError("An onboarding session is already in progress for this patient");
  const context = await patientContext(patientId);
  const result = await agentClient.runAgent({
    mode: "onboarding",
    message: "Begin or resume caregiver onboarding. Select the first question based on the skills and all existing patient-set information. Ask only one gentle, high-value question.",
    patientContext: { patient: { fullName: patient.fullName, age: patient.age, gender: patient.gender }, memory: context.memory, riskProfile: context.riskProfile },
    appContext: { availableApprovedGuides: context.approvedGuides, validScreeningFactKeys: screeningFactKeys },
  });
  await persistAgentUpdates(patientId, result);
  const session = await prisma.onboardingSession.create({ data: { patientId, status: result.complete ? "COMPLETED" : "IN_PROGRESS", ...(result.complete ? { completedAt: new Date() } : {}) } });
  const message = await prisma.onboardingMessage.create({ data: { sessionId: session.id, role: "ASSISTANT", content: result.reply, metadata: { nextQuestion: result.nextQuestion || null, complete: result.complete } } });
  if (result.complete) {
    const riskProfile = await riskService.generateAndSaveRiskProfile(patientId);
    return { status: "COMPLETED", session, message, riskProfileId: riskProfile.id, activePathways: [] };
  }
  return { status: "IN_PROGRESS", session, message, activePathways: [] };
}

async function submitAnswer(sessionId, answerText) {
  const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!session) throw new NotFoundError("Onboarding session not found");
  if (session.status !== "IN_PROGRESS") throw new BadRequestError("This onboarding session is already completed");
  const context = await patientContext(session.patientId);
  const history = session.messages.map((item) => ({ role: item.role === "CAREGIVER" ? "user" : "assistant", content: item.content }));
  const lastAssistantMessage = [...session.messages].reverse().find((item) => item.role === "ASSISTANT")?.content || null;
  const result = await agentClient.runAgent({
    mode: "onboarding",
    message: answerText,
    history,
    patientContext: { patient: { fullName: context.patient.fullName, age: context.patient.age, gender: context.patient.gender }, memory: context.memory, riskProfile: context.riskProfile },
    appContext: { availableApprovedGuides: context.approvedGuides, validScreeningFactKeys: screeningFactKeys, lastAssistantMessage },
  });
  await prisma.onboardingMessage.create({ data: { sessionId, role: "CAREGIVER", content: answerText } });
  await persistAgentUpdates(session.patientId, result);
  if (result.complete) {
    const completed = await prisma.onboardingSession.update({ where: { id: sessionId }, data: { status: "COMPLETED", completedAt: new Date() } });
    const riskProfile = await riskService.generateAndSaveRiskProfile(session.patientId);
    const completionMessage = await prisma.onboardingMessage.create({ data: { sessionId, role: "ASSISTANT", content: result.reply, metadata: { complete: true } } });
    return { status: "COMPLETED", session: completed, riskProfileId: riskProfile.id, message: completionMessage, activePathways: [] };
  }
  const message = await prisma.onboardingMessage.create({ data: { sessionId, role: "ASSISTANT", content: result.reply, metadata: { nextQuestion: result.nextQuestion || null } } });
  return { status: "IN_PROGRESS", message, activePathways: [] };
}

async function getSession(sessionId) {
  const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!session) throw new NotFoundError("Onboarding session not found");
  return session;
}

async function getActiveSession(patientId) {
  return prisma.onboardingSession.findFirst({ where: { patientId, status: "IN_PROGRESS" }, include: { messages: { orderBy: { createdAt: "asc" } } } });
}

async function listSessionsForPatient(patientId) {
  return prisma.onboardingSession.findMany({ where: { patientId }, include: { messages: { orderBy: { createdAt: "asc" } } }, orderBy: { startedAt: "desc" } });
}

module.exports = { startSession, submitAnswer, getSession, getActiveSession, listSessionsForPatient, patientContext, persistAgentUpdates };
