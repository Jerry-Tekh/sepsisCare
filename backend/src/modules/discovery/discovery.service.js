const prisma = require("../../config/prismaClient");
const { BadRequestError, NotFoundError, ConflictError } = require("../../errors/AppError");
const openaiService = require("./openai/openai.service");
const riskService = require("../risk/risk.service");
const { evaluateActivations } = require("./rulesEngine/activationRules");
const { selectNextObjective } = require("./rulesEngine/objectiveSelector");
const { isPathwayComplete } = require("./rulesEngine/completionEvaluator");
const pathwaysConfig = require("./rulesEngine/pathways.config");

const ALWAYS_ACTIVE_PATHWAYS = Object.entries(pathwaysConfig)
  .filter(([, config]) => config.alwaysActive)
  .map(([name]) => name);

/**
 * Ensures a PatientPathway row exists (ACTIVE) for each given pathway name,
 * without overwriting any existing data. Returns the full, current list of
 * non-completed-irrelevant PatientPathway rows for the patient (i.e. all of them,
 * since selectNextObjective/isPathwayComplete safely skip fully-answered ones).
 */
async function ensurePathwaysActive(patientId, pathwayNames) {
  for (const name of pathwayNames) {
    await prisma.patientPathway.upsert({
      where: { patientId_pathwayName: { patientId, pathwayName: name } },
      update: {}, // don't touch existing data/status
      create: { patientId, pathwayName: name, status: "ACTIVE", data: { answeredObjectives: {} } },
    });
  }
}

async function getAllPatientPathways(patientId) {
  return prisma.patientPathway.findMany({ where: { patientId } });
}

function buildAnswersContext(patientPathways) {
  const answers = {};
  for (const pp of patientPathways) {
    const answered = (pp.data && pp.data.answeredObjectives) || {};
    for (const [key, entry] of Object.entries(answered)) {
      answers[key] = entry.value;
    }
  }
  return answers;
}

async function askNextQuestion({ session, patient, patientPathways }) {
  const next = selectNextObjective(patientPathways);
  if (!next) return null;

  const messages = await prisma.onboardingMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });

  const generated = await openaiService.generateQuestion({
    pathwayName: next.pathwayName,
    objectiveKey: next.objectiveKey,
    patient,
    conversationHistory: messages,
  });

  const message = await prisma.onboardingMessage.create({
    data: {
      sessionId: session.id,
      role: "ASSISTANT",
      content: generated.question,
      metadata: {
        pathway: generated.pathway,
        objective: generated.objective,
        explanation: generated.explanation,
      },
    },
  });

  return message;
}

/**
 * STEP 1-4: Create patient (already done by caller), create onboarding
 * session, activate GENERAL_HEALTH (and any other alwaysActive pathways),
 * generate the first question.
 */
async function startSession(patientId) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError("Patient not found");

  const existingActive = await prisma.onboardingSession.findFirst({
    where: { patientId, status: "IN_PROGRESS" },
  });
  if (existingActive) {
    throw new ConflictError("An onboarding session is already in progress for this patient");
  }

  // Starting a fresh round: clear any PatientPathway state left over from a
  // previous completed onboarding for this patient. Without this, old
  // answeredObjectives would make selectNextObjective() think every pathway
  // is already complete, so the new session would have zero questions to ask.
  // Past conversations and risk profiles are untouched — only the working
  // pathway-progress state resets.
  await prisma.patientPathway.deleteMany({ where: { patientId } });

  const session = await prisma.onboardingSession.create({
    data: { patientId, status: "IN_PROGRESS" },
  });

  await ensurePathwaysActive(patientId, ALWAYS_ACTIVE_PATHWAYS);
  const patientPathways = await getAllPatientPathways(patientId);

  const firstMessage = await askNextQuestion({ session, patient, patientPathways });

  if (!firstMessage) {
    // Should be unreachable given GENERAL_HEALTH always has objectives and
    // pathway state was just reset above — but fail loudly rather than
    // returning a session with no question if it ever does happen.
    throw new BadRequestError("Could not generate an initial onboarding question");
  }

  return {
    session,
    message: firstMessage,
    activePathways: patientPathways.map((pp) => pp.pathwayName),
  };
}

/**
 * STEP 5-11: Store caregiver's answer, update pathway state, evaluate
 * activation rules, activate new pathways if needed, generate the next
 * question, or complete onboarding and trigger risk assessment.
 */
async function submitAnswer(sessionId, answerText) {
  const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError("Onboarding session not found");
  if (session.status !== "IN_PROGRESS") {
    throw new BadRequestError("This onboarding session is already completed");
  }

  const patient = await prisma.patient.findUnique({ where: { id: session.patientId } });
  if (!patient) throw new NotFoundError("Patient not found");

  const lastAssistantMessage = await prisma.onboardingMessage.findFirst({
    where: { sessionId, role: "ASSISTANT" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastAssistantMessage) {
    throw new BadRequestError("No question has been asked yet in this session");
  }

  const { pathway: pathwayName, objective: objectiveKey } = lastAssistantMessage.metadata || {};
  if (!pathwayName || !objectiveKey) {
    throw new BadRequestError("Could not determine which objective this answer addresses");
  }

  // Store the caregiver's raw answer in the conversation log.
  await prisma.onboardingMessage.create({
    data: { sessionId, role: "CAREGIVER", content: answerText },
  });

  // Interpret the free-text answer into a structured value.
  const interpretation = await openaiService.interpretAnswer({
    pathwayName,
    objectiveKey,
    question: lastAssistantMessage.content,
    answerText,
  });

  // Persist the structured answer onto the relevant PatientPathway row.
  const patientPathway = await prisma.patientPathway.findUnique({
    where: { patientId_pathwayName: { patientId: patient.id, pathwayName } },
  });
  if (!patientPathway) {
    throw new BadRequestError(`Pathway ${pathwayName} is not active for this patient`);
  }

  const updatedAnswered = {
    ...((patientPathway.data && patientPathway.data.answeredObjectives) || {}),
    [objectiveKey]: {
      value: interpretation.value,
      normalizedText: interpretation.normalizedText,
      rawText: answerText,
    },
  };

  await prisma.patientPathway.update({
    where: { id: patientPathway.id },
    data: { data: { answeredObjectives: updatedAnswered } },
  });

  // Re-evaluate activation rules against everything answered so far.
  let patientPathways = await getAllPatientPathways(patient.id);
  const answersContext = buildAnswersContext(patientPathways);
  const candidateActivations = evaluateActivations({ patient, answers: answersContext });

  const existingNames = new Set(patientPathways.map((pp) => pp.pathwayName));
  const newlyActivated = candidateActivations.filter((name) => !existingNames.has(name));

  if (newlyActivated.length > 0) {
    await ensurePathwaysActive(patient.id, newlyActivated);
    patientPathways = await getAllPatientPathways(patient.id);
  }

  // Mark any newly-completed pathways as COMPLETED for clean dashboard reporting.
  for (const pp of patientPathways) {
    if (pp.status === "ACTIVE" && isPathwayComplete(pp)) {
      await prisma.patientPathway.update({ where: { id: pp.id }, data: { status: "COMPLETED" } });
    }
  }
  patientPathways = await getAllPatientPathways(patient.id);

  const nextMessage = await askNextQuestion({ session, patient, patientPathways });

  if (nextMessage) {
    return {
      status: "IN_PROGRESS",
      message: nextMessage,
      activePathways: patientPathways.map((pp) => pp.pathwayName),
    };
  }

  // No more objectives anywhere -> onboarding complete.
  const completedSession = await prisma.onboardingSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  const riskProfile = await riskService.generateAndSaveRiskProfile(patient.id);

  return {
    status: "COMPLETED",
    session: completedSession,
    riskProfileId: riskProfile.id,
  };
}

async function getSession(sessionId) {
  const session = await prisma.onboardingSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) throw new NotFoundError("Onboarding session not found");
  return session;
}

async function getActiveSession(patientId) {
  return prisma.onboardingSession.findFirst({
    where: { patientId, status: "IN_PROGRESS" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

/**
 * Returns ALL onboarding sessions (in-progress and completed) for a patient,
 * each with their full message history, newest first. Powers the
 * "Conversation History" view on the patient profile page.
 */
async function listSessionsForPatient(patientId) {
  return prisma.onboardingSession.findMany({
    where: { patientId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { startedAt: "desc" },
  });
}

module.exports = {
  startSession,
  submitAnswer,
  getSession,
  getActiveSession,
  listSessionsForPatient,
};
