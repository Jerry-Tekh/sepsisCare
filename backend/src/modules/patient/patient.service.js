const prisma = require("../../config/prismaClient");
const { NotFoundError, ForbiddenError } = require("../../errors/AppError");

/**
 * Loads a patient and verifies it belongs to the given caregiver.
 * Throws 404 if it doesn't exist, 403 if it belongs to someone else
 * (we use 404 in the "not found for you" sense to avoid leaking existence,
 * but distinguish at the call site if ever needed).
 */
async function assertOwnership(patientId, caregiverId) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }
  if (patient.caregiverId !== caregiverId) {
    throw new ForbiddenError("You do not have access to this patient");
  }
  return patient;
}

async function list(caregiverId) {
  return prisma.patient.findMany({
    where: { caregiverId },
    orderBy: { createdAt: "desc" },
  });
}

async function create(caregiverId, data) {
  return prisma.patient.create({
    data: { ...data, caregiverId },
  });
}

async function getOne(caregiverId, patientId) {
  return assertOwnership(patientId, caregiverId);
}

async function update(caregiverId, patientId, data) {
  await assertOwnership(patientId, caregiverId);
  return prisma.patient.update({ where: { id: patientId }, data });
}

async function remove(caregiverId, patientId) {
  await assertOwnership(patientId, caregiverId);
  await prisma.patient.delete({ where: { id: patientId } });
}

module.exports = { list, create, getOne, update, remove, assertOwnership };
