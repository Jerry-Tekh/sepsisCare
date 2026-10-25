const prisma = require("../../config/prismaClient");
const { buildMaterialPlan, generateOneMaterial } = require("./microlearning.generator");
const { generateMaterialPDF } = require("./pdf.generator");
const { generateImageCard } = require("./imageCard.generator");
const { NotFoundError } = require("../../errors/AppError");
const logger = require("../../utils/logger");
const learningGuideService = require("../learning-guides/learning-guides.service");

/**
 * Auto-generates recommended microlearning materials based on a completed risk profile.
 * Called automatically by risk.service.js after every risk profile is saved.
 */
async function autoGenerateForRiskProfile(patientId, riskData) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return;

  const plan = buildMaterialPlan(riskData);
  if (plan.length === 0) {
    logger.info("No materials to auto-generate for patient", { patientId });
    return;
  }

  for (const planItem of plan) {
    try {
      // Don't duplicate — skip if a material with the same topic already exists
      const existing = await prisma.microlearningMaterial.findFirst({
        where: { patientId, topic: planItem.topic },
      });
      if (existing) continue;

      const sources = await learningGuideService.getApprovedSourcesForTopic(planItem.topic);
      const contentData = await generateOneMaterial({ patient, riskData, planItem, sources });

      await prisma.microlearningMaterial.create({
        data: {
          patientId,
          title: contentData.title || planItem.title,
          topic: planItem.topic,
          preventionTrack: planItem.preventionTrack,
          targetAudience: "BOTH",
          contentData,
          isAutoRecommended: true,
          isAssigned: false,
          generatedBy: "SYSTEM_AUTO",
          triggerContext: planItem.triggerContext,
        },
      });

      logger.info("Auto-generated microlearning material", { patientId, topic: planItem.topic });
    } catch (err) {
      logger.error("Failed to auto-generate material", { patientId, topic: planItem.topic, error: err.message });
    }
  }
}

/**
 * CHW manually requests generation of a material on a specific topic.
 */
async function requestGeneration(patientId, topic) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { riskProfiles: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!patient) throw new NotFoundError("Patient not found");

  const riskData = patient.riskProfiles[0]?.riskData || null;

  const planItem = {
    topic,
    title: topic.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    preventionTrack: "GENERAL",
    triggerContext: "CHW manual request",
  };

  const sources = await learningGuideService.getApprovedSourcesForTopic(topic);
  const contentData = await generateOneMaterial({ patient, riskData, planItem, sources });

  return prisma.microlearningMaterial.create({
    data: {
      patientId,
      title: contentData.title || planItem.title,
      topic,
      preventionTrack: "GENERAL",
      targetAudience: "BOTH",
      contentData,
      isAutoRecommended: false,
      isAssigned: false,
      generatedBy: "CHW_REQUEST",
      triggerContext: planItem.triggerContext,
    },
  });
}

/**
 * Lists all microlearning materials for a patient.
 * Assigned materials come first, then auto-recommended, then others.
 */
async function listForPatient(patientId) {
  return prisma.microlearningMaterial.findMany({
    where: { patientId },
    orderBy: [
      { isAssigned: "desc" },
      { isAutoRecommended: "desc" },
      { createdAt: "desc" },
    ],
  });
}

/**
 * Gets a single material by ID.
 */
async function getOne(materialId) {
  const material = await prisma.microlearningMaterial.findUnique({
    where: { id: materialId },
    include: { patient: true },
  });
  if (!material) throw new NotFoundError("Microlearning material not found");
  return material;
}

/**
 * Toggles the isAssigned flag on a material.
 * Assigning adds it to the patient's care plan; unassigning removes it.
 */
async function toggleAssign(materialId, assign) {
  const material = await getOne(materialId);
  return prisma.microlearningMaterial.update({
    where: { id: materialId },
    data: { isAssigned: assign },
  });
}

/**
 * Generates and returns a PDF Buffer for a material.
 */
async function downloadPDF(materialId) {
  const material = await getOne(materialId);
  const pdfBuffer = await generateMaterialPDF(material, material.patient);
  return { pdfBuffer, title: material.title };
}

/**
 * Generates and returns an SVG image card string for a material.
 */
async function downloadImageCard(materialId) {
  const material = await getOne(materialId);
  const svg = generateImageCard(material, material.patient);
  return { svg, title: material.title };
}

module.exports = {
  autoGenerateForRiskProfile,
  requestGeneration,
  listForPatient,
  getOne,
  toggleAssign,
  downloadPDF,
  downloadImageCard,
};
