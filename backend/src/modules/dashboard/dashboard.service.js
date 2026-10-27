const prisma = require("../../config/prismaClient");
const agentClient = require("../../services/agentClient.service");

async function summary(caregiverId) {
  const [totalPatients, activeOnboardingSessions, completedAssessments] = await Promise.all([
    prisma.patient.count({ where: { caregiverId } }),
    prisma.onboardingSession.count({
      where: { status: "IN_PROGRESS", patient: { caregiverId } },
    }),
    prisma.onboardingSession.count({
      where: { status: "COMPLETED", patient: { caregiverId } },
    }),
  ]);

  return { totalPatients, activeOnboardingSessions, completedAssessments };
}

async function welcome(user) {
  const result = await agentClient.runAgent({
    mode: "home",
    message: "Welcome the caregiver and briefly invite them to choose an available action.",
    patientContext: { caregiver: { firstName: user.fullName?.trim().split(/\s+/)[0] || "there" } },
    appContext: {
      availableActions: ["Open a Safety Query", "Create a caregiver care plan", "Generate or view microlearning", "Browse organization guides", "Start onboarding for a patient"],
    },
  });
  return { greeting: result.reply };
}

module.exports = { summary, welcome };
