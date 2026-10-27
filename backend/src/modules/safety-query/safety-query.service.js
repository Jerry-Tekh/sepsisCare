const prisma = require("../../config/prismaClient");
const agentClient = require("../../services/agentClient.service");
const discoveryService = require("../discovery/discovery.service");
const { NotFoundError, BadRequestError } = require("../../errors/AppError");

async function assertOnboardingCompleted(patientId) {
  const [completedSession, riskProfile] = await Promise.all([
    prisma.onboardingSession.findFirst({
      where: { patientId, status: "COMPLETED" },
      select: { id: true },
    }),
    prisma.riskProfile.findFirst({
      where: { patientId },
      select: { id: true },
    }),
  ]);

  if (!completedSession || !riskProfile) {
    throw new BadRequestError(
      "Complete onboarding and wait for the patient risk assessment before using Safety Query."
    );
  }
}

function directRedFlag(text) {
  const value = String(text || "").toLowerCase();
  const patterns = [
    /\b(unresponsive|barely responding|cannot be woken|can't be woken|not waking|hard to wake|loss of consciousness|unconscious|seizure|convulsion)\b/,
    /\b(difficulty breathing|struggling to breathe|labou?red breathing|blue lips|blue fingertips|new sudden headache)\b/,
    /\b(chest pain|facial droop|stroke|uncontrolled bleeding|bleeding won't stop|diabetic emergency)\b/,
    /\b(confusion|confused|altered consciousness)\b/,
    /\b(rapid breathing|very fast breathing|cold clammy skin|weak rapid pulse|shock)\b/,
    /\b(very low blood sugar|very high blood sugar|rapidly worsening|refusal to eat or drink|unable to eat or drink)\b/,
  ];
  return patterns.some((pattern) => {
    const match = pattern.exec(value);
    if (!match || match.index === undefined) return false;
    const before = value.slice(Math.max(0, match.index - 36), match.index);
    return !/\b(no|not|without|denies|denied|never|isn't|aren't|doesn't|don't)\b(?:\s+\w+){0,4}\s*$/i.test(before);
  });
}

function materialTitles(materials, ids = []) {
  return ids.map((id) => materials.find((material) => material.id === id)).filter(Boolean).map((material) => ({ id: material.id, title: material.title }));
}

/**
 * Starts a new safety query session for a patient.
 * The first CHW question is stored immediately and the AI answers it.
 */
async function startQuery(patientId, caregiverId, firstQuestion) {
  await assertOnboardingCompleted(patientId);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      riskProfiles: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!patient) throw new NotFoundError("Patient not found");

  const riskProfile = patient.riskProfiles[0] || null;

  // Fetch assigned microlearning materials so the AI can reference them
  const materials = await prisma.microlearningMaterial.findMany({
    where: { patientId, isAssigned: true },
    select: { id: true, title: true, topic: true },
  });

  const context = await discoveryService.patientContext(patientId);
  const aiResponse = await agentClient.runAgent({
    mode: "safety_query",
    message: firstQuestion,
    history: [],
    patientContext: { patient: { fullName: patient.fullName, age: patient.age, gender: patient.gender }, riskProfile: riskProfile?.riskData || null, memory: context.memory },
    appContext: { assignedMaterials: materials, approvedGuides: context.approvedGuides },
  });
  const isRedFlag = aiResponse.isRedFlag || directRedFlag(firstQuestion);
  const referralReason = aiResponse.referralReason || (isRedFlag ? "A potentially urgent warning sign was reported. Contact a clinician or emergency service now." : null);
  await discoveryService.persistAgentUpdates(patientId, {
    ...aiResponse,
    flag: aiResponse.flag || (isRedFlag ? { title: "Urgent warning sign reported", evidence: [firstQuestion], epistemic: "suspected", doctorAsk: referralReason, preventionTaken: [] } : null),
  });
  const linkedMaterials = materialTitles(materials, aiResponse.linkedMaterialIds);

  // If AI detected a red flag, update session status
  const sessionStatus = isRedFlag ? "RED_FLAG_TRIGGERED" : "OPEN";

  const query = await prisma.safetyQuery.create({
    data: {
      patientId,
      caregiverId,
      title: firstQuestion.slice(0, 80),
      status: sessionStatus,
      messages: { create: [
        { role: "CHW", content: firstQuestion },
        { role: "ASSISTANT", content: aiResponse.reply, metadata: {
          isRedFlag, referralReason,
          linkedMaterialIds: linkedMaterials.map((material) => material.id),
          linkedMaterialTitles: linkedMaterials.map((material) => material.title),
        } },
      ] },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const fullQuery = await prisma.safetyQuery.findUnique({
    where: { id: query.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return { query: fullQuery, isRedFlag, referralReason };
}

/**
 * Sends a follow-up message in an existing safety query session.
 * Builds the full conversation history so the AI has context.
 */
async function sendMessage(queryId, messageText, patientId) {
  await assertOnboardingCompleted(patientId);

  const query = await prisma.safetyQuery.findUnique({
    where: { id: queryId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      patient: {
        include: {
          riskProfiles: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!query) throw new NotFoundError("Safety query session not found");
  if (query.status === "RED_FLAG_TRIGGERED") {
    throw new BadRequestError(
      "This session has a red flag alert. Please act on the referral before continuing."
    );
  }
  if (query.status === "CLOSED") {
    throw new BadRequestError("This session has been closed and cannot receive new messages.");
  }

  const patient = query.patient;
  const riskProfile = patient.riskProfiles[0]?.riskData || null;

  // Fetch assigned materials for context
  const materials = await prisma.microlearningMaterial.findMany({
    where: { patientId, isAssigned: true },
    select: { id: true, title: true, topic: true },
  });

  const history = query.messages.map((m) => ({ role: m.role === "CHW" ? "user" : "assistant", content: m.content }));

  const context = await discoveryService.patientContext(patientId);
  const aiResponse = await agentClient.runAgent({
    mode: "safety_query",
    message: messageText,
    history,
    patientContext: { patient: { fullName: patient.fullName, age: patient.age, gender: patient.gender }, riskProfile, memory: context.memory },
    appContext: { assignedMaterials: materials, approvedGuides: context.approvedGuides },
  });
  const isRedFlag = aiResponse.isRedFlag || directRedFlag(messageText);
  const referralReason = aiResponse.referralReason || (isRedFlag ? "A potentially urgent warning sign was reported. Contact a clinician or emergency service now." : null);
  await discoveryService.persistAgentUpdates(patientId, {
    ...aiResponse,
    flag: aiResponse.flag || (isRedFlag ? { title: "Urgent warning sign reported", evidence: [messageText], epistemic: "suspected", doctorAsk: referralReason, preventionTaken: [] } : null),
  });
  const linkedMaterials = materialTitles(materials, aiResponse.linkedMaterialIds);

  const sessionStatus = isRedFlag ? "RED_FLAG_TRIGGERED" : "OPEN";

  // Use a transaction so the status update and assistant message are atomic.
  // If either fails, neither is committed — preventing a session stuck with
  // an updated status but no corresponding AI response message.
  const [, caregiverMessage, assistantMessage] = await prisma.$transaction([
    prisma.safetyQuery.update({
      where: { id: queryId },
      data: { status: sessionStatus },
    }),
    prisma.safetyQueryMessage.create({ data: { queryId, role: "CHW", content: messageText } }),
    prisma.safetyQueryMessage.create({
      data: {
        queryId,
        role: "ASSISTANT",
        content: aiResponse.reply,
        metadata: {
          isRedFlag,
          referralReason,
          linkedMaterialIds: linkedMaterials.map((material) => material.id),
          linkedMaterialTitles: linkedMaterials.map((material) => material.title),
        },
      },
    }),
  ]);

  return { message: assistantMessage, isRedFlag, referralReason };
}

/**
 * Lists all safety query sessions for a patient, newest first.
 */
async function listQueriesForPatient(patientId) {
  return prisma.safetyQuery.findMany({
    where: { patientId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Gets a single safety query session with all messages.
 */
async function getQuery(queryId) {
  const query = await prisma.safetyQuery.findUnique({
    where: { id: queryId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!query) throw new NotFoundError("Safety query session not found");
  return query;
}

/**
 * Closes a safety query session (marks as CLOSED).
 */
async function closeQuery(queryId) {
  const query = await prisma.safetyQuery.findUnique({ where: { id: queryId } });
  if (!query) throw new NotFoundError("Safety query session not found");
  return prisma.safetyQuery.update({
    where: { id: queryId },
    data: { status: "CLOSED" },
  });
}

module.exports = {
  assertOnboardingCompleted,
  startQuery,
  sendMessage,
  listQueriesForPatient,
  getQuery,
  closeQuery,
};
