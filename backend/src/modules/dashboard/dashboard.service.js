const prisma = require("../../config/prismaClient");

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

module.exports = { summary };
