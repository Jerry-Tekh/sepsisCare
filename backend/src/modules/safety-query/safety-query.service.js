const prisma = require("../../config/prismaClient");
const openaiService = require("../discovery/openai/openai.service");
const { NotFoundError, BadRequestError } = require("../../errors/AppError");

/**
 * Starts a new safety query session for a patient.
 * The first CHW question is stored immediately and the AI answers it.
 */
async function startQuery(patientId, caregiverId, firstQuestion) {
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

  // Create the query session and first CHW message in one transaction
  const query = await prisma.safetyQuery.create({
    data: {
      patientId,
      caregiverId,
      title: firstQuestion.slice(0, 80),
      status: "OPEN",
      messages: {
        create: {
          role: "CHW",
          content: firstQuestion,
        },
      },
    },
    include: { messages: true },
  });

  // Get the AI answer
  const aiResponse = await openaiService.answerSafetyQuery({
    patient,
    riskProfile: riskProfile?.riskData || null,
    assignedMaterials: materials,
    conversationHistory: [{ role: "CHW", content: firstQuestion }],
    latestQuestion: firstQuestion,
  });

  // If AI detected a red flag, update session status
  const sessionStatus = aiResponse.isRedFlag ? "RED_FLAG_TRIGGERED" : "OPEN";

  const [, assistantMessage] = await prisma.$transaction([
    prisma.safetyQuery.update({
      where: { id: query.id },
      data: { status: sessionStatus },
    }),
    prisma.safetyQueryMessage.create({
      data: {
        queryId: query.id,
        role: "ASSISTANT",
        content: aiResponse.answer,
        metadata: {
          isRedFlag: aiResponse.isRedFlag,
          referralReason: aiResponse.referralReason || null,
          linkedMaterialIds: aiResponse.linkedMaterialIds || [],
          linkedMaterialTitles: aiResponse.linkedMaterialTitles || [],
        },
      },
    }),
  ]);

  // Return the full query with all messages for the frontend
  const fullQuery = await prisma.safetyQuery.findUnique({
    where: { id: query.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return { query: fullQuery, isRedFlag: aiResponse.isRedFlag, referralReason: aiResponse.referralReason };
}

/**
 * Sends a follow-up message in an existing safety query session.
 * Builds the full conversation history so the AI has context.
 */
async function sendMessage(queryId, messageText, patientId) {
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

  // Store the CHW message
  await prisma.safetyQueryMessage.create({
    data: { queryId, role: "CHW", content: messageText },
  });

  // Build conversation history for AI
  const history = query.messages.map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: "CHW", content: messageText });

  const aiResponse = await openaiService.answerSafetyQuery({
    patient,
    riskProfile,
    assignedMaterials: materials,
    conversationHistory: history,
    latestQuestion: messageText,
  });

  const sessionStatus = aiResponse.isRedFlag ? "RED_FLAG_TRIGGERED" : "OPEN";

  // Use a transaction so the status update and assistant message are atomic.
  // If either fails, neither is committed — preventing a session stuck with
  // an updated status but no corresponding AI response message.
  const [, assistantMessage] = await prisma.$transaction([
    prisma.safetyQuery.update({
      where: { id: queryId },
      data: { status: sessionStatus },
    }),
    prisma.safetyQueryMessage.create({
      data: {
        queryId,
        role: "ASSISTANT",
        content: aiResponse.answer,
        metadata: {
          isRedFlag: aiResponse.isRedFlag,
          referralReason: aiResponse.referralReason || null,
          linkedMaterialIds: aiResponse.linkedMaterialIds || [],
          linkedMaterialTitles: aiResponse.linkedMaterialTitles || [],
        },
      },
    }),
  ]);

  return { message: assistantMessage, isRedFlag: aiResponse.isRedFlag, referralReason: aiResponse.referralReason };
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

module.exports = { startQuery, sendMessage, listQueriesForPatient, getQuery, closeQuery };
