const prisma = require("../../config/prismaClient");
const { BadRequestError, NotFoundError } = require("../../errors/AppError");

async function listEvents(patientId) {
  return prisma.healthcareSeekingEvent.findMany({
    where: { patientId },
    orderBy: [{ recognizedAt: "desc" }, { createdAt: "desc" }],
  });
}

async function createEvent(patientId, recordedById, payload) {
  const recognizedAt = new Date(payload.recognizedAt);
  const arrivedAt = payload.arrivedAt ? new Date(payload.arrivedAt) : null;
  if (arrivedAt && arrivedAt < recognizedAt) {
    throw new BadRequestError("Arrival time must be at or after the warning sign was recognized.");
  }
  if (recognizedAt > new Date(Date.now() + 5 * 60_000) || arrivedAt > new Date(Date.now() + 5 * 60_000)) {
    throw new BadRequestError("Event times cannot be in the future.");
  }
  return prisma.healthcareSeekingEvent.create({
    data: {
      patientId,
      recordedById,
      recognizedAt,
      arrivedAt,
      arrivalRecordedAt: arrivedAt ? new Date() : null,
    },
  });
}

async function recordArrival(patientId, eventId, payload) {
  const event = await prisma.healthcareSeekingEvent.findFirst({ where: { id: eventId, patientId } });
  if (!event) throw new NotFoundError("Healthcare-seeking event not found");
  const arrivedAt = new Date(payload.arrivedAt);
  if (arrivedAt < event.recognizedAt) {
    throw new BadRequestError("Arrival time must be at or after the warning sign was recognized.");
  }
  if (arrivedAt > new Date(Date.now() + 5 * 60_000)) {
    throw new BadRequestError("Arrival time cannot be in the future.");
  }
  return prisma.healthcareSeekingEvent.update({
    where: { id: eventId },
    data: { arrivedAt, arrivalRecordedAt: new Date() },
  });
}

module.exports = { listEvents, createEvent, recordArrival };
