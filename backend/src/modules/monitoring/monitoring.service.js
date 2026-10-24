const prisma = require("../../config/prismaClient");
const { NotFoundError } = require("../../errors/AppError");
const { evaluateVitals, evaluateCheckIn } = require("./monitoring.rules");

// ── Vital signs ─────────────────────────────────────────────────────────

async function createVital(patientId, data) {
  const { alertLevel, alerts } = evaluateVitals(data);
  return prisma.vitalReading.create({
    data: { ...data, patientId, alertLevel, alerts },
  });
}

async function listVitals(patientId, limit) {
  return prisma.vitalReading.findMany({
    where: { patientId },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });
}

async function getVital(id) {
  const reading = await prisma.vitalReading.findUnique({ where: { id } });
  if (!reading) throw new NotFoundError("Vital sign reading not found");
  return reading;
}

async function deleteVital(id) {
  await prisma.vitalReading.delete({ where: { id } });
}

// ── Daily check-ins ─────────────────────────────────────────────────────

async function createCheckIn(patientId, data) {
  const { alertLevel, alerts } = evaluateCheckIn(data);
  return prisma.dailyCheckIn.create({
    data: { ...data, patientId, alertLevel, alerts },
  });
}

async function listCheckIns(patientId, limit) {
  return prisma.dailyCheckIn.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getCheckIn(id) {
  const checkIn = await prisma.dailyCheckIn.findUnique({ where: { id } });
  if (!checkIn) throw new NotFoundError("Check-in not found");
  return checkIn;
}

async function deleteCheckIn(id) {
  await prisma.dailyCheckIn.delete({ where: { id } });
}

// ── Caregiver-wide alerts (dashboard) ───────────────────────────────────

const ALERT_WINDOW_HOURS = 48;

/**
 * Most recent WATCH/URGENT vital reading or check-in per patient within the
 * last 48 hours, across all of the caregiver's patients. Newer NORMAL
 * entries do not clear an alert — a clinician should review it first.
 */
async function recentAlerts(caregiverId) {
  const since = new Date(Date.now() - ALERT_WINDOW_HOURS * 60 * 60 * 1000);
  const where = { alertLevel: { not: "NORMAL" }, patient: { caregiverId } };
  const select = { id: true, patientId: true, alertLevel: true, alerts: true };

  const [vitals, checkIns] = await Promise.all([
    prisma.vitalReading.findMany({
      where: { ...where, recordedAt: { gte: since } },
      select: { ...select, recordedAt: true, patient: { select: { fullName: true } } },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.dailyCheckIn.findMany({
      where: { ...where, createdAt: { gte: since } },
      select: { ...select, createdAt: true, patient: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const entries = [
    ...vitals.map((v) => ({ ...v, type: "vitals", at: v.recordedAt })),
    ...checkIns.map((c) => ({ ...c, type: "check-in", at: c.createdAt })),
  ].sort((a, b) => b.at - a.at);

  // Keep the most severe entry per patient (ties go to the most recent).
  const byPatient = new Map();
  for (const e of entries) {
    const current = byPatient.get(e.patientId);
    if (!current || (e.alertLevel === "URGENT" && current.alertLevel !== "URGENT")) {
      byPatient.set(e.patientId, e);
    }
  }

  return [...byPatient.values()].map((e) => ({
    patientId: e.patientId,
    patientName: e.patient.fullName,
    type: e.type,
    alertLevel: e.alertLevel,
    message: e.alerts[0]?.message || "",
    at: e.at,
  }));
}

module.exports = {
  createVital, listVitals, getVital, deleteVital,
  createCheckIn, listCheckIns, getCheckIn, deleteCheckIn,
  recentAlerts,
};
